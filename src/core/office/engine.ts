/**
 * OfficeEngine — runtime construction of the Divine Office
 * (DOCS/ARCHITECTURE.md §7.5; CHECKLIST stanza O-B).
 *
 * `buildHour` walks the hour's Ordinarium skeleton (office_skeleton, the
 * verbatim horas/Ordinarium/<Hour>.txt script), resolves its conditional
 * lines against the day's full rubric context (the same DO SetupString
 * semantics used at ingest, now with season/weekday/hour known), expands
 * `$`/`&` prayer macros and `&psalm(n)` from the corpus graph, and expands
 * each `#Heading` item from:
 *   1. the winner's office propers  (Horas/<winner-key>)
 *   2. its CROSS_REF'd Commune
 *   3. the day file of the week     (Horas/Tempora/<weekKey>)
 *   4. the Psalterium Specials      (seasonal → Sunday/ferial defaults)
 *   5. the psalter schema           (office_psalm_schema + Psalmorum texts)
 *
 * Every entry is a real corpus row; nothing is fabricated. Elements DO
 * renders through deeper machinery (per-lesson benedictions, doxology
 * switching, preces feriales beyond the skeleton's own conditionals) are
 * carried as rubric markers rather than invented.
 */

import type { CorpusDb } from '../data/corpusDb.ts';
import type { DayInfo } from '../data/types.ts';
import type { SectionText } from '../data/types.ts';
import { parseISODate } from '../calendar/computus.ts';
import { resolveDay } from '../data/liturgicalDay.ts';
import { scrubMacros } from '../text/scrubMacros.ts';
import {
  applyConditionals,
  RUBRICS_1960,
  type ConditionContext,
} from '../liturgy/conditionals.ts';

export interface OfficeEntry {
  /** Display heading, e.g. "Psalmus 62", "Capitulum", "Ad Benedictus". */
  title: string;
  latin: string | null;
  english: string | null;
  /** Corpus provenance, e.g. "Horas/Sancti/07-01#Ant Laudes". */
  source: string;
  /** True when the row is a rubric/heading rather than prayed text. */
  rubric?: boolean;
}

export interface OfficeOpts {
  rubricSet: '1960';
}

const HOUR_FILE: Record<string, string> = {
  matutinum: 'Matutinum',
  laudes: 'Laudes',
  prima: 'Prima',
  tertia: 'Minor',
  sexta: 'Minor',
  nona: 'Minor',
  vesperae: 'Vespera',
  completorium: 'Completorium',
};

const HOUR_NAME: Record<string, string> = {
  matutinum: 'Matutinum',
  laudes: 'Laudes',
  prima: 'Prima',
  tertia: 'Tertia',
  sexta: 'Sexta',
  nona: 'Nona',
  vesperae: 'Vespera',
  completorium: 'Completorium',
};

/** Season token used by the Psalterium Special section names. */
function seasonToken(weekKey: string): string | null {
  if (weekKey.startsWith('Adv')) return 'Adv';
  if (weekKey.startsWith('Nat')) return 'Nat';
  if (weekKey.startsWith('Quadp')) return 'Quadp';
  if (/^Quad[56]/.test(weekKey)) return 'Quad5'; // Passiontide + Holy Week
  if (weekKey.startsWith('Quad')) return 'Quad';
  if (/^Pasc[67]/.test(weekKey)) return 'Asc'; // Ascensiontide
  if (weekKey.startsWith('Pasc')) return 'Pasch';
  if (weekKey.startsWith('PentEpi')) return 'Pent';
  if (weekKey.startsWith('Pent')) return 'Pent';
  if (weekKey.startsWith('Epi')) return 'Epi';
  return null;
}

/** Port of get_tempus_id, reduced to the 1960 rubric set. */
function tempusId(weekKey: string, date: Date, hour: string): string {
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const dow = date.getUTCDay();
  const vesp = /Vespera|Completorium/i.test(hour);

  if (weekKey.startsWith('Adv')) return 'Adventus';
  if (weekKey.startsWith('Nat')) {
    return month === 1 && (day >= 6 || (day === 5 && vesp)) ? 'Epiphaniæ' : 'Nativitatis';
  }
  if (weekKey.startsWith('PentEpi')) return month >= 10 ? 'post Pentecosten in hieme' : 'post Pentecosten';
  if (weekKey.startsWith('Epi')) {
    if (month === 1 && day <= 13) return 'Epiphaniæ';
    if (month === 1 || month === 2) return 'post Epiphaniam';
    return 'post Pentecosten in hieme';
  }
  const quadp = weekKey.match(/^Quadp(\d)/);
  if (quadp && (Number(quadp[1]) < 3 || dow < 3)) return 'Septuagesimæ';
  const quad = weekKey.match(/^Quad(\d)/);
  if (quad && Number(quad[1]) < 5) return 'Quadragesimæ';
  if (weekKey.startsWith('Quad')) return 'Passionis';
  if (/^Pasc0/.test(weekKey)) return 'Octava Paschæ';
  const pasc = weekKey.match(/^Pasc(\d)/);
  if (pasc) {
    const n = Number(pasc[1]);
    if (n < 5 || (n === 5 && dow <= 3)) return 'post Octavam Paschæ';
    if (/^Pasc6-(5|6)/.test(weekKey)) return 'post Octavam Ascensionis';
    if (n < 7) return 'Octava Ascensionis';
    return 'Octava Pentecostes';
  }
  if (/^Pent01/.test(weekKey) && dow === 4) return 'Corpus Christi post Pentecosten';
  if (/^Pent02/.test(weekKey) && dow === 5) return 'SSmi Cordis post Pentecosten';
  if (weekKey.startsWith('Pent')) return month >= 10 ? 'post Pentecosten in hieme' : 'post Pentecosten';
  return 'post Pentecosten';
}

