/**
 * CorpusDb — the single query layer over missal.db (sql.js), identical on
 * web and Tauri. Graph queries (nodes/edges), bilingual text retrieval with
 * non-inverted commune gap-filling, vector similarity, FTS concordance.
 */

import initSqlJs, { type Database } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { embedText, cosine, normalizeText } from '../vector/embed.ts';
import { bestClause } from '../vector/clause.ts';
import { MASS_SECTION_ORDER } from '../model/massOrdo.ts';
import type {
  GraphNode,
  SectionText,
  SimilarHit,
  ConcordanceHit,
  CrossRef,
  ConceptHit,
  GroupedHit,
  InterpretiveNucleus,
  NucleatedSimilarityGroup,
  NucleatedSimilarityHit,
  NucleatedSimilaritySet,
} from './types.ts';
import type { DayFileMeta } from '../calendar/precedence.ts';

export type {
  InterpretiveNucleus,
  NucleatedSimilarityGroup,
  NucleatedSimilarityHit,
  NucleatedSimilaritySet,
  NucleusAuthorityKind,
  NucleusSourceManifest,
} from './types.ts';

function rowToNode(r: Record<string, unknown>): GraphNode {
  let meta: Record<string, unknown> = {};
  try {
    meta = r.meta ? JSON.parse(String(r.meta)) : {};
  } catch {
    meta = {};
  }
  return {
    id: Number(r.id),
    kind: String(r.kind) as GraphNode['kind'],
    key: String(r.key),
    title: (r.title as string) ?? null,
    category: (r.category as string) ?? null,
    rankClass: (r.rank_class as string) ?? null,
    rankNum: Number(r.rank_num ?? 0),
    color: (r.color as string) ?? null,
    meta,
  };
}

export class CorpusDb {
  private db: Database;

  private constructor(db: Database) {
    this.db = db;
  }

  /** Embedding cache: node key → Int8Array, loaded lazily on first similarity query. */
  private vectors: { key: string; section: string; vec: Int8Array }[] | null = null;

  static async open(bytes: Uint8Array): Promise<CorpusDb> {
    const SQL = await initSqlJs({ locateFile: () => wasmUrl });
    return new CorpusDb(new SQL.Database(bytes));
  }

  private all(sql: string, params: unknown[] = []): Record<string, unknown>[] {
    const stmt = this.db.prepare(sql);
    try {
      stmt.bind(params as never);
      const rows: Record<string, unknown>[] = [];
      while (stmt.step()) rows.push(stmt.getAsObject() as Record<string, unknown>);
      return rows;
    } finally {
      stmt.free();
    }
  }

  getFileNode(path: string): GraphNode | null {
    const rows = this.all('SELECT * FROM nodes WHERE key = ?', [`file:${path}`]);
    return rows.length ? rowToNode(rows[0]) : null;
  }

  hasFile(path: string): boolean {
    return this.getFileNode(path) !== null;
  }

  /** Resolved 1960 kalendar entries for MM-DD (ord 0 = celebration). */
  getKalendar(mmdd: string): { file: string; title: string | null; rank: number }[] {
    return this.all('SELECT file, title, rank FROM kalendar WHERE mmdd = ? ORDER BY ord', [mmdd]).map((r) => ({
      file: String(r.file),
      title: (r.title as string) ?? null,
      rank: Number(r.rank ?? 0),
    }));
  }

  /** Transfer rows of one Tabulae/Transfer source file ("a"–"g" or "322"–"426"). */
  getTransfers(source: string): { mmdd: string; target: string }[] {
    return this.all('SELECT mmdd, target FROM kalendar_transfer WHERE source = ?', [source]).map((r) => ({
      mmdd: String(r.mmdd),
      target: String(r.target),
    }));
  }

  /** All Sancti file nodes for MM-DD (incl. v/r variants), rank DESC. */
  getSanctiForDate(month: number, day: number): GraphNode[] {
    const mmdd = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return this.all(
      "SELECT * FROM nodes WHERE kind='file' AND (key = ? OR key LIKE ?) ORDER BY rank_num DESC",
      [`file:Sancti/${mmdd}`, `file:Sancti/${mmdd}%`],
    ).map(rowToNode);
  }

  asDayMeta(n: GraphNode | null): DayFileMeta | null {
    if (!n) return null;
    return {
      key: n.key.replace(/^file:/, ''),
      title: n.title ?? (n.meta.office_name as string | null),
      rankClass: n.rankClass,
      rankNum: n.rankNum,
      color: n.color,
      festumDomini: n.meta.festum_domini === true,
    };
  }

