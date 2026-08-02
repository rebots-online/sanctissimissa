/**
 * do-parse — parser + directive resolver for the vendored Divinum Officium
 * flat-text corpus (VENDORED/divinum-officium/web/www).
 *
 * Schema handled (see DOCS/CORPUS-SCHEMA.md):
 *   [Section]            section header, optional "(qualifier)" suffix
 *   !citation / !rubric  kept verbatim (reader styles "!" lines)
 *   @path:Section:xform  include directive (path empty = same file)
 *   &Name / $Name        prayer/macro expansion from Ordo/Prayers.txt
 *   &psalm(N)            psalm inclusion from Psalterium/Psalmorum
 *   [Rank] a;;class;;num;;vide X   rank line with cross-reference
 *
 * Hiccoughs in the corpus (directives whose targets are missing) NEVER break
 * generation: each is resolved via fallbacks and logged through the FillLog
 * (→ DOCS/CORPUS-FILL-LOG.md).
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// ── Fill log ────────────────────────────────────────────────────────
/** Collects every gap-fill / broken-directive event for the audit log. */
export class FillLog {
  constructor() {
    /** @type {{file:string,section:string,directive:string,resolution:string,source:string|null,citation:string|null,preview:string|null}[]} */
    this.entries = [];
  }
  add(entry) {
    this.entries.push(entry);
  }
  toMarkdown() {
    const head = [
      '# CORPUS FILL LOG',
      '',
      'Regenerated on every ingest. Each row is an internal directive in the vendored',
      'Divinum Officium corpus whose target was missing or malformed; generation never',
      'breaks — the content is filled from the listed source (or marked as a placeholder)',
      'and recorded here with its citation.',
      '',
      '| Source file | Section | Broken directive | Resolution | Filled from | Citation | Content (preview) |',
      '| --- | --- | --- | --- | --- | --- | --- |',
    ];
    const rows = this.entries.map((e) =>
      `| ${e.file} | ${e.section} | \`${(e.directive || '').replace(/\|/g, '\\|')}\` | ${e.resolution} | ${e.source ?? '—'} | ${e.citation ?? '—'} | ${(e.preview ?? '—').replace(/\|/g, '\\|').replace(/\n/g, ' ').slice(0, 120)} |`,
    );
    return [...head, ...rows, '', `Total: ${this.entries.length} fill(s).`, ''].join('\n');
  }
}

// ── Low-level parsing ───────────────────────────────────────────────

const SECTION_RE = /^\[([^\]]+)\]\s*(?:\((.*)\))?\s*$/;

/**
 * Parse one DO flat-text file into ordered sections.
 * @returns {{name:string, qualifier:string|null, content:string}[]}
 */