/** Port of get_dayname_for_condition (the cases decidable from DayInfo). */
function dieValue(day: DayInfo, date: Date): string {
  const month = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  const w = day.winner?.key ?? '';
  if (month === 1 && d === 6) return 'Epiphaniæ';
  if (month === 1 && d === 13) return 'Baptismatis Domini';
  if (/Quad6-4/.test(day.weekKey)) return 'in Cœna Domini';
  if (/Quad6-5/.test(day.weekKey)) return 'in Parasceve';
  if (/Quad6-6/.test(day.weekKey)) return 'Sabbato Sancto';
  if (/Quad6-[456]/.test(day.weekKey)) return 'Tridui Sacri';
  if (/12-25/.test(w)) return 'Nativitatis';
  if (month === 11 && d === 2) return 'Omnium Defunctorum';
  if (month === 12 && d === 28) return 'Nat28';
  if (month === 12 && d === 29) return 'Nat29';
  if (month === 8 && d === 6) return 'transfigurationis';
  return '';
}

const CANTICLE_PSALM: Record<string, string> = {
  // DO Psalterium numbering (db-verified): 231 = Canticum Zachariæ.
  Benedictus: '231',
  Magnificat: '232',
  'Nunc dimittis': '233',
};

export class OfficeEngine {
  private db: CorpusDb;
  private day: DayInfo;
  private hourId: string;
  private hourName: string;
  private ctx: ConditionContext;
  private dow: number;
  /** Source chain: winner office file, its commune, the week's day file. */
  private chain: string[];
  /** True when this hour is I Vespers of the following feast (vigil eve). */
  private firstVespers = false;

  constructor(db: CorpusDb, day: DayInfo, hourId: string, _opts: OfficeOpts = { rubricSet: '1960' }) {
    this.db = db;
    this.day = day;
    this.hourId = hourId;
    this.hourName = HOUR_NAME[hourId] ?? 'Laudes';
    const date = parseISODate(day.date);
    this.dow = date.getUTCDay();
    this.ctx = {
      version: RUBRICS_1960,
      tempus: tempusId(day.weekKey, date, this.hourName),
      feria: this.dow + 1,
      die: dieValue(day, date),
      ad: this.hourName,
      mense: date.getUTCMonth() + 1,
      officio: day.winner?.title ?? '',
      votiva: 'Hodie',
      commune: '',
    };

    this.chain = [];
    const winnerKey = day.winner?.key;
    if (winnerKey) {
      const horas = `Horas/${winnerKey}`;
      if (db.hasFile(horas)) {
        this.chain.push(horas);
        const commune = db.communeOf(horas);
        if (commune) this.chain.push(commune);
      }
      // Commune reachable from the missa-plane file too.
      const commune2 = db.communeOf(winnerKey);
      if (commune2 && !this.chain.includes(commune2)) this.chain.push(commune2);
    }
    const dayFile = `Horas/Tempora/${day.weekKey}`;
    if (!this.chain.includes(dayFile) && db.hasFile(dayFile)) this.chain.push(dayFile);
    // Ferias resolved to the week's Sunday office keep its oration reachable.
    const sundayFile = `Horas/${day.temporaPath}`;
    if (!this.chain.includes(sundayFile) && db.hasFile(sundayFile)) this.chain.push(sundayFile);

    // I Vespers of a following I/II-class feast on a vigil eve (DO
    // 2026-08-14 → Assumption): Vespers resolves the feast's propers —
    // antiphons, capitulum, hymn, Magnificat antiphon, collect — ahead of
    // the vigil's own, by putting the feast at the head of the chain.
    // Compline shares the *arrangement* (invariable Day0 psalms) but not
    // the chain: its texts are per annum and its collect stays its own.
    if (this.hourName === 'Vespera' || this.hourName === 'Completorium') {
      const rc0 = day.winner?.rankClass ?? '';
      const vigil = /vigil/i.test(rc0) || /vigil/i.test(day.winner?.title ?? '');
      if (vigil) {
        const d = parseISODate(day.date);
        const tomorrow = resolveDay(db, new Date(d.getTime() + 86_400_000).toISOString().slice(0, 10));
        const key = tomorrow.winner?.key;
        if (key && !/feria|vigil/i.test(tomorrow.winner?.rankClass ?? '') && tomorrow.rank >= 5 && db.hasFile(`Horas/${key}`)) {
          if (this.hourName === 'Vespera') this.chain.unshift(`Horas/${key}`);
          this.firstVespers = true;
        }
      }
    }
  }

  // ── low-level lookups ─────────────────────────────────────────────