  /** Raw section texts of one corpus file, keyed by DO section name. */
  private sectionsOf(path: string): Map<string, { latin: string | null; english: string | null }> {
    const rows = this.all(
      `SELECT tb.section, tb.latin, tb.english
       FROM text_blocks tb JOIN nodes n ON n.id = tb.node_id
       WHERE n.key LIKE ?`,
      [`section:${path}#%`],
    );
    const map = new Map<string, { latin: string | null; english: string | null }>();
    for (const r of rows) {
      map.set(String(r.section), {
        latin: (r.latin as string) ?? null,
        english: (r.english as string) ?? null,
      });
    }
    return map;
  }

  /** CROSS_REF target (commune path) of a file node, if any. */
  communeOf(path: string): string | null {
    const rows = this.all(
      `SELECT n2.key FROM edges e
       JOIN nodes n1 ON n1.id = e.src JOIN nodes n2 ON n2.id = e.dst
       WHERE e.rel = 'CROSS_REF' AND n1.key = ?`,
      [`file:${path}`],
    );
    return rows.length ? String(rows[0].key).replace(/^file:/, '') : null;
  }

  /**
   * Mass texts for a corpus file in canonical order.
   * Non-inverted commune gap-fill: sections present in the feast file always
   * win; only MISSING Mass sections come from the CROSS_REF commune.
   */
  getMassTexts(path: string): SectionText[] {
    const own = this.sectionsOf(path);
    const communePath = this.communeOf(path);
    const commune = communePath ? this.sectionsOf(communePath) : null;
    const out: SectionText[] = [];
    for (const section of MASS_SECTION_ORDER) {
      const ownText = own.get(section);
      const communeText = commune?.get(section);
      const chosen = ownText ?? communeText;
      if (!chosen || (!chosen.latin && !chosen.english)) continue;
      const fromCommune = !ownText && !!communeText;
      const sourcePath = fromCommune ? (communePath as string) : path;
      out.push({
        nodeKey: `section:${sourcePath}#${section}`,
        section,
        latin: chosen.latin,
        english: chosen.english,
        sourcePath,
        fromCommune,
      });
    }
    return out;
  }

  /** The Ordinary of the Mass (invariable), keyed by Ordo/Missae section name. */
  getOrdoTexts(): Map<string, SectionText> {
    const map = new Map<string, SectionText>();
    for (const [section, t] of this.sectionsOf('Ordo/Missae')) {
      map.set(section, {
        nodeKey: `section:Ordo/Missae#${section}`,
        section,
        latin: t.latin,
        english: t.english,
        sourcePath: 'Ordo/Missae',
        fromCommune: false,
      });
    }
    return map;
  }

  /**
   * Public ordered section access for one corpus file (meta sections
   * excluded) — the office engine's window onto propers/psalter/specials.
   */
  getFileSections(path: string): SectionText[] {
    const rows = this.all(
      `SELECT tb.section, tb.latin, tb.english
       FROM text_blocks tb JOIN nodes n ON n.id = tb.node_id
       WHERE n.key LIKE ? ORDER BY n.id`,
      [`section:${path}#%`],
    );
    const META = new Set(['Rank', 'Rule', 'Name', 'Officium', 'Missa', 'Prelude', 'Comment', 'Rank1960', 'RankNewcal']);
    return rows
      .filter((r) => !META.has(String(r.section)))
      .map((r) => ({
        nodeKey: `section:${path}#${r.section}`,
        section: String(r.section),
        latin: (r.latin as string) ?? null,
        english: (r.english as string) ?? null,
        sourcePath: path,
        fromCommune: false,
      }));
  }

  /** One named section of a corpus file (bilingual), or null. */
  getSection(path: string, section: string): SectionText | null {
    const rows = this.all(
      `SELECT tb.latin, tb.english FROM text_blocks tb JOIN nodes n ON n.id = tb.node_id WHERE n.key = ?`,
      [`section:${path}#${section}`],
    );
    if (!rows.length) return null;
    return {
      nodeKey: `section:${path}#${section}`,
      section,
      latin: (rows[0].latin as string) ?? null,
      english: (rows[0].english as string) ?? null,
      sourcePath: path,
      fromCommune: false,
    };
  }

  /** Psalm text by number token ("109", "118i"…), bilingual. */
  getPsalm(num: string): SectionText | null {
    return this.getSection(`Psalterium/Psalmorum/Psalm${num}`, 'Psalmus');
  }

