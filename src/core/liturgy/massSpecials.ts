/**
 * Mass specials — DO-faithful port of missa/propers.pl `specials()` control
 * lines (`!*…`, `!&hook`) applied at read time with day + solemn context.
 *
 * Control lines never appear in output. When a skip flag/hook is true, lines
 * until the next blank line are omitted (DO behaviour).
 */

import type { DayInfo } from '../data/types.ts';

export interface MassSpecialsContext {
  /** Low Mass default; Solemn Mass when true (drives !*S / !*R / CheckPax). */
  solemn: boolean;
  /** Requiem / Mass of the Dead (Defunct|C9). */
  requiem: boolean;
  /** Passiontide: Quad5 or Quad6 Mon–Fri when temporal winner (DeTemporePassionis). */
  passiontide: boolean;
  /** Sunday (dayofweek == 0) — Credo/Gloria heuristics. */
  sunday: boolean;
  /** Winner path e.g. Sancti/… Tempora/… */
  winnerPath: string;
  /** Rank number when known (Credo ≥5 sanctoral). */
  rank: number;
  /** Rule blob from feast file when available (omit Gloria / no Credo / …). */
  rule: string;
  /** Season name for Advent/Lent/Paschaltide Gloria heuristics. */
  season: string;
  /** weekKey from DayInfo for Quad/Adv/Pasc checks. */
  weekKey: string;
}

export function isRequiemDay(day: DayInfo): boolean {
  const blob = [
    day.winner?.key ?? '',
    day.winner?.title ?? '',
    day.feastName ?? '',
    day.temporaPath ?? '',
  ].join(' ');
  return /Defunct|C9|Requiem|Dead|Defunctorum/i.test(blob);
}

/** DO DeTemporePassionis: Quad5 or Quad6 before Saturday, temporal winner. */
export function isPassiontideDay(day: DayInfo): boolean {
  const wk = day.weekKey ?? '';
  const path = day.winner?.key ?? day.temporaPath ?? '';
  const temporal = /Tempora/i.test(path) || !/Sancti\//i.test(path);
  if (!temporal) return false;
  if (/Quad5/i.test(wk) || /Quadp?5/i.test(path)) return true;
  if (/Quad6/i.test(wk) || /Quadp?6/i.test(path)) {
    const d = (day.weekday ?? '').toLowerCase();
    return d !== 'saturday' && d !== 'sabbato';
  }
  return false;
}

export function massSpecialsContextFromDay(
  day: DayInfo,
  opts: { solemn?: boolean; rule?: string } = {},
): MassSpecialsContext {
  const weekday = (day.weekday ?? '').toLowerCase();
  const sunday = weekday === 'sunday' || weekday === 'dominica';
  return {
    solemn: opts.solemn ?? false,
    requiem: isRequiemDay(day),
    passiontide: isPassiontideDay(day),
    sunday,
    winnerPath: day.winner?.key ?? day.temporaPath ?? '',
    rank: day.rank ?? 0,
    rule: opts.rule ?? '',
    season: String(day.season ?? ''),
    weekKey: day.weekKey ?? '',
  };
}