  /** First existing section across the source chain + extra paths. */
  private sect(names: string[], extraPaths: string[] = []): SectionText | null {
    for (const path of [...this.chain, ...extraPaths]) {
      for (const name of names) {
        const s = this.db.getSection(path, name);
        if (s && (s.latin || s.english)) return this.cond(s);
      }
    }
    return null;
  }

  /** Section of one specific file. */
  private fileSect(path: string, names: string[]): SectionText | null {
    for (const name of names) {
      const s = this.db.getSection(path, name);
      if (s && (s.latin || s.english)) return this.cond(s);
    }
    return null;
  }

  /** Apply the runtime conditional pass to a section's both languages. */
  private cond(s: SectionText): SectionText {
    return {
      ...s,
      latin: s.latin ? applyConditionals(s.latin, this.ctx) : s.latin,
      english: s.english ? applyConditionals(s.english, this.ctx) : s.english,
    };
  }

  private prayer(name: string): SectionText | null {
    const clean = name.replace(/_/g, ' ').trim();
    const bare = clean.replace(/^rubrica\s+/i, '');
    // Pater-marked rubric slots carry the plain Pater noster (their stored
    // text is itself a marker; never recurse into it).
    if (/^pater\b/i.test(bare)) return this.fileSect('Psalterium/Common/Prayers', ['Pater noster']);
    // DO section-name conventions the skeleton macros don't spell literally
    // (db-verified): the greeting pair, and the underscored Oratio sections.
    if (/^Dominus vobiscum$/i.test(bare)) return this.fileSect('Psalterium/Common/Prayers', ['Dominus']);
    const stripOratio = bare.replace(/^oratio\s+/i, '');
    const candidates = [
      name, // literal macro form, e.g. `oratio_Domine` names its section verbatim
      clean, clean.toLowerCase(),
      bare, bare.toLowerCase(),
      stripOratio, stripOratio.toLowerCase(),
      'Oratio ' + stripOratio, 'Oratio ' + stripOratio + '_',
    ].filter(Boolean);
    for (const c of [...new Set(candidates)]) {
      const s =
        this.fileSect('Psalterium/Common/Prayers', [c]) ??
        this.fileSect('Psalterium/Common/Rubricae', [c]);
      if (s) return s;
    }
    return null;
  }

  /** Expand $/&/&psalm() macros and text lines of a skeleton block. */
  private expandBlock(lines: string[], title: string): OfficeEntry[] {
    const la: string[] = [];
    const en: string[] = [];
    const sources: string[] = [];
    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line === '_') continue;
      const pm = line.match(/^[&$]psalm\((\d+[a-z]?)\)/i);
      if (pm) {
        const p = this.db.getPsalm(pm[1]);
        if (p) {
          la.push(`!Psalmus ${pm[1]}`, p.latin ?? '');
          en.push(`!Psalm ${pm[1]}`, p.english ?? '');
          sources.push(p.nodeKey);
        }
        continue;
      }
      const mac = line.match(/^([&$])\s*([\p{L}\p{N} _.'’()-]+?)\s*$/u);
      if (mac && !line.startsWith('!')) {
        const p = this.prayer(mac[2]);
        if (p) {
          la.push(applyConditionals(p.latin ?? '', this.ctx));
          en.push(applyConditionals(p.english ?? '', this.ctx));
          sources.push(p.nodeKey);
        } else {
          // Unknown engine macro — keep as a rubric marker, never invent text.
          la.push(`![${mac[2].trim()}]`);
          en.push(`![${mac[2].trim()}]`);
        }
        continue;
      }
      if (line.startsWith('#')) continue;
      la.push(line);
      en.push(line);
    }
    const latin = la.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    const english = en.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    if (!latin && !english) return [];
    return [{ title, latin: latin || null, english: english || null, source: sources[0] ?? 'Ordinarium' }];
  }

  // ── psalmody ──────────────────────────────────────────────────────

  /** Psalm text for a schema ref like "118(33-48)" / "9(2-11)" / "62". */
  private psalmEntries(ref: string, antLa: string | null, antEn: string | null, sourceAnt?: string): OfficeEntry[] {
    const m = ref.trim().match(/^(\d+[a-z]?)(?:\((.+)\))?$/);
    if (!m) return [];
    const p = this.db.getPsalm(m[1]);
    if (!p) return [];
    let latin = p.latin ?? '';
    let english = p.english ?? '';
    if (m[2]) {
      const range = m[2].match(/^'?(\d+)[a-z]?'?\s*-\s*'?(\d+)[a-z]?'?$/);
      if (range) {
        const [a, b] = [Number(range[1]), Number(range[2])];
        const inRange = (text: string) =>
          text
            .split('\n')
            .filter((l) => {
              const v = l.match(/^\d+[a-z]?:(\d+)/);
              return !v || (Number(v[1]) >= a && Number(v[1]) <= b);
            })
            .join('\n');
        latin = inRange(latin);
        english = inRange(english);
      }
    }
    const num = Number(m[1]);
    const isCanticle = num >= 210 && num <= 233;
    const title = isCanticle ? `Canticum (${ref})` : `Psalmus ${ref}`;
    const out: OfficeEntry[] = [];
    if (antLa || antEn) {
      out.push({
        title: 'Ant.',
        latin: antLa ? `Ant. ${antLa}` : null,
        english: antEn ? `Ant. ${antEn}` : null,
        source: sourceAnt ?? 'office_psalm_schema',
      });
    }
    out.push({ title, latin: latin || null, english: english || null, source: p.nodeKey });
    return out;
  }

  /** Antiphon list from a proper section ("Ant Laudes" etc.), if any. */
  private properAntiphons(names: string[], path?: string): { la: string[]; en: string[]; refs: (string | null)[]; source: string } | null {
    const s = path ? this.fileSect(path, names) : this.sect(names);
    if (!s?.latin) return null;
    const parse = (text: string | null) =>
      (text ?? '')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('!'));
    const laLines = parse(s.latin);
    const enLines = parse(s.english);
    const la: string[] = [];
    const en: string[] = [];
    const refs: (string | null)[] = [];
    laLines.forEach((l, i) => {
      const [ant, ref] = l.split(';;');
      la.push(ant.trim());
      refs.push(ref?.trim() || null);
      en.push((enLines[i] ?? '').split(';;')[0].trim());
    });
    return la.length ? { la, en, refs, source: s.nodeKey } : null;
  }

