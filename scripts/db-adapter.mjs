/**
 * db-adapter — a node:sqlite implementation of the CorpusDb query surface,
 * for Node-side harnesses and tests (the app itself uses sql.js; the
 * collinear rule applies to the app runtime, not to build/test tooling).
 */

import { DatabaseSync } from 'node:sqlite';

const META = new Set(['Rank', 'Rule', 'Name', 'Officium', 'Missa', 'Prelude', 'Comment', 'Rank1960', 'RankNewcal']);

export function openAdapter(dbPath = 'assets/missal.db') {
  const raw = new DatabaseSync(dbPath, { readOnly: true });

  const rowToNode = (r) => {
    let meta = {};
    try { meta = r.meta ? JSON.parse(String(r.meta)) : {}; } catch { meta = {}; }
    return {
      id: Number(r.id), kind: String(r.kind), key: String(r.key),
      title: r.title ?? null, category: r.category ?? null,
      rankClass: r.rank_class ?? null, rankNum: Number(r.rank_num ?? 0),
      color: r.color ?? null, meta,
    };
  };

  return {
    getFileNode(path) {
      const r = raw.prepare('SELECT * FROM nodes WHERE key = ?').get(`file:${path}`);
      return r ? rowToNode(r) : null;
    },
    hasFile(path) {
      return this.getFileNode(path) !== null;
    },
    getKalendar(mmdd) {
      return raw.prepare('SELECT file, title, rank FROM kalendar WHERE mmdd = ? ORDER BY ord').all(mmdd)
        .map((r) => ({ file: String(r.file), title: r.title ?? null, rank: Number(r.rank ?? 0) }));
    },
    getTransfers(source) {
      return raw.prepare('SELECT mmdd, target FROM kalendar_transfer WHERE source = ?').all(source)
        .map((r) => ({ mmdd: String(r.mmdd), target: String(r.target) }));
    },
    asDayMeta(n) {
      if (!n) return null;
      return {
        key: n.key.replace(/^file:/, ''), title: n.title ?? n.meta.office_name ?? null,
        rankClass: n.rankClass, rankNum: n.rankNum, color: n.color,
        festumDomini: n.meta.festum_domini === true,
      };
    },
    communeOf(path) {
      const r = raw.prepare(
        `SELECT n2.key k FROM edges e JOIN nodes n1 ON n1.id = e.src JOIN nodes n2 ON n2.id = e.dst
         WHERE e.rel = 'CROSS_REF' AND n1.key = ?`,
      ).get(`file:${path}`);
      return r ? String(r.k).replace(/^file:/, '') : null;
    },
    getSection(path, section) {
      const r = raw.prepare(
        'SELECT tb.latin, tb.english FROM text_blocks tb JOIN nodes n ON n.id = tb.node_id WHERE n.key = ?',
      ).get(`section:${path}#${section}`);
      if (!r) return null;
      return {
        nodeKey: `section:${path}#${section}`, section,
        latin: r.latin ?? null, english: r.english ?? null,
        sourcePath: path, fromCommune: false,
      };
    },
    getFileSections(path) {
      return raw.prepare(
        `SELECT tb.section s, tb.latin, tb.english FROM text_blocks tb JOIN nodes n ON n.id = tb.node_id
         WHERE n.key LIKE ? ORDER BY n.id`,
      ).all(`section:${path}#%`)
        .filter((r) => !META.has(String(r.s)))
        .map((r) => ({
          nodeKey: `section:${path}#${r.s}`, section: String(r.s),
          latin: r.latin ?? null, english: r.english ?? null,
          sourcePath: path, fromCommune: false,
        }));
    },
    getPsalm(num) {
      return this.getSection(`Psalterium/Psalmorum/Psalm${num}`, 'Psalmus');
    },
    textOf(nodeKey) {
      const r = raw.prepare(
        `SELECT tb.latin, tb.english FROM text_blocks tb JOIN nodes n ON n.id = tb.node_id WHERE n.key = ?`,
      ).get(nodeKey);
      return r ? { latin: r.latin ?? null, english: r.english ?? null } : null;
    },
    // ── Bible plane (§7.6) — mirrors CorpusDb ─────────────────────
    getBooks() {
      return raw.prepare(`SELECT key, title, meta FROM nodes WHERE kind = 'book'`).all()
        .map((r) => {
          let meta = {};
          try { meta = r.meta ? JSON.parse(String(r.meta)) : {}; } catch { meta = {}; }
          return {
            key: String(r.key).replace(/^book:/, ''), title: r.title ?? '',
            chapters: Number(meta.chapters ?? 0), testament: meta.testament ?? 'OT',
            hasLatin: meta.vulSource !== false, ord: Number(meta.ord ?? 0),
          };
        })
        .sort((a, b) => a.ord - b.ord)
        .map(({ ord: _ord, ...book }) => book);
    },
    getChapter(book, chapter) {
      return raw.prepare(
        `SELECT n.key, tb.section, tb.latin, tb.english
         FROM text_blocks tb JOIN nodes n ON n.id = tb.node_id
         WHERE n.key LIKE ? ORDER BY n.id`,
      ).all(`verse:${book}/${chapter}/%`).map((r) => ({
        nodeKey: String(r.key), section: String(r.section),
        latin: r.latin ?? null, english: r.english ?? null,
        sourcePath: `Bible/${book}`, fromCommune: false,
      }));
    },
    getVerseRange(ref) {
      const m = ref.match(/^([^/]+)\/(\d+)\/(\d+)(?:-(\d+))?$/);
      if (!m) return [];
      const [, book, ch, from, to] = m;
      const out = [];
      for (let v = Number(from); v <= Number(to ?? from); v++) {
        const r = raw.prepare(
          `SELECT tb.section, tb.latin, tb.english FROM text_blocks tb JOIN nodes n ON n.id = tb.node_id WHERE n.key = ?`,
        ).get(`verse:${book}/${ch}/${v}`);
        if (!r) continue;
        out.push({
          nodeKey: `verse:${book}/${ch}/${v}`, section: String(r.section),
          latin: r.latin ?? null, english: r.english ?? null,
          sourcePath: `Bible/${book}`, fromCommune: false,
        });
      }
      return out;
    },
    citationsOf(nodeKey) {
      return raw.prepare(
        `SELECT n1.key fromKey, n2.key toKey, e.rel, e.meta, n2.title toTitle
         FROM edges e JOIN nodes n1 ON n1.id = e.src JOIN nodes n2 ON n2.id = e.dst
         WHERE e.rel = 'CITES' AND (n1.key = ? OR n2.key = ?)`,
      ).all(nodeKey, nodeKey).map((r) => {
        let directive = null;
        try { directive = r.meta ? (JSON.parse(String(r.meta)).citation ?? null) : null; } catch { directive = null; }
        return { fromKey: String(r.fromKey), toKey: String(r.toKey), rel: String(r.rel), directive, toTitle: r.toTitle ?? null };
      });
    },
    liturgyCitingChapter(book, chapter) {
      return raw.prepare(
        `SELECT n1.key sectionKey, n1.title sectionTitle, n2.key verseKey, e.meta
         FROM edges e JOIN nodes n1 ON n1.id = e.src JOIN nodes n2 ON n2.id = e.dst
         WHERE e.rel = 'CITES' AND n2.key LIKE ? ORDER BY n2.id`,
      ).all(`verse:${book}/${chapter}/%`).map((r) => {
        let quality = 'adapted';
        try { quality = r.meta ? (JSON.parse(String(r.meta)).quality ?? 'adapted') : 'adapted'; } catch { quality = 'adapted'; }
        const key = String(r.sectionKey);
        return {
          sectionKey: key, sectionTitle: r.sectionTitle ?? null,
          sourcePath: key.replace(/^section:/, '').replace(/#.*$/, ''),
          verseKey: String(r.verseKey), quality,
        };
      });
    },
    // ── Interpretive layer (§7.7) — mirrors CorpusDb ────────────────
    commentaryFor(book, ch, verse) {
      const rows = verse == null
        ? raw.prepare(
            `SELECT DISTINCT c.key, c.title, c.meta, tb.section, tb.latin, tb.english
             FROM edges e
             JOIN nodes c ON c.id = e.src
             JOIN nodes v ON v.id = e.dst
             JOIN text_blocks tb ON tb.node_id = c.id
             WHERE e.rel = 'COMMENTS_ON' AND c.kind = 'commentary' AND v.key LIKE ?`,
          ).all(`verse:${book}/${ch}/%`)
        : raw.prepare(
            `SELECT DISTINCT c.key, c.title, c.meta, tb.section, tb.latin, tb.english
             FROM edges e
             JOIN nodes c ON c.id = e.src
             JOIN nodes v ON v.id = e.dst
             JOIN text_blocks tb ON tb.node_id = c.id
             WHERE e.rel = 'COMMENTS_ON' AND c.kind = 'commentary' AND v.key = ?`,
          ).all(`verse:${book}/${ch}/${verse}`);
      return rows
        .map((r) => {
          const key = String(r.key);
          const m = key.match(/^commentary:([^/]+)\/[^/]+\/\d+\/(\d+)$/);
          return {
            hit: {
              nodeKey: key, section: String(r.section ?? ''),
              latin: null, english: r.english ?? null,
              sourcePath: `Commentary/${m?.[1] ?? ''}`, fromCommune: false,
            },
            source: m?.[1] ?? '',
            verseStart: Number(m?.[2] ?? 0),
          };
        })
        .sort((a, b) => a.source.localeCompare(b.source) || a.verseStart - b.verseStart)
        .map((x) => x.hit);
    },
    conceptVerseCounts() {
      return raw.prepare(
        `SELECT c.key, c.title, COUNT(*) cnt
         FROM edges e
         JOIN nodes c ON c.id = e.dst
         JOIN nodes v ON v.id = e.src
         WHERE e.rel = 'INSTANCE_OF' AND c.kind = 'concept' AND v.kind = 'verse'
         GROUP BY c.id ORDER BY cnt DESC`,
      ).all().map((r) => ({
        conceptId: String(r.key).replace(/^concept:/, ''),
        label: r.title ?? String(r.key),
        count: Number(r.cnt ?? 0),
      }));
    },
    chapterCiteCounts(book) {
      const rows = raw.prepare(
        `SELECT v.key FROM edges e JOIN nodes v ON v.id = e.dst
         WHERE e.rel = 'CITES' AND v.key LIKE ?`,
      ).all(`verse:${book}/%`);
      const out = new Map();
      for (const r of rows) {
        const m = String(r.key).match(/^verse:[^/]+\/(\d+)\//);
        if (!m) continue;
        const ch = Number(m[1]);
        out.set(ch, (out.get(ch) ?? 0) + 1);
      }
      return out;
    },
    getSkeleton(hourFile) {
      return raw.prepare('SELECT line FROM office_skeleton WHERE hour_file = ? ORDER BY ord').all(hourFile)
        .map((r) => String(r.line ?? ''));
    },
    getPsalmSchema(dayKey, hour) {
      return raw.prepare(
        'SELECT nocturn, slot_ord, antiphon_la, antiphon_en, psalm_ref, festal_bracket FROM office_psalm_schema WHERE day_key = ? AND hour = ? ORDER BY slot_ord',
      ).all(dayKey, hour).map((r) => ({
        nocturn: r.nocturn == null ? null : Number(r.nocturn),
        slot: Number(r.slot_ord),
        antiphonLa: r.antiphon_la ?? null,
        antiphonEn: r.antiphon_en ?? null,
        ref: String(r.psalm_ref),
        festal: Number(r.festal_bracket) === 1,
      }));
    },
    getNocturnVersicles(dayKey) {
      return raw.prepare(
        'SELECT nocturn, versicle_la, response_la, versicle_en, response_en FROM office_nocturn_versicle WHERE day_key = ? ORDER BY nocturn',
      ).all(dayKey).map((r) => ({
        nocturn: Number(r.nocturn),
        la: `V. ${r.versicle_la ?? ''}\nR. ${r.response_la ?? ''}`,
        en: r.versicle_en ? `V. ${r.versicle_en}\nR. ${r.response_en ?? ''}` : null,
      }));
    },
  };
}