export function parseDOFile(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  const sections = [];
  let current = null;
  for (const line of lines) {
    const m = line.match(SECTION_RE);
    if (m) {
      if (current) current.content = current.lines.join('\n').replace(/\s+$/, '');
      current = { name: m[1].trim(), qualifier: m[2]?.trim() ?? null, lines: [] };
      sections.push(current);
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) current.content = current.lines.join('\n').replace(/\s+$/, '');
  for (const s of sections) delete s.lines;
  return sections;
}

/** Parse a [Rank] line: "name;;class;;num;;extra (vide Cnn)". */
export function parseRank(content) {
  const firstLine = (content ?? '').split('\n')[0].trim();
  const fields = firstLine.split(';;');
  const name = fields[0]?.trim() || null;
  const rankClass = fields[1]?.trim() || null;
  const rankNum = Number.parseFloat(fields[2] ?? '') || 0;
  const videMatch = firstLine.match(/(?:vide|ex)\s+((?:Commune\/)?C\d+\w*(?:-\d+)?[a-z]*)/i);
  const vide = videMatch ? (videMatch[1].startsWith('Commune/') ? videMatch[1] : `Commune/${videMatch[1]}`) : null;
  return { name, rankClass, rankNum, vide };
}

/** Extract a "vide Commune/Cnn" reference from [Rule] content. */
export function ruleVide(content) {
  const m = (content ?? '').match(/(?:vide|ex)\s+((?:Commune\/)?C\d+\w*(?:-\d+)?[a-z]*)/i);
  if (!m) return null;
  return m[1].startsWith('Commune/') ? m[1] : `Commune/${m[1]}`;
}

// ── Corpus tree access ──────────────────────────────────────────────

/**
 * CorpusTree — file loader over the vendored DO www tree for one language,
 * with parse caching. Paths are DO-relative ("Tempora/Pent06-0",
 * "Commune/C4b", "Psalterium/Psalmorum/Psalm1") without ".txt".
 */
export class CorpusTree {
  /**
   * @param {string} wwwRoot  e.g. VENDORED/divinum-officium/web/www
   * @param {string} lang     "Latin" | "English" | …
   */
  constructor(wwwRoot, lang) {
    this.root = wwwRoot;
    this.lang = lang;
    /** @type {Map<string, {name:string,qualifier:string|null,content:string}[]|null>} */
    this.cache = new Map();
  }

  /** Absolute candidate paths for a DO-relative path, missa first. */
  candidates(path) {
    return [
      join(this.root, 'missa', this.lang, `${path}.txt`),
      join(this.root, 'horas', this.lang, `${path}.txt`),
    ];
  }

  exists(path) {
    return this.candidates(path).some((p) => existsSync(p));
  }

  /**
   * Parsed sections of a DO file, or null when absent in this language.
   * The same DO-relative path may exist in BOTH missa and horas with
   * different sections (e.g. Tempora/Adv1-0: Mass propers in missa,
   * office lessons in horas) — sections merge, missa winning collisions.
   */
  sections(path) {
    if (this.cache.has(path)) return this.cache.get(path);
    let parsed = null;
    for (const p of this.candidates(path)) {
      if (!existsSync(p)) continue;
      const secs = parseDOFile(readFileSync(p, 'utf8'));
      if (!parsed) {
        parsed = secs;
      } else {
        const have = new Set(parsed.map((s) => s.name));
        for (const s of secs) if (!have.has(s.name)) parsed.push(s);
      }
    }
    this.cache.set(path, parsed);
    return parsed;
  }

  section(path, name) {
    const secs = this.sections(path);
    if (!secs) return null;
    return secs.find((s) => s.name === name) ?? null;
  }

  /** Raw psalm text (verse lines) or null. */
  psalm(num) {
    const p = join(this.root, 'horas', this.lang, 'Psalterium', 'Psalmorum', `Psalm${num}.txt`);
    return existsSync(p) ? readFileSync(p, 'utf8').replace(/^\uFEFF/, '').replace(/\s+$/, '') : null;
  }
}

// ── Prayers (macro targets) ─────────────────────────────────────────

const normKey = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/**
 * Build the prayer lookup for one language: missa Ordo/Prayers.txt merged
 * over horas Psalterium/Common/Prayers.txt (missa wins on collision).
 */
export function loadPrayers(wwwRoot, lang) {
  const map = new Map();
  const sources = [
    join(wwwRoot, 'horas', lang, 'Psalterium', 'Common', 'Prayers.txt'),
    join(wwwRoot, 'missa', lang, 'Ordo', 'Prayers.txt'),
  ];
  for (const src of sources) {
    if (!existsSync(src)) continue;
    for (const s of parseDOFile(readFileSync(src, 'utf8'))) {
      map.set(normKey(s.name), s.content);
    }
  }
  return map;
}

// ── Directive resolution ────────────────────────────────────────────

const INCLUDE_RE = /^@([^:\n]*)(?::([^:\n]*))?(?::(.*))?$/;
const MACRO_RE = /^([&$])\s*([\p{L}\p{N} .'’()-]+?)\s*$/u;
const PSALM_MACRO_RE = /^[&$]psalm\((\d+[a-z]?)\)\s*$/i;

/**
 * Apply a third-field transform of an include: a "1-4" line range, one or
 * more s/// substitutions, or a combination ("1 s/19-23/21-26/").
 */
function applyTransform(text, xform, onFail) {
  if (!xform) return text;
  let rest = xform.trim();
  const range = rest.match(/^(\d+)(?:-(\d+))?\s*/);
  if (range) {
    const lines = text.split('\n');
    const a = Number(range[1]) - 1;
    const b = range[2] ? Number(range[2]) : a + 1;
    text = lines.slice(a, b).join('\n');
    rest = rest.slice(range[0].length);
  }
  while (rest.startsWith('s/')) {
    const sub = rest.match(/^s\/((?:[^/\\]|\\.)*)\/((?:[^/\\]|\\.)*)\/([gims]*)\s*/);
    if (!sub) break;
    try {
      text = text.replace(new RegExp(sub[1], sub[3] || undefined), sub[2].replace(/\\n/g, '\n'));
    } catch {
      onFail?.(`bad s/// transform: ${rest}`);
    }
    rest = rest.slice(sub[0].length);
  }
  if (rest.trim()) onFail?.(`unrecognized transform tail: ${rest}`);
  return text;
}

/**
 * Resolve directives inside a section's content: @includes, &/$ macros,
 * &psalm(n). Missing targets go through fallbacks and are logged; the
 * function NEVER throws for corpus hiccoughs.
 *
 * @param {object} ctx
 *   tree: CorpusTree, prayers: Map, fillLog: FillLog,
 *   filePath: string, sectionName: string, videPath: string|null,
 *   edges: (rel:'INCLUDES'|'EXPANDS', target:string, directive:string)=>void
 * @returns {{text:string, filled:boolean}}
 */
export function resolveContent(content, ctx, depth = 0) {
  if (depth > 6) {
    ctx.fillLog.add({
      file: ctx.filePath, section: ctx.sectionName, directive: '(recursion guard)',
      resolution: 'placeholder', source: null, citation: null, preview: null,
    });
    return { text: content, filled: true };
  }
  let filled = false;
  const out = [];
  for (const rawLine of (content ?? '').split('\n')) {
    const line = rawLine.trimEnd();

    // &psalm(n)
    const pm = line.match(PSALM_MACRO_RE);
    if (pm) {
      const psalm = ctx.tree.psalm(pm[1]);
      if (psalm !== null) {
        out.push(`!Ps ${pm[1]}`);
        out.push(psalm);
        ctx.edges?.('EXPANDS', `Psalterium/Psalmorum/Psalm${pm[1]}`, line);
      } else {
        out.push(`!Ps ${pm[1]}`);
        out.push(`[Psalmus ${pm[1]} — textus deest]`);
        ctx.fillLog.add({
          file: ctx.filePath, section: ctx.sectionName, directive: line,
          resolution: 'placeholder', source: null, citation: `Ps ${pm[1]}`, preview: null,
        });
        filled = true;
      }
      continue;
    }

    // @include
    const inc = line.match(INCLUDE_RE);
    if (inc && line.startsWith('@')) {
      const targetPath = inc[1]?.trim() ? inc[1].trim() : ctx.filePath;
      const wanted = inc[2]?.trim() ? inc[2].trim() : ctx.sectionName;
      const xform = inc[3]?.trim() || null;
      const res = resolveInclude(targetPath, wanted, xform, line, ctx, depth);
      out.push(res.text);
      filled = filled || res.filled;
      continue;
    }

    // &Name / $Name prayer macro
    const mac = line.match(MACRO_RE);
    if (mac && !line.startsWith('!')) {
      const key = normKey(mac[2]);
      const prayer = ctx.prayers.get(key);
      if (prayer !== undefined) {
        const inner = resolveContent(prayer, { ...ctx, sectionName: `${ctx.sectionName}→${mac[2]}` }, depth + 1);
        out.push(inner.text);
        filled = filled || inner.filled;
        ctx.edges?.('EXPANDS', `Prayers#${mac[2].trim()}`, line);
      } else {
        // Unknown macro (engine function like &Deusinadjutorium etc.) — keep
        // the marker as an italic rubric rather than losing information.
        out.push(`![${mac[2].trim()}]`);
        ctx.fillLog.add({
          file: ctx.filePath, section: ctx.sectionName, directive: line,
          resolution: 'kept-as-rubric-marker', source: null, citation: null, preview: null,
        });
      }
      continue;
    }

    out.push(rawLine);
  }
  return { text: out.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\s+$/, ''), filled };
}

/** Resolve one @include with the V0.7 fallback chain. */
function resolveInclude(targetPath, wanted, xform, directive, ctx, depth) {
  const tryPaths = [targetPath];
  // Monastic/Cistercian/OP tree references missing from the snapshot fall
  // back to the Roman-tree equivalent (TemporaM/x → Tempora/x, …).
  const roman = targetPath.replace(/^(Tempora|Sancti|Commune)(M|Cist|OP)\//, '$1/');
  if (roman !== targetPath) tryPaths.push(roman);
  if (ctx.videPath && targetPath !== ctx.videPath) tryPaths.push(ctx.videPath);

  for (const p of tryPaths) {
    const sec = ctx.tree.section(p, wanted);
    if (sec) {
      ctx.edges?.('INCLUDES', `${p}#${wanted}`, directive);
      const inner = resolveContent(sec.content, { ...ctx, filePath: p, sectionName: wanted }, depth + 1);
      const text = applyTransform(inner.text, xform, (why) =>
        ctx.fillLog.add({
          file: ctx.filePath, section: ctx.sectionName, directive,
          resolution: `transform-skipped (${why})`, source: p, citation: null, preview: null,
        }),
      );
      if (p !== targetPath) {
        ctx.fillLog.add({
          file: ctx.filePath, section: ctx.sectionName, directive,
          resolution: 'filled-from-commune', source: `${p}#${wanted}`, citation: firstCitation(text), preview: text,
        });
        return { text, filled: true };
      }
      return { text, filled: inner.filled };
    }
  }

  // Scripture fallback: directive carries a citation we can serve from the
  // vendored Vulgate / Douay-Rheims (see scripts/scripture.mjs).
  if (ctx.scripture) {
    const cit = ctx.scripture.lookupByHint(`${targetPath}#${wanted}`, ctx.tree.lang);
    if (cit) {
      ctx.fillLog.add({
        file: ctx.filePath, section: ctx.sectionName, directive,
        resolution: 'filled-from-scripture', source: cit.source, citation: cit.citation, preview: cit.text,
      });
      return { text: `!${cit.citation}\n${cit.text}`, filled: true };
    }
  }

  // Placeholder — never break generation.
  ctx.fillLog.add({
    file: ctx.filePath, section: ctx.sectionName, directive,
    resolution: 'placeholder', source: null, citation: null, preview: null,
  });
  return { text: `![${wanted} — ${targetPath} (textus deest)]`, filled: true };
}

/** First "!Citation" line of a text, for the fill log. */
export function firstCitation(text) {
  const m = (text ?? '').match(/^!\s*(.+)$/m);
  return m ? m[1].trim() : null;
}