  /**
   * The hour's psalmody. Feast antiphons (and proper psalms when the
   * antiphon rows carry `;;ref`) override the psalter schema slot by slot.
   */
  private psalmody(): OfficeEntry[] {
    const dayKey = `Day${this.dow}`;
    const hour = this.hourName;
    const out: OfficeEntry[] = [];

    // ── 1960 schema selection (DO-verified, 2026-08-14…17 probes) ──
    // Sundays and I/II-class feasts use the Sunday/festal rows for Laudes
    // and the minor hours and the invariable Compline (Day0); their Prime
    // is the festal 53 + 118 strophes. Ferias and III-class feasts keep
    // the day-of-week rows. Feast Vespers ride the proper's own refs and
    // feast Matins follows the proper, so both stay on `Day${dow}`.
    const rc = this.day.winner?.rankClass ?? '';
    // Vigils rank as Simplex (2026-08-14: rc "Simplex") — detect from the title.
    const isVigil = /vigil/i.test(rc) || /vigil/i.test(this.day.winner?.title ?? '');
    const majorFeast = !!this.day.winner && this.dow !== 0 && !/feria|vigil/i.test(rc) && this.day.rank >= 5;
    const festal = this.dow === 0 || majorFeast;

    // Lauds: the second (penitential) schema on ferias and vigils of
    // Advent, Septuagesima and Lent — and on penitential vigils per annum;
    // Laudes1 otherwise. (Any feria rank qualifies — ember days are
    // "Feria major"; Sundays and feasts keep Laudes1.)
    const penitential =
      (['Advent', 'Pre-Lent', 'Lent'].includes(this.day.season) && /feria/i.test(rc)) ||
      (isVigil && this.dow !== 0);

    if (hour === 'Matutinum') {
      // A penitential Wednesday breaks Psalm 49 into three in place of 50
      // (DO `psalmi_matutinum`: laudes==2 && Wednesday, never Dec 24).
      const schemaKey =
        this.dow === 3 && penitential && !/12-24/.test(this.day.winner?.key ?? '') ? 'Day31' : dayKey;
      const schema = this.db.getPsalmSchema(schemaKey, 'Matutinum');
      const versicles = this.db.getNocturnVersicles(dayKey);
      const proper = this.properAntiphons(['Ant Matutinum']);
      // Nine-lesson offices (I/II-class feasts) interleave three lessons per
      // nocturn; three-lesson offices (Sundays, vigils, III-class feasts)
      // read the lessons as one block after the whole psalmody — both opened
      // by the Pater noster (DO 08-14/15/16/17).
      const interleave = majorFeast;
      let lastNocturn = 0;
      schema.forEach((slot, i) => {
        if (slot.nocturn !== lastNocturn) {
          lastNocturn = slot.nocturn ?? 0;
          out.push({ title: `Nocturnus ${lastNocturn}`, latin: null, english: null, source: 'office_psalm_schema', rubric: true });
        }
        const antLa = proper?.la[i] ?? slot.antiphonLa;
        const antEn = proper?.en[i] ?? slot.antiphonEn;
        const ref = proper?.refs[i] ?? slot.ref;
        out.push(...this.psalmEntries(ref, antLa, antEn, proper?.source));
        const v = versicles.find((x) => x.nocturn === slot.nocturn);
        const isLastOfNocturn = i + 1 >= schema.length || schema[i + 1].nocturn !== slot.nocturn;
        if (isLastOfNocturn) {
          if (v) out.push({ title: 'Versiculus', latin: v.la, english: v.en, source: 'office_nocturn_versicle' });
          if (interleave) {
            const n = slot.nocturn ?? 1;
            const nl = this.lessons([(n - 1) * 3 + 1, n * 3], '', 0, true);
            if (nl.length) {
              const pater = this.prayer('Pater noster');
              if (pater) out.push({ title: 'Pater noster', latin: pater.latin, english: pater.english, source: pater.nodeKey });
              out.push(...nl);
            }
          }
        }
      });
      if (!interleave) {
        const nl = this.lessons([1, 9], this.perAnnumScripture(), 3);
        if (nl.length) {
          const pater = this.prayer('Pater noster');
          if (pater) out.push({ title: 'Pater noster', latin: pater.latin, english: pater.english, source: pater.nodeKey });
          out.push(...nl);
        }
      }
      out.push(...this.teDeum());
      return out;
    }

    let schemaHour = hour;
    if (hour === 'Laudes') {
      schemaHour = penitential ? 'Laudes2' : 'Laudes1';
    }

    if (hour === 'Prima' && majorFeast) {
      // Festal Prime (DO 08-15): invariable Ps 53 with the two 118 strophes,
      // under the proper's first Laudes antiphon.
      const ant = this.properAntiphons(['Ant Laudes']);
      out.push(...this.psalmEntries('53', ant?.la[0] ?? null, ant?.en[0] ?? null, ant?.source));
      out.push(...this.psalmEntries('118(1-16)', null, null));
      out.push(...this.psalmEntries('118(17-32)', null, null));
      return out;
    }

    // Vigil eve of a I/II-class feast sings I Vespers of the feast (DO
    // 2026-08-14 → Assumption): the evening's Compline follows the festal
    // (invariable) arrangement; the Vespers propers ride the chain head.
    const schemaKey =
      (festal || (this.firstVespers && hour === 'Completorium')) &&
      ['Laudes', 'Tertia', 'Sexta', 'Nona', 'Completorium'].includes(hour)
        ? 'Day0'
        : dayKey;
    const schema = this.db.getPsalmSchema(schemaKey, schemaHour);
    const properNames =
      hour === 'Laudes' ? ['Ant Laudes']
      : hour === 'Vespera' ? ['Ant Vespera']
      : majorFeast && ['Tertia', 'Sexta', 'Nona'].includes(hour) ? ['Ant Laudes']
      : [`Ant ${hour}`];
    // On feasts the minor hours take their antiphon from the Laudes set:
    // Tertia the 2nd, Sexta the 3rd, Nona the 5th (DO 08-15).
    const feastAntIdx: Record<string, number> = { Tertia: 1, Sexta: 2, Nona: 4 };
    const proper = this.properAntiphons(properNames);

    schema.forEach((slot, i) => {
      // 1960 drops the bracketed pre-1960 ferial extra (Prime's fourth psalm).
      if (slot.festal) return;
      const antIdx = majorFeast && feastAntIdx[hour] !== undefined ? feastAntIdx[hour] : i;
      const antLa = proper?.la[antIdx] ?? slot.antiphonLa;
      const antEn = proper?.en[antIdx] ?? slot.antiphonEn;
      const ref = proper?.refs[i] ?? slot.ref;
      // Minor hours fold their psalms under a single antiphon (first slot).
      if (['Prima', 'Tertia', 'Sexta', 'Nona', 'Completorium'].includes(hour) && i > 0) {
        out.push(...this.psalmEntries(ref, null, null));
      } else {
        out.push(...this.psalmEntries(ref, antLa, antEn, proper?.source));
      }
    });
    return out;
  }