/** true → omit Gloria (DO gloriflag). */
function gloriaOmit(ctx: MassSpecialsContext): boolean {
  let flag = true;
  if (ctx.sunday) flag = false;
  if (/no Gloria/i.test(ctx.rule)) flag = true;
  else if (/\bGloria\b/i.test(ctx.rule) && !/no Gloria/i.test(ctx.rule)) flag = false;
  else if (ctx.requiem) flag = true;
  else if (/Sancti\//i.test(ctx.winnerPath)) flag = false;
  else if (/Advent|Lent/i.test(ctx.season) || /Adv|Quad/i.test(ctx.weekKey)) flag = true;
  else if (/Paschal/i.test(ctx.season) || /Pasc/i.test(ctx.weekKey)) flag = false;
  return flag;
}

/** true → omit Credo. */
function credoOmit(ctx: MassSpecialsContext): boolean {
  let flag = true;
  if (
    ctx.sunday ||
    (ctx.rank >= 5 && /Sancti\//i.test(ctx.winnerPath) && !/Vigil/i.test(ctx.rule + ctx.winnerPath)) ||
    (/Octav/i.test(ctx.winnerPath + ctx.rule) && !/post Octavam|Simplex/i.test(ctx.winnerPath + ctx.rule))
  ) {
    flag = false;
  }
  if (/no Credo/i.test(ctx.rule)) flag = true;
  else if (/\bCredo\b/i.test(ctx.rule) && !/no Credo/i.test(ctx.rule)) flag = false;
  if (ctx.requiem) flag = true;
  return flag;
}

const HOOKS: Record<string, (ctx: MassSpecialsContext) => boolean> = {
  Introibo: (ctx) => ctx.requiem || ctx.passiontide,
  GloriaM: (ctx) => gloriaOmit(ctx),
  Credo: (ctx) => credoOmit(ctx),
  placeattibi: () => false,
  CheckQuiDixisti: (ctx) => ctx.requiem || /no Qui Dixisti/i.test(ctx.rule),
  CheckPax: (ctx) => !ctx.solemn || ctx.requiem || /no Pax/i.test(ctx.rule),
  CheckBlessing: (ctx) => ctx.requiem || /no Benedictio/i.test(ctx.rule),
  CheckUltimaEv: (ctx) => /no Ultima Evangelium/i.test(ctx.rule),
};

function hookByName(name: string): ((ctx: MassSpecialsContext) => boolean) | undefined {
  const key = Object.keys(HOOKS).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? HOOKS[key] : undefined;
}

function evalSkipControl(line: string, ctx: MassSpecialsContext): boolean {
  let skip = false;
  const hookM = line.match(/!\*\&([A-Za-z]+)/);
  if (hookM) {
    const fn = hookByName(hookM[1]);
    if (fn) skip = fn(ctx);
  }
  if (/!\*[A-Z]*nD/i.test(line) && ctx.requiem) skip = true;
  if (/!\*S/i.test(line) && !ctx.solemn) skip = true;
  if (/!\*R/i.test(line) && ctx.solemn) skip = true;
  if (/!\*D/i.test(line) && !/!\*[A-Z]*nD/i.test(line) && !ctx.requiem) skip = true;
  return skip;
}

/**
 * Apply DO mass specials to one language's section text.
 * Returns text with control lines removed and skip-blocks omitted.
 */
export function applyMassSpecials(text: string | null | undefined, ctx: MassSpecialsContext): string {
  if (!text) return text ?? '';
  const lines = text.split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const item = lines[i];
    i += 1;

    if (/^\s*!&[A-Za-z]+\s*$/.test(item)) {
      continue;
    }

    if (/^\s*!\*/.test(item)) {
      const skip = evalSkipControl(item, ctx);
      if (skip) {
        while (i < lines.length && !/^\s*$/.test(lines[i])) i += 1;
        continue;
      }
      continue;
    }

    out.push(item);
  }
  return out.join('\n');
}

/**
 * Apply specials to Latin and English in lockstep: skip decisions from Latin
 * control lines; English drops the same line-index ranges.
 */
export function applyMassSpecialsBilingual(
  latin: string | null | undefined,
  english: string | null | undefined,
  ctx: MassSpecialsContext,
): { latin: string; english: string } {
  const la = latin ?? '';
  const en = english ?? '';
  const laLines = la.split('\n');
  const enLines = en.split('\n');
  const keep = new Array(Math.max(laLines.length, 1)).fill(true);

  let i = 0;
  while (i < laLines.length) {
    const item = laLines[i];
    if (/^\s*!&[A-Za-z]+\s*$/.test(item) || /^\s*!\*/.test(item)) {
      keep[i] = false;
      let skip = false;
      if (/^\s*!\*/.test(item)) skip = evalSkipControl(item, ctx);
      if (skip) {
        i += 1;
        while (i < laLines.length && !/^\s*$/.test(laLines[i])) {
          keep[i] = false;
          i += 1;
        }
        continue;
      }
      i += 1;
      continue;
    }
    i += 1;
  }

  const outLa: string[] = [];
  const outEn: string[] = [];
  for (let j = 0; j < laLines.length; j++) {
    if (!keep[j]) continue;
    outLa.push(laLines[j]);
    outEn.push(j < enLines.length ? enLines[j] : '');
  }
  if (enLines.length > laLines.length) {
    for (let j = laLines.length; j < enLines.length; j++) outEn.push(enLines[j]);
  }
  return { latin: outLa.join('\n'), english: outEn.join('\n') };
}

/** True if a display line is a DO specials control (must never show). */
export function isSpecialsControlLine(line: string): boolean {
  return /^\s*!\*/.test(line) || /^\s*!&[A-Za-z]+\s*$/.test(line);
}

/** Scripture-shaped citation after leading ! (Ps., book+chapter). */
export function isScriptureCitationLine(line: string): boolean {
  if (!line.startsWith('!')) return false;
  if (isSpecialsControlLine(line)) return false;
  const body = line.slice(1).trim();
  return (
    /^(Ps\.?|Psalm|Psalmus|Matt|Marc|Luc|Ioan|John|Gen|Exod|Isa|Jer|Act|Rom|Cor|Gal|Eph|Phil|Col|Thess|Tim|Heb|Apoc|Apoc\.|Ap\.|Apocalypsis)\b/i.test(
      body,
    ) || /\d+[,:]\s*\d/.test(body)
  );
}