  /** Bilingual text of ANY node key (section: or verse:) — the aligned pair. */
  textOf(nodeKey: string): { latin: string | null; english: string | null } | null {
    const rows = this.all(
      `SELECT tb.latin, tb.english FROM text_blocks tb JOIN nodes n ON n.id = tb.node_id WHERE n.key = ?`,
      [nodeKey],
    );
    if (!rows.length) return null;
    return { latin: (rows[0].latin as string) ?? null, english: (rows[0].english as string) ?? null };
  }

  // ── Bible plane (§7.6) ──────────────────────────────────────────────

  /** All 73 Bible books in canon order (meta.ord from ingest Pass 4). */
  getBooks(): { key: string; title: string; chapters: number; testament: 'OT' | 'NT'; hasLatin: boolean }[] {
    return this.all(`SELECT key, title, meta FROM nodes WHERE kind = 'book'`)
      .map((r) => {
        let meta: Record<string, unknown> = {};
        try {
          meta = r.meta ? JSON.parse(String(r.meta)) : {};
        } catch {
          meta = {};
        }
        return {
          key: String(r.key).replace(/^book:/, ''),
          title: (r.title as string) ?? '',
          chapters: Number(meta.chapters ?? 0),
          testament: (meta.testament as 'OT' | 'NT') ?? 'OT',
          hasLatin: meta.vulSource !== false,
          ord: Number(meta.ord ?? 0),
        };
      })
      .sort((a, b) => a.ord - b.ord)
      .map(({ ord: _ord, ...book }) => book);
  }

  /** One chapter's verses in order, bilingual (Latin NULL where vul.tsv lacks the book). */
  getChapter(book: string, chapter: number): SectionText[] {
    return this.all(
      `SELECT n.key, tb.section, tb.latin, tb.english
       FROM text_blocks tb JOIN nodes n ON n.id = tb.node_id
       WHERE n.key LIKE ? ORDER BY n.id`,
      [`verse:${book}/${chapter}/%`],
    ).map((r) => ({
      nodeKey: String(r.key),
      section: String(r.section),
      latin: (r.latin as string) ?? null,
      english: (r.english as string) ?? null,
      sourcePath: `Bible/${book}`,
      fromCommune: false,
    }));
  }

  /** Verse range by canonical ref "Gen/1/1" or "Gen/1/1-3". */
  getVerseRange(ref: string): SectionText[] {
    const m = ref.match(/^([^/]+)\/(\d+)\/(\d+)(?:-(\d+))?$/);
    if (!m) return [];
    const [, book, ch, from, to] = m;
    const out: SectionText[] = [];
    for (let v = Number(from); v <= Number(to ?? from); v++) {
      const rows = this.all(
        `SELECT tb.section, tb.latin, tb.english FROM text_blocks tb JOIN nodes n ON n.id = tb.node_id WHERE n.key = ?`,
        [`verse:${book}/${ch}/${v}`],
      );
      if (!rows.length) continue;
      out.push({
        nodeKey: `verse:${book}/${ch}/${v}`,
        section: String(rows[0].section),
        latin: (rows[0].latin as string) ?? null,
        english: (rows[0].english as string) ?? null,
        sourcePath: `Bible/${book}`,
        fromCommune: false,
      });
    }
    return out;
  }

  /** CITES edges touching a node (section→verses, or verse←sections), meta.citation as directive. */
  citationsOf(nodeKey: string): CrossRef[] {
    return this.all(
      `SELECT n1.key fromKey, n2.key toKey, e.rel, e.meta, n2.title toTitle
       FROM edges e JOIN nodes n1 ON n1.id = e.src JOIN nodes n2 ON n2.id = e.dst
       WHERE e.rel = 'CITES' AND (n1.key = ? OR n2.key = ?)`,
      [nodeKey, nodeKey],
    ).map((r) => {
      let directive: string | null = null;
      try {
        directive = r.meta ? (JSON.parse(String(r.meta)).citation ?? null) : null;
      } catch {
        directive = null;
      }
      return {
        fromKey: String(r.fromKey),
        toKey: String(r.toKey),
        rel: String(r.rel),
        directive,
        toTitle: (r.toTitle as string) ?? null,
      };
    });
  }