  // ── seasonal/special lookups ──────────────────────────────────────

  private special(file: string, names: string[]): SectionText | null {
    return this.fileSect(`Psalterium/Special/${file}`, names);
  }

  /** Capitulum / hymn / versicle resolution for Lauds & Vespers. */
  private capitulumHymnusVersus(which: 'Laudes' | 'Vespera'): OfficeEntry[] {
    const tok = seasonToken(this.day.weekKey);
    const domFer = this.dow === 0 ? 'Dominica' : 'Feria';
    const out: OfficeEntry[] = [];

    const cap =
      this.sect([`Capitulum ${which}`]) ??
      this.special('Major Special', [tok ? `${tok} ${which}` : '', `${domFer} ${which}`].filter(Boolean));
    if (cap) out.push({ title: 'Capitulum', latin: cap.latin, english: cap.english, source: cap.nodeKey });

    const hymn =
      this.sect([`Hymnus ${which}`]) ??
      this.special('Major Special', [
        tok ? `Hymnus ${tok} ${which}` : '',
        `Hymnus Day${this.dow} ${which}`,
      ].filter(Boolean));
    if (hymn) out.push({ title: 'Hymnus', latin: hymn.latin, english: hymn.english, source: hymn.nodeKey });

    const vnum = which === 'Laudes' ? '2' : '3';
    const versus =
      this.sect([`Versum ${vnum}`]) ??
      this.special('Major Special', [tok ? `${tok} Versum ${vnum}` : '', `${domFer} Versum ${vnum}`].filter(Boolean));
    if (versus) out.push({ title: 'Versus', latin: versus.latin, english: versus.english, source: versus.nodeKey });

    return out;
  }

  /** Gospel canticle with its antiphon. */
  private canticum(name: 'Benedictus' | 'Magnificat' | 'Nunc dimittis'): OfficeEntry[] {
    const out: OfficeEntry[] = [];
    const antNum = name === 'Benedictus' ? '2' : name === 'Magnificat' ? '3' : null;
    if (antNum) {
      const domFer = this.dow === 0 ? 'Dominica' : `Feria${this.dow + 1}`;
      const ant =
        this.sect([`Ant ${antNum}`]) ??
        this.special('Major Special', [`${domFer} Ant ${antNum}`, `${this.dow === 0 ? 'Dominica' : 'Feria'} Ant ${antNum}`]);
      if (ant) {
        out.push({
          title: `Ant. ad ${name}`,
          latin: ant.latin ? `Ant. ${ant.latin.split('\n')[0]}` : null,
          english: ant.english ? `Ant. ${ant.english.split('\n')[0]}` : null,
          source: ant.nodeKey,
        });
      }
    }
    const psalm = this.db.getPsalm(CANTICLE_PSALM[name]);
    if (psalm) {
      out.push({ title: `Canticum: ${name}`, latin: psalm.latin, english: psalm.english, source: psalm.nodeKey });
    }
    return out;
  }

  /** Compline's confession block (DO Completorium ordinary; D19). */
  private complineConfession(): OfficeEntry[] {
    const out: OfficeEntry[] = [];
    const examen = this.fileSect('Psalterium/Common/Rubricae', ['examen']);
    if (examen) out.push({ title: 'Rubrica', latin: examen.latin, english: examen.english, source: examen.nodeKey, rubric: true });
    for (const name of ['Confiteor', 'Misereatur', 'Indulgentiam', 'Converte nos']) {
      const s = this.fileSect('Psalterium/Common/Prayers', [name]);
      if (s) out.push({ title: name, latin: s.latin, english: s.english, source: s.nodeKey });
    }
    return out;
  }

  /** The day's collect + commemorations. */
  private oratio(): OfficeEntry[] {
    const out: OfficeEntry[] = [];
    const or = this.sect(['Oratio']) ?? (this.day.winner ? this.fileSect(this.day.winner.key, ['Oratio']) : null);
    if (or) out.push({ title: 'Oratio', latin: or.latin, english: or.english, source: or.nodeKey });
    // 1960: commemorations attach to Lauds and Vespers only (D18).
    if (!['Laudes', 'Vespera'].includes(this.hourName)) return out;
    for (const c of this.day.commemorations.slice(0, 3)) {
      // Feria files carry no [Oratio] by design (D7): DO commemorates with
      // the week's Sunday collect — fall back to `<week>-0`.
      const sunday = /^(Tempora\/.+)-[1-6]$/.exec(c.key)?.[1] + '-0';
      const co =
        this.fileSect(`Horas/${c.key}`, ['Oratio']) ??
        this.fileSect(c.key, ['Oratio']) ??
        (sunday ? (this.fileSect(`Horas/${sunday}`, ['Oratio']) ?? this.fileSect(sunday, ['Oratio'])) : null);
      if (co) {
        out.push({
          title: `Commemoratio: ${c.title ?? c.key}`,
          latin: co.latin,
          english: co.english,
          source: co.nodeKey,
        });
      }
    }
    return out;
  }

  /** Seasonal final antiphon of Our Lady (Compline; Lauds when leaving choir). */
  private marianAntiphon(): OfficeEntry[] {
    const wk = this.day.weekKey;
    const name = wk.startsWith('Adv') || /^Nat/.test(wk)
      ? 'Advent'
      : /^(Quadp|Quad)/.test(wk)
        ? 'Quadragesimae'
        : /^Pasc/.test(wk)
          ? 'Paschalis'
          : /^Epi/.test(wk)
            ? 'Nativiti' // until Feb 2 the Christmas antiphon (Alma Redemptoris)
            : 'Postpentecost';
    const s = this.fileSect('Psalterium/Mariaant', [name]);
    if (!s) return [];
    return [{ title: 'Antiphona finalis B.M.V.', latin: s.latin, english: s.english, source: s.nodeKey }];
  }

  private invitatorium(): OfficeEntry[] {
    const tok = seasonToken(this.day.weekKey);
    const out: OfficeEntry[] = [];
    const inv =
      this.sect(['Invit']) ??
      this.special('Matutinum Special', [tok ? `Invit ${tok}` : '', 'Invit'].filter(Boolean));
    if (inv) out.push({ title: 'Invitatorium', latin: inv.latin, english: inv.english, source: inv.nodeKey });
    const ps94 = this.db.getPsalm('94');
    if (ps94) out.push({ title: 'Psalmus 94 (Venite exsultemus)', latin: ps94.latin, english: ps94.english, source: ps94.nodeKey });
    return out;
  }

  private matutinumHymn(): OfficeEntry[] {
    const tok = seasonToken(this.day.weekKey);
    const hymn =
      this.sect(['Hymnus Matutinum']) ??
      this.special('Matutinum Special', [tok ? `Hymnus ${tok}` : '', `Day${this.dow} Hymnus`].filter(Boolean));
    return hymn ? [{ title: 'Hymnus', latin: hymn.latin, english: hymn.english, source: hymn.nodeKey }] : [];
  }

  /**
   * The occurring per-annum scripture file (`Tempora/MMW-D`, W = the
   * 7-day block within the month) that DO reads as the day's `scriptura`:
   * III-class sanctoral offices take Matins Lectio1–2 from it when the
   * proper carries none. Only defined in the per-annum seasons.
   */
  private perAnnumScripture(): string {
    if (!/Time after (Pentecost|Epiphany)/.test(this.day.season)) return '';
    const date = parseISODate(this.day.date);
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const week = Math.floor((date.getUTCDate() - 1) / 7) + 1;
    const file = `Horas/Tempora/${mm}${week}-${this.dow}`;
    return this.db.hasFile(file) ? file : '';
  }