  /** Liturgical sections citing any verse of a chapter — BibleView's "appears in the liturgy" panel. */
  liturgyCitingChapter(
    book: string,
    chapter: number,
  ): { sectionKey: string; sectionTitle: string | null; sourcePath: string; verseKey: string; quality: string }[] {
    return this.all(
      `SELECT n1.key sectionKey, n1.title sectionTitle, n2.key verseKey, e.meta
       FROM edges e JOIN nodes n1 ON n1.id = e.src JOIN nodes n2 ON n2.id = e.dst
       WHERE e.rel = 'CITES' AND n2.key LIKE ? ORDER BY n2.id`,
      [`verse:${book}/${chapter}/%`],
    ).map((r) => {
      let quality = 'adapted';
      try {
        quality = r.meta ? (JSON.parse(String(r.meta)).quality ?? 'adapted') : 'adapted';
      } catch {
        quality = 'adapted';
      }
      const key = String(r.sectionKey);
      return {
        sectionKey: key,
        sectionTitle: (r.sectionTitle as string) ?? null,
        sourcePath: key.replace(/^section:/, '').replace(/#.*$/, ''),
        verseKey: String(r.verseKey),
        quality,
      };
    });
  }

  // ── Interpretive layer (§7.7) ──────────────────────────────────────

  /**
   * Vendored commentary on a verse (or a whole chapter when verse is omitted):
   * commentary nodes reached over COMMENTS_ON edges into the verse range,
   * ordered by source id then verseStart. english = the commentary text,
   * latin = NULL (PD translations are English — §7.7).
   */
  commentaryFor(book: string, ch: number, verse?: number): SectionText[] {
    const rows =
      verse == null
        ? this.all(
            `SELECT DISTINCT c.key, c.title, c.meta, tb.section, tb.latin, tb.english
             FROM edges e
             JOIN nodes c ON c.id = e.src
             JOIN nodes v ON v.id = e.dst
             JOIN text_blocks tb ON tb.node_id = c.id
             WHERE e.rel = 'COMMENTS_ON' AND c.kind = 'commentary' AND v.key LIKE ?`,
            [`verse:${book}/${ch}/%`],
          )
        : this.all(
            `SELECT DISTINCT c.key, c.title, c.meta, tb.section, tb.latin, tb.english
             FROM edges e
             JOIN nodes c ON c.id = e.src
             JOIN nodes v ON v.id = e.dst
             JOIN text_blocks tb ON tb.node_id = c.id
             WHERE e.rel = 'COMMENTS_ON' AND c.kind = 'commentary' AND v.key = ?`,
            [`verse:${book}/${ch}/${verse}`],
          );
    return rows
      .map((r) => {
        const key = String(r.key);
        // commentary:<source>/<Book>/<ch>/<verseStart>
        const m = key.match(/^commentary:([^/]+)\/[^/]+\/\d+\/(\d+)$/);
        return {
          hit: {
            nodeKey: key,
            section: String(r.section ?? ''),
            latin: null,
            english: (r.english as string) ?? null,
            sourcePath: `Commentary/${m?.[1] ?? ''}`,
            fromCommune: false,
          } as SectionText,
          source: m?.[1] ?? '',
          verseStart: Number(m?.[2] ?? 0),
        };
      })
      .sort((a, b) => a.source.localeCompare(b.source) || a.verseStart - b.verseStart)
      .map((x) => x.hit);
  }

  /**
   * Short, query-matching clauses from authoritative interpretive sources.
   * Haydock is the active v0.5 provider; the source filter keeps the method
   * ready for independently delivered catechetical and magisterial modules.
   */
  interpretiveNucleiForText(
    text: string,
    opts: { k?: number; sources?: string[] } = {},
  ): InterpretiveNucleus[] {
    const k = Math.max(0, opts.k ?? 5);
    const sources = new Set(opts.sources ?? ['haydock']);
    if (!text.trim() || k === 0 || sources.size === 0) return [];

    const queryVec = embedText(text);
    const coarse = this.all(
      `SELECT n.id, n.key, n.title, tb.english, e.vec
       FROM nodes n
       JOIN text_blocks tb ON tb.node_id = n.id
       JOIN embeddings e ON e.node_id = n.id
       WHERE n.kind = 'commentary' AND tb.english IS NOT NULL`,
    )
      .map((row) => {
        const key = String(row.key);
        const source = key.match(/^commentary:([^/]+)\//)?.[1] ?? '';
        if (!sources.has(source)) return null;
        const raw = row.vec as Uint8Array;
        const vec = new Int8Array(raw.buffer, raw.byteOffset, raw.byteLength);
        return {
          id: Number(row.id),
          key,
          title: (row.title as string) ?? key,
          english: String(row.english ?? ''),
          source,
          score: cosine(queryVec, vec),
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key))
      .slice(0, Math.max(k * 4, k));

    return coarse
      .flatMap((row): InterpretiveNucleus[] => {
        const clause = bestClause(row.english, text);
        if (!clause || clause.text.length >= row.english.length) return [];
        const anchors = this.all(
          `SELECT DISTINCT v.key
           FROM edges e JOIN nodes v ON v.id = e.dst
           WHERE e.rel = 'COMMENTS_ON' AND e.src = ?
           ORDER BY v.key`,
          [row.id],
        ).map((anchor) => String(anchor.key));
        const concepts = this.all(
          `SELECT DISTINCT c.key, c.title
           FROM edges comments
           JOIN edges instances ON instances.src = comments.dst AND instances.rel = 'INSTANCE_OF'
           JOIN nodes c ON c.id = instances.dst
           WHERE comments.rel = 'COMMENTS_ON' AND comments.src = ? AND c.kind = 'concept'
           ORDER BY c.key`,
          [row.id],
        ).map((concept) => ({
          conceptId: String(concept.key).replace(/^concept:/, ''),
          label: (concept.title as string) ?? String(concept.key).replace(/^concept:/, ''),
        }));
        return [{
          key: row.key,
          title: row.title,
          clause: clause.text,
          queryScore: clause.score,
          anchors,
          concepts,
          source: row.source,
          authorityKind: 'scriptural-commentary',
        }];
      })
      .sort((a, b) => b.queryScore - a.queryScore || a.key.localeCompare(b.key))
      .slice(0, k);
  }

  /**
   * Losslessly organise the ordinary vector horizon around interpretive
   * nuclei. Representatives are the high-signal front; every other candidate
   * remains available in the ordered tail for association and inspiration.
   */
  nucleatedSimilarToText(
    text: string,
    opts: { candidateK?: number; nucleusK?: number; excludeKey?: string } = {},
  ): NucleatedSimilaritySet {
    const candidateK = Math.max(0, opts.candidateK ?? 64);
    const nucleusK = Math.max(0, opts.nucleusK ?? 5);
    const candidates = this.similarToText(text, candidateK, opts.excludeKey);
    const nuclei = this.interpretiveNucleiForText(text, { k: nucleusK });

    type DraftGroup = {
      key: string;
      nucleus: InterpretiveNucleus | null;
      label: string;
      hits: NucleatedSimilarityHit[];
    };
    const drafts = new Map<string, DraftGroup>();

    for (const hit of candidates) {
      const full = hit.english ?? hit.latin ?? '';
      const clause = bestClause(full, text)?.text ?? full;
      let nucleus: InterpretiveNucleus | null = null;
      let nucleusKey: string | null = null;
      let nucleusAffinity = 0;
      let groupKey = 'related';
      let label = 'Related passages';

      if (nuclei.length > 0) {
        const clauseVec = embedText(clause);
        const ranked = nuclei
          .map((candidate) => ({
            nucleus: candidate,
            affinity: cosine(clauseVec, embedText(candidate.clause)),
          }))
          .sort((a, b) => b.affinity - a.affinity || a.nucleus.key.localeCompare(b.nucleus.key));
        nucleus = ranked[0].nucleus;
        nucleusKey = nucleus.key;
        nucleusAffinity = ranked[0].affinity;
        groupKey = nucleus.key;
        label = nucleus.title;
      } else {
        const primary = this.conceptsForSectionKey(hit.key)
          .sort((a, b) => a.conceptId.localeCompare(b.conceptId))[0];
        if (primary) {
          nucleusKey = `concept:${primary.conceptId}`;
          groupKey = nucleusKey;
          label = primary.label;
        }
      }

      const atomic: NucleatedSimilarityHit = {
        hit,
        clause,
        nucleusKey,
        nucleusAffinity,
        contextScore: 0.7 * hit.score + 0.3 * nucleusAffinity,
      };
      const draft = drafts.get(groupKey) ?? { key: groupKey, nucleus, label, hits: [] };
      draft.hits.push(atomic);
      drafts.set(groupKey, draft);
    }

    const ordered = [...drafts.values()]
      .map((group) => ({
        ...group,
        hits: group.hits.sort(
          (a, b) => b.contextScore - a.contextScore || a.hit.key.localeCompare(b.hit.key),
        ),
      }))
      .sort(
        (a, b) =>
          (b.hits[0]?.contextScore ?? -Infinity) - (a.hits[0]?.contextScore ?? -Infinity) ||
          a.key.localeCompare(b.key),
      );
    const selected = ordered.slice(0, 5);
    const representativeKeys = new Set<string>();
    const groups: NucleatedSimilarityGroup[] = selected.map((group) => {
      const representatives = group.hits.slice(0, 3);
      representatives.forEach((hit) => representativeKeys.add(hit.hit.key));
      return { nucleus: group.nucleus, label: group.label, representatives };
    });
    const tail = ordered
      .flatMap((group) => group.hits)
      .filter((hit) => !representativeKeys.has(hit.hit.key))
      .sort((a, b) => b.contextScore - a.contextScore || a.hit.key.localeCompare(b.hit.key));

    return { candidateCount: candidates.length, groups, tail };
  }

  /** Concepts counted by INSTANCE_OF edges landing on verse: nodes (imagery layer). */
  conceptVerseCounts(): { conceptId: string; label: string; count: number }[] {
    return this.all(
      `SELECT c.key, c.title, COUNT(*) cnt
       FROM edges e
       JOIN nodes c ON c.id = e.dst
       JOIN nodes v ON v.id = e.src
       WHERE e.rel = 'INSTANCE_OF' AND c.kind = 'concept' AND v.kind = 'verse'
       GROUP BY c.id ORDER BY cnt DESC`,
    ).map((r) => ({
      conceptId: String(r.key).replace(/^concept:/, ''),
      label: (r.title as string) ?? String(r.key),
      count: Number(r.cnt ?? 0),
    }));
  }

  /** CITES edges per chapter of a book — the liturgical heat-map of a book. */
  chapterCiteCounts(book: string): Map<number, number> {
    const rows = this.all(
      `SELECT v.key FROM edges e JOIN nodes v ON v.id = e.dst
       WHERE e.rel = 'CITES' AND v.key LIKE ?`,
      [`verse:${book}/%`],
    );
    const out = new Map<number, number>();
    for (const r of rows) {
      const m = String(r.key).match(/^verse:[^/]+\/(\d+)\//);
      if (!m) continue;
      const ch = Number(m[1]);
      out.set(ch, (out.get(ch) ?? 0) + 1);
    }
    return out;
  }

  /** Verse refs for a concept (imagery layer) — sorted by key. */
  versesByConcept(conceptId: string): { book: string; chapter: number; verse: number }[] {
    const rows = this.all(
      `SELECT v.key FROM edges e
       JOIN nodes v ON v.id = e.src
       JOIN nodes c ON c.id = e.dst
       WHERE e.rel = ? AND c.kind = ? AND c.key = ?
       ORDER BY v.key`,
      ['INSTANCE_OF', 'concept', `concept:${conceptId}`],
    );
    const out: { book: string; chapter: number; verse: number }[] = [];
    for (const r of rows) {
      const key = String(r.key);
      const m = key.match(/^verse:([^/]+)\/(\d+)\/(\d+)$/);
      if (!m) continue;
      out.push({ book: m[1], chapter: Number(m[2]), verse: Number(m[3]) });
    }
    return out;
  }

  /** Verbatim Ordinarium script for an hour file (Matutinum, Laudes, Minor…). */
  getSkeleton(hourFile: string): string[] {
    return this.all('SELECT line FROM office_skeleton WHERE hour_file = ? ORDER BY ord', [hourFile]).map((r) =>
      String(r.line ?? ''),
    );
  }

  /** Psalter schema slots for a day/hour (office_psalm_schema). */
  getPsalmSchema(
    dayKey: string,
    hour: string,
  ): { nocturn: number | null; slot: number; antiphonLa: string | null; antiphonEn: string | null; ref: string; festal: boolean }[] {
    return this.all(
      'SELECT nocturn, slot_ord, antiphon_la, antiphon_en, psalm_ref, festal_bracket FROM office_psalm_schema WHERE day_key = ? AND hour = ? ORDER BY slot_ord',
      [dayKey, hour],
    ).map((r) => ({
      nocturn: r.nocturn == null ? null : Number(r.nocturn),
      slot: Number(r.slot_ord),
      antiphonLa: (r.antiphon_la as string) ?? null,
      antiphonEn: (r.antiphon_en as string) ?? null,
      ref: String(r.psalm_ref),
      festal: Number(r.festal_bracket) === 1,
    }));
  }

  /** Nocturn versicles for a day (office_nocturn_versicle). */
  getNocturnVersicles(dayKey: string): { nocturn: number; la: string; en: string | null }[] {
    return this.all(
      'SELECT nocturn, versicle_la, response_la, versicle_en, response_en FROM office_nocturn_versicle WHERE day_key = ? ORDER BY nocturn',
      [dayKey],
    ).map((r) => ({
      nocturn: Number(r.nocturn),
      la: `V. ${r.versicle_la ?? ''}\nR. ${r.response_la ?? ''}`,
      en: r.versicle_en ? `V. ${r.versicle_en}\nR. ${r.response_en ?? ''}` : null,
    }));
  }

  /** Graph edges out of / into a file node. */
  crossRefs(path: string): CrossRef[] {
    return this.all(
      `SELECT n1.key fromKey, n2.key toKey, e.rel, e.meta, n2.title toTitle
       FROM edges e JOIN nodes n1 ON n1.id = e.src JOIN nodes n2 ON n2.id = e.dst
       WHERE e.rel = 'CROSS_REF' AND (n1.key = ? OR n2.key = ?)`,
      [`file:${path}`, `file:${path}`],
    ).map((r) => {
      let directive: string | null = null;
      try {
        directive = r.meta ? (JSON.parse(String(r.meta)).directive ?? null) : null;
      } catch {
        directive = null;
      }
      return {
        fromKey: String(r.fromKey),
        toKey: String(r.toKey),
        rel: String(r.rel),
        directive,
        toTitle: (r.toTitle as string) ?? null,
      };
    });
  }

  private loadVectors(): { key: string; section: string; vec: Int8Array }[] {
    if (this.vectors) return this.vectors;
    const rows = this.all(
      `SELECT n.key, n.title section, e.vec FROM embeddings e JOIN nodes n ON n.id = e.node_id`,
    );
    this.vectors = rows.map((r) => {
      const raw = r.vec as Uint8Array;
      return {
        key: String(r.key),
        section: String(r.section ?? ''),
        vec: new Int8Array(raw.buffer, raw.byteOffset, raw.byteLength),
      };
    });
    return this.vectors;
  }

  /** Vector-similar passages for free text (e.g. the user's selection). */
  similarToText(text: string, k = 8, excludeKey?: string): SimilarHit[] {
    const q = embedText(text);
    const scored = this.loadVectors()
      .filter((v) => v.key !== excludeKey)
      .map((v) => ({ key: v.key, section: v.section, score: cosine(q, v.vec) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
    return scored.map((s) => {
      const tb = this.all(
        `SELECT tb.latin, tb.english, n.title FROM text_blocks tb JOIN nodes n ON n.id = tb.node_id WHERE n.key = ?`,
        [s.key],
      )[0];
      return {
        key: s.key,
        section: s.section,
        title: (tb?.title as string) ?? null,
        score: s.score,
        latin: (tb?.latin as string) ?? null,
        english: (tb?.english as string) ?? null,
      };
    });
  }

  /** FTS5 concordance. Malformed input returns [] (guard kept from HelloWord). */
  concordance(term: string, k = 20): ConcordanceHit[] {
    const norm = normalizeText(term);
    const safe = norm
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => `"${w}"`)
      .join(' ');
    if (!safe) return [];
    try {
      const ftsHits = this.all(
        `SELECT key, section, snippet(search, 2, '«', '»', ' … ', 12) snippet
         FROM search WHERE search MATCH ? ORDER BY rank LIMIT ?`,
        [safe, k],
      );
      
      return ftsHits.map((r) => {
        const key = String(r.key);
        const tb = this.all(
          `SELECT tb.latin, tb.english FROM text_blocks tb JOIN nodes n ON n.id = tb.node_id WHERE n.key = ?`,
          [key],
        )[0];
        return {
          key,
          section: String(r.section),
          snippet: String(r.snippet),
          latin: (tb?.latin as string) ?? null,
          english: (tb?.english as string) ?? null,
        };
      });
    } catch {
      return [];
    }
  }

  // ── Concept-graph query API ────────────────────────────────────────

  /** Find concepts whose centroid is closest to the query text. */
  conceptsForText(text: string, k = 5): ConceptHit[] {
    const q = embedText(text);
    const rows = this.all(
      `SELECT n.id, n.key, n.title, n.meta FROM nodes n WHERE n.kind = 'concept'`,
    );
    const scored: ConceptHit[] = [];
    for (const r of rows) {
      const embRow = this.all('SELECT vec FROM embeddings WHERE node_id = ?', [Number(r.id)]);
      if (embRow.length === 0) continue;
      const raw = embRow[0].vec as Uint8Array;
      const vec = new Int8Array(raw.buffer, raw.byteOffset, raw.byteLength);
      const score = cosine(q, vec);
      let description = '';
      try {
        const meta = r.meta ? JSON.parse(String(r.meta)) : {};
        description = (meta.description as string) ?? '';
      } catch {
        description = '';
      }
      const conceptId = String(r.key).replace(/^concept:/, '');
      const sectionCount = this.all(
        `SELECT COUNT(*) c FROM edges WHERE rel = 'INSTANCE_OF' AND dst = ?`,
        [Number(r.id)],
      )[0];
      scored.push({
        conceptId,
        label: (r.title as string) ?? conceptId,
        description,
        score,
        sectionCount: Number(sectionCount?.c ?? 0),
      });
    }
    return scored.sort((a, b) => b.score - a.score).slice(0, k);
  }

  /** All sections tagged as instances of a concept. */
  sectionsByConcept(conceptId: string): SimilarHit[] {
    const conceptRows = this.all(
      `SELECT id FROM nodes WHERE kind = 'concept' AND key = ?`,
      [`concept:${conceptId}`],
    );
    if (conceptRows.length === 0) return [];
    const cid = Number(conceptRows[0].id);
    const sectionRows = this.all(
      `SELECT n.id, n.key, n.title, e.weight
       FROM edges e JOIN nodes n ON n.id = e.src
       WHERE e.rel = 'INSTANCE_OF' AND e.dst = ?`,
      [cid],
    );
    return sectionRows.map((r) => {
      const tb = this.all(
        `SELECT tb.latin, tb.english FROM text_blocks tb WHERE tb.node_id = ?`,
        [Number(r.id)],
      )[0];
      return {
        key: String(r.key),
        section: (r.title as string) ?? '',
        title: (r.title as string) ?? null,
        score: Number(r.weight ?? 0),
        latin: (tb?.latin as string) ?? null,
        english: (tb?.english as string) ?? null,
      };
    });
  }

  /** Look up concept memberships for a section node key. */
  private conceptsForSectionKey(key: string): { conceptId: string; label: string; description: string | null }[] {
    const rows = this.all(
      `SELECT n2.key conceptKey, n2.title label, n2.meta
       FROM edges e
       JOIN nodes n1 ON n1.id = e.src
       JOIN nodes n2 ON n2.id = e.dst
       WHERE e.rel = 'INSTANCE_OF' AND n1.key = ?`,
      [key],
    );
    return rows.map((r) => {
      let description: string | null = null;
      try {
        const meta = r.meta ? JSON.parse(String(r.meta)) : {};
        description = (meta.description as string) ?? null;
      } catch {
        description = null;
      }
      return {
        conceptId: String(r.conceptKey).replace(/^concept:/, ''),
        label: (r.label as string) ?? String(r.conceptKey),
        description,
      };
    });
  }

  /** Concordance hits grouped by concept. */
  groupedConcordance(term: string, k = 30): GroupedHit<ConcordanceHit>[] {
    const hits = this.concordance(term, k);
    if (hits.length === 0) return [];
    const groups = new Map<string, { conceptId: string | null; label: string; description: string | null; hits: ConcordanceHit[] }>();
    for (const hit of hits) {
      const concepts = this.conceptsForSectionKey(hit.key);
      if (concepts.length === 0) {
        const gKey = '__other__';
        if (!groups.has(gKey)) {
          groups.set(gKey, { conceptId: null, label: 'Other occurrences', description: null, hits: [] });
        }
        groups.get(gKey)!.hits.push(hit);
      } else {
        for (const c of concepts) {
          const gKey = c.conceptId;
          if (!groups.has(gKey)) {
            groups.set(gKey, { conceptId: c.conceptId, label: c.label, description: c.description, hits: [] });
          }
          groups.get(gKey)!.hits.push(hit);
        }
      }
    }
    return [...groups.values()]
      .map((g) => ({
        conceptId: g.conceptId,
        label: g.label,
        description: g.description,
        count: g.hits.length,
        representative: g.hits[0],
        hits: g.hits,
      }))
      .sort((a, b) => b.count - a.count);
  }

  /** Vector-similar hits grouped by concept. */
  groupedSimilarToText(text: string, k = 20, excludeKey?: string): GroupedHit<SimilarHit>[] {
    const hits = this.similarToText(text, k, excludeKey);
    if (hits.length === 0) return [];
    const groups = new Map<string, { conceptId: string | null; label: string; description: string | null; hits: SimilarHit[] }>();
    for (const hit of hits) {
      const concepts = this.conceptsForSectionKey(hit.key);
      if (concepts.length === 0) {
        const gKey = '__other__';
        if (!groups.has(gKey)) {
          groups.set(gKey, { conceptId: null, label: 'Other passages', description: null, hits: [] });
        }
        groups.get(gKey)!.hits.push(hit);
      } else {
        for (const c of concepts) {
          const gKey = c.conceptId;
          if (!groups.has(gKey)) {
            groups.set(gKey, { conceptId: c.conceptId, label: c.label, description: c.description, hits: [] });
          }
          groups.get(gKey)!.hits.push(hit);
        }
      }
    }
    return [...groups.values()]
      .map((g) => ({
        conceptId: g.conceptId,
        label: g.label,
        description: g.description,
        count: g.hits.length,
        representative: g.hits[0],
        hits: g.hits,
      }))
      .sort((a, b) => b.count - a.count);
  }
}