  /** Matins lessons with responsories within a 1-based inclusive range.
   * `scrFile` = occurring scripture (3-lesson sanctoral offices read
   * lessons 1–2 from it ahead of the commune); `cap` stops after that many
   * lessons (the 1960 three-lesson offices); `labelByNumber` keeps the
   * file's own Lectio numbering instead of renumbering from 1. */
  private lessons(range: [number, number] = [1, 9], scrFile = '', cap = 0, labelByNumber = false): OfficeEntry[] {
    // 3-lesson offices: Sundays diverge the 3rd lesson to the homily (the
    // file's Lectio7), sanctoral feasts to the legend (Lectio4); vigils
    // keep their own homily lessons (DO `lectio`).
    const properFile = this.day.winner ? `Horas/${this.day.winner.key}` : '';
    const sundayOffice = this.dow === 0 && cap === 3;
    const divergeLegend =
      cap === 3 && !!scrFile && (this.day.winner?.key ?? '').startsWith('Sancti/') && !/vigil/i.test(this.day.winner?.title ?? '');
    const out: OfficeEntry[] = [];
    let display = 0;
    for (let i = range[0]; i <= range[1]; i++) {
      const n = sundayOffice && i === 3 ? 7 : divergeLegend && i === 3 ? 4 : i;
      // DO files number Sunday homily lessons 7–9 and feasts 1–9: collect
      // what exists, never break on a gap (D16), and display them
      // sequentially as DO does (Lectio 1..n).
      const lec =
        (properFile ? this.fileSect(properFile, [`Lectio${n}`]) : null) ??
        (scrFile && n < 3 ? this.fileSect(scrFile, [`Lectio${n}`]) : null) ??
        this.sect([`Lectio${n}`]);
      if (!lec) continue;
      display++;
      const label = labelByNumber ? n : display;
      out.push({ title: `Lectio ${label}`, latin: lec.latin, english: lec.english, source: lec.nodeKey });
      const resp =
        (properFile ? this.fileSect(properFile, [`Responsory${n}`]) : null) ??
        (scrFile && n < 3 ? this.fileSect(scrFile, [`Responsory${n}`]) : null) ??
        this.sect([`Responsory${n}`]);
      if (resp) out.push({ title: `Responsorium ${label}`, latin: resp.latin, english: resp.english, source: resp.nodeKey });
      if (cap && display >= cap) break;
    }
    return out;
  }

  /** Te Deum after the final lesson except on penitential ferias
   * (Advent/Septuagesima/Lent ferias — not feasts — and Requiem). */
  private teDeum(): OfficeEntry[] {
    const isFeria = this.day.winner?.key?.startsWith('Tempora/') ?? true;
    const penitential =
      ['Advent', 'Pre-Lent', 'Lent'].includes(this.day.season) && isFeria && this.dow !== 0;
    if (penitential) return [];
    const te = this.prayer('Te Deum');
    return te ? [{ title: 'Te Deum', latin: te.latin, english: te.english, source: te.nodeKey }] : [];
  }

  /** Capitulum/responsory/versicle of the little hours & Compline. */
  private minorCapitulum(): OfficeEntry[] {
    const hour = this.hourName;
    const tok = seasonToken(this.day.weekKey);
    const domFer = this.dow === 0 ? 'Dominica' : 'Feria';
    const out: OfficeEntry[] = [];

    if (hour === 'Prima') {
      const cap = this.special('Prima Special', [tok ?? '', 'Per Annum', domFer].filter(Boolean));
      if (cap) out.push({ title: 'Capitulum', latin: cap.latin, english: cap.english, source: cap.nodeKey });
      const resp = this.sect(['Responsory Breve Prima']) ?? this.special('Prima Special', [tok ? `Responsory ${tok}` : '', 'Responsory'].filter(Boolean));
      if (resp) out.push({ title: 'Responsorium breve', latin: resp.latin, english: resp.english, source: resp.nodeKey });
      const versum = this.special('Prima Special', ['Versum']);
      if (versum) out.push({ title: 'Versus', latin: versum.latin, english: versum.english, source: versum.nodeKey });
      return out;
    }

    // Tertia/Sexta/Nona: proper capitulum, else seasonal/psalter defaults.
    // (Tertia's capitulum defaults to the Lauds capitulum by rule.)
    const cap =
      this.sect([`Capitulum ${hour}`]) ??
      (hour === 'Tertia' ? this.sect(['Capitulum Laudes']) : null) ??
      this.special('Minor Special', [tok ? `${tok} ${hour}` : '', `${domFer} ${hour}`].filter(Boolean));
    if (cap) out.push({ title: 'Capitulum', latin: cap.latin, english: cap.english, source: cap.nodeKey });

    const resp =
      this.sect([`Responsory Breve ${hour}`]) ??
      this.special('Minor Special', [
        tok ? `Responsory breve ${tok} ${hour}` : '',
        `Responsory breve ${domFer} ${hour}`,
      ].filter(Boolean));
    if (resp) out.push({ title: 'Responsorium breve', latin: resp.latin, english: resp.english, source: resp.nodeKey });

    const versum =
      this.sect([`Versum ${hour}`]) ??
      this.special('Minor Special', [tok ? `Versum ${tok} ${hour}` : '', `Versum ${domFer} ${hour}`].filter(Boolean));
    if (versum) out.push({ title: 'Versus', latin: versum.latin, english: versum.english, source: versum.nodeKey });
    return out;
  }

  private minorHymn(): OfficeEntry[] {
    const hour = this.hourName;
    const names =
      hour === 'Prima'
        ? ['Hymnus Prima']
        : hour === 'Completorium'
          ? ['Hymnus Completorium']
          : [`Hymnus ${hour}`];
    const hymn = this.sect(names) ?? this.special(hour === 'Prima' ? 'Prima Special' : 'Minor Special', names);
    if (hymn) return [{ title: 'Hymnus', latin: hymn.latin, english: hymn.english, source: hymn.nodeKey }];
    return [];
  }

  // ── the walk ──────────────────────────────────────────────────────

  build(): OfficeEntry[] {
    const skeleton = this.db.getSkeleton(HOUR_FILE[this.hourId] ?? 'Laudes');
    if (!skeleton.length) return [];
    const lines = applyConditionals(skeleton.join('\n'), this.ctx).split('\n');

    // Group into #Heading blocks.
    const blocks: { heading: string; lines: string[] }[] = [];
    let current = { heading: '', lines: [] as string[] };
    for (const line of lines) {
      const h = line.match(/^#\s*(.+?)\s*$/);
      if (h) {
        blocks.push(current);
        current = { heading: h[1], lines: [] };
      } else {
        current.lines.push(line);
      }
    }
    blocks.push(current);

    const out: OfficeEntry[] = [];
    const seenHeadings = new Set<string>();
    for (const b of blocks) {
      if (!b.heading) {
        out.push(...this.expandBlock(b.lines, 'Ordinarium'));
        continue;
      }
      // Conditional processing may leave duplicate alternative headings
      // (e.g. "#Capitulum Hymnus Versus" twice) — take the first realized.
      const norm = b.heading.replace(/\s+/g, ' ');
      if (seenHeadings.has(norm)) continue;
      seenHeadings.add(norm);

      out.push({ title: b.heading, latin: null, english: null, source: 'Ordinarium', rubric: true });
      out.push(...this.expandBlock(b.lines, b.heading));

      if (/^Invitatorium/.test(b.heading)) out.push(...this.invitatorium());
      else if (/^Hymnus$/.test(b.heading) && this.hourName === 'Matutinum') out.push(...this.matutinumHymn());
      else if (/^Hymnus$/.test(b.heading)) out.push(...this.minorHymn());
      else if (/^Psalmi cum lectionibus/.test(b.heading)) out.push(...this.psalmody());
      else if (/^Psalmi/.test(b.heading)) {
        if (this.hourName === 'Completorium') out.push(...this.complineConfession());
        out.push(...this.psalmody());
      }
      else if (/^Capitulum.*(Hymnus|Responsorium)/.test(b.heading) && (this.hourName === 'Laudes' || this.hourName === 'Vespera'))
        out.push(...this.capitulumHymnusVersus(this.hourName as 'Laudes' | 'Vespera'));
      else if (/^Capitulum/.test(b.heading)) out.push(...this.minorCapitulum());
      else if (/^Canticum: Benedictus/.test(b.heading)) out.push(...this.canticum('Benedictus'));
      else if (/^Canticum: Magnificat/.test(b.heading)) out.push(...this.canticum('Magnificat'));
      else if (/^Canticum: Nunc dimittis/.test(b.heading)) out.push(...this.canticum('Nunc dimittis'));
      else if (/^Oratio/.test(b.heading)) out.push(...this.oratio());
      else if (/^Antiphona finalis/.test(b.heading)) out.push(...this.marianAntiphon());
      else if (/^Lectio brevis/.test(b.heading)) {
        const lb = this.sect(['Lectio Prima', `Lectio brevis ${this.hourName}`]);
        if (lb) out.push({ title: 'Lectio brevis', latin: lb.latin, english: lb.english, source: lb.nodeKey });
      }
    }
    // Drop consecutive rubric headers with no realized content beneath them,
    // then scrub residual engine markers (D6/D10).
    return out
      .filter((e, i) => !(e.rubric && (i + 1 >= out.length || out[i + 1]?.rubric)))
      .map((e) => ({
        ...e,
        latin: e.latin != null ? scrubMacros(e.latin) : e.latin,
        english: e.english != null ? scrubMacros(e.english) : e.english,
      }))
      .filter(
        (e) =>
          !e.rubric || (e.latin ?? '') !== '' || (e.english ?? '') !== '' || /^Nocturnus/.test(e.title),
      );
  }

}

/** §7.5 signature. */
export function buildHour(db: CorpusDb, day: DayInfo, hourId: string, opts: OfficeOpts = { rubricSet: '1960' }): OfficeEntry[] {
  return new OfficeEngine(db, day, hourId, opts).build();
}
