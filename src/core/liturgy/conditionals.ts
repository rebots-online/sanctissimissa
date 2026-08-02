/**
 * Divinum Officium conditional-line processor — a faithful TypeScript port of
 * DivinumOfficium::SetupString (process_conditional_lines + vero), fixed to
 * rubricSet 1960 ("Rubrics 1960 - 1960").
 *
 * DO data files interleave text with rubric-version conditionals:
 *
 *   ;;Duplex 2 classis;;5.1;;ex C11
 *   (sed rubrica 196)
 *   ;;Duplex 2 classis;;5;;ex C11
 *
 * A "(...)" line evaluates a condition; stopwords (sed/vero/atque/attamen/si/
 * deinde) set its strength, and a scope suffix (dicitur/dicuntur/omittitur/
 * omittuntur, optionally "hic versus"/"hæc versuum"/"semper") sets how many
 * preceding/following lines it governs.
 *
 * Two-phase use:
 *  - INGEST calls with a version-only context: conditions that need runtime
 *    facts (season, weekday, hour…) are left in place verbatim (deferred).
 *  - RUNTIME calls with the full context and resolves what remains.
 */

export interface ConditionContext {
  /** DO version string; we always run "Rubrics 1960 - 1960". */
  version: string;
  /** get_tempus_id value, e.g. "Adventus", "post Pentecosten" (runtime only). */
  tempus?: string;
  /** 1=Sunday … 7=Saturday (DO's `feria` subject; runtime only). */
  feria?: number;
  /** get_dayname_for_condition value (runtime only). */
  die?: string;
  /** 'missam' or the hour name (Laudes, Vespera…; runtime only). */
  ad?: string;
  /** Month 1–12 (runtime only). */
  mense?: number;
  /** Office name, dayname[1] (runtime only). */
  officio?: string;
  /** Commune path (runtime only). */
  commune?: string;
  /** Votive setting; we run 'Hodie' (runtime only). */
  votiva?: string;
}

/** Result of one condition: true/false, or null = undecidable in this context. */
type Verdict = boolean | null;

const STOPWORD_WEIGHTS: Record<string, number> = {
  sed: 1, vero: 1, atque: 2, attamen: 3, si: 0, deinde: 1,
};
const BACKSCOPED = new Set(['sed', 'vero', 'atque', 'attamen']);

const STOPWORDS_RE = /(?:sed|vero|atque|attamen|si|deinde)/i;
// (stopwords)* (condition) (scope)?
const SCOPE_RE =
  /(?:\bloco\s+(?:hu[ij]us\s+versus|horum\s+versuum)\b)?\s*(?:\b(?:(?:dicitur|dicuntur)(?:\s+semper)?|(?:hic\s+versus\s+)?omittitur|(?:h[æa]?e?c\s+versus\s+)?omittuntur|(?:hi\s+versus\s+)?omittuntur)\b)?/i;
const CONDITIONAL_LINE_RE = new RegExp(
  `^\\s*\\(\\s*((?:${STOPWORDS_RE.source}\\b\\s*)*)(.*?)(${SCOPE_RE.source})?\\s*\\)\\s*(.*)$`,
  'i',
);

const Scope = { Null: 0, Line: 1, Chunk: 2, Nest: 3 } as const;
type Scope = (typeof Scope)[keyof typeof Scope];

// ── vero(): condition evaluation ────────────────────────────────────

const PREDICATES: Record<string, (subject: string | number) => boolean> = {
  tridentina: (s) => /Trident/i.test(String(s)),
  monastica: (s) => /Monastic/i.test(String(s)),
  innovata: (s) => /2020 USA|NewCal/i.test(String(s)),
  innovatis: (s) => /2020 USA|NewCal/i.test(String(s)),
  paschali: (s) => /Paschæ|Paschae|Ascensionis|Octava Pentecostes/i.test(String(s)),
  'post septuagesimam': (s) => /Septua|Quadra|Passio/i.test(String(s)),
  prima: (s) => Number(s) === 1,
  secunda: (s) => Number(s) === 2,
  tertia: (s) => Number(s) === 3,
  longior: (s) => Number(s) === 1,
  brevior: (s) => Number(s) === 2,
  'summorum pontificum': (s) => /194[2-9]|195[45]|196/.test(String(s)),
  feriali: (s) => /feria|vigilia/i.test(String(s)),
};

/** Subjects: which context field answers each condition subject. */
function subjectValue(subject: string, ctx: ConditionContext): string | number | undefined {
  switch (subject) {
    case 'rubricis':
    case 'rubrica':
    case 'communi':
      return ctx.version;
    case 'tempore':
      return ctx.tempus;
    case 'feria':
      return ctx.feria;
    case 'die':
      return ctx.die;
    case 'ad':
      return ctx.ad;
    case 'mense':
      return ctx.mense;
    case 'officio':
      return ctx.officio;
    case 'commune':
      return ctx.commune;
    case 'votiva':
      return ctx.votiva;
    case 'missa':
    case 'dioecesis':
    case 'tonus':
    case 'toni':
      return ''; // unsupported planes — never match
    default:
      return undefined; // not a known subject
  }
}

const KNOWN_SUBJECTS = new Set([
  'rubricis', 'rubrica', 'communi', 'tempore', 'feria', 'die', 'ad',
  'mense', 'officio', 'commune', 'votiva', 'missa', 'dioecesis', 'tonus', 'toni',
]);

/**
 * Evaluate a DO condition ("aut" = or over "et"/"nisi" chains).
 * Returns null when any needed subject is absent from the context (deferred).
 */
export function vero(condition: string, ctx: ConditionContext): Verdict {
  const cond = condition.trim();
  if (!cond) return true; // empty condition is true (DO convention)

  let sawDeferred = false;

  alternatives: for (const alt of cond.split(/\baut\b/)) {
    let negation = 0;
    for (const raw of alt.split(/\b(et|nisi)\b/)) {
      if (/^\s*(et|nisi)\s*$/.test(raw)) {
        if (/nisi/.test(raw)) negation = 1;
        continue;
      }
      const clause = raw.trim().replace(/\s+/g, ' ');
      if (!clause) continue;

      let [subject, ...rest] = clause.split(' ');
      let predicate = rest.join(' ');
      if (!predicate) {
        predicate = subject;
        subject = '';
      }
      // Multi-word predicate with implicit subject.
      if (subject && !KNOWN_SUBJECTS.has(subject.toLowerCase())) {
        predicate = `${subject} ${predicate}`;
        subject = '';
      }
      subject ||= 'tempore';

      const value = subjectValue(subject.toLowerCase(), ctx);
      if (value === undefined) {
        // Cannot decide this clause here — the whole condition is deferred.
        sawDeferred = true;
        continue alternatives;
      }

      const named = PREDICATES[predicate.toLowerCase()];
      let hit: boolean;
      if (named) {
        hit = named(value);
      } else {
        let re: RegExp;
        try {
          re = new RegExp(predicate, 'i');
        } catch {
          re = new RegExp(predicate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        }
        hit = re.test(String(value));
      }
      if (!(hit !== Boolean(negation))) continue alternatives; // xor
    }
    return true;
  }
  return sawDeferred ? null : false;
}

// ── process_conditional_lines port ──────────────────────────────────

const BLANK_RE = /^\s*_?\s*$/;

interface Parsed {
  strength: number;
  result: Verdict;
  backscope: Scope;
  forwardscope: Scope;
}

function parseConditional(stopwords: string, condition: string, scope: string, ctx: ConditionContext): Parsed {
  let strength = 0;
  let implicitBackscope = false;
  for (const w of stopwords.toLowerCase().split(/\s+/).filter(Boolean)) {
    strength += STOPWORD_WEIGHTS[w] ?? 0;
    if (BACKSCOPED.has(w)) implicitBackscope = true;
  }
  const result = vero(condition, ctx);

  const backscope: Scope = /versuum|omittuntur/i.test(scope)
    ? Scope.Nest
    : /versus|omittitur/i.test(scope)
      ? Scope.Chunk
      : !/semper/i.test(scope) && implicitBackscope
        ? Scope.Line
        : Scope.Null;

  let forwardscope: Scope;
  if (/omittitur|omittuntur/i.test(scope)) {
    forwardscope = Scope.Null;
  } else if (/dicuntur/i.test(scope)) {
    forwardscope = backscope === Scope.Chunk ? Scope.Chunk : Scope.Nest;
  } else {
    forwardscope = backscope === Scope.Chunk || backscope === Scope.Nest ? Scope.Chunk : Scope.Line;
  }
  return { strength, result, backscope, forwardscope };
}

const Cond = { NotYetAffirmative: 0, Affirmative: 1, DummyFrame: 2 } as const;
type Cond = (typeof Cond)[keyof typeof Cond];

/**
 * Process conditional directives in a block of lines.
 * Deferred conditionals (vero → null) are emitted verbatim with no scope
 * effects so a later pass with a fuller context can finish the job.
 */
export function processConditionalLines(lines: string[], ctx: ConditionContext): string[] {
  const output: string[] = [];
  const stack: [Cond, Scope][] = [[Cond.Affirmative, Scope.Nest]];
  const offsets: number[] = [-1];

  for (const original of lines) {
    let line = original;

    const m = line.match(CONDITIONAL_LINE_RE);
    if (m) {
      const { strength, result, backscope, forwardscope } = parseConditional(m[1] ?? '', m[2] ?? '', m[3] ?? '', ctx);

      if (result === null) {
        // Undecidable here — keep the conditional line for the runtime pass.
        if (stack[stack.length - 1][0] === Cond.Affirmative) output.push(original);
        continue;
      }
      line = m[4] ?? '';

      if (stack[stack.length - 1][0] === Cond.Affirmative || strength >= offsets.length - 1) {
        if (strength >= offsets.length - 1) {
          stack.length = 0;
        } else if (strength >= offsets.length - 1 - (stack.length - 1)) {
          stack.length = offsets.length - 1 - strength;
        }

        let res = result;
        if (res) {
          const fence = offsets.length - 1 >= strength ? offsets[strength] : -1;
          if (backscope === Scope.Line) {
            if (output.length - 1 > fence) output.pop();
          } else if (backscope === Scope.Chunk) {
            while (output.length - 1 > fence && !BLANK_RE.test(output[output.length - 1])) output.pop();
            while (output.length - 1 > fence && BLANK_RE.test(output[output.length - 1])) output.pop();
          } else if (backscope === Scope.Nest) {
            output.length = fence + 1;
          }
        }

        let fscope = forwardscope;
        if (fscope === Scope.Null) {
          fscope = Scope.Nest;
          res = true;
        }
        if (res) {
          for (let i = 0; i <= strength; i++) offsets[i] = output.length - 1;
        }
        while (strength < offsets.length - 1 - (stack.length - 1) - 1) {
          stack.push([Cond.DummyFrame, fscope]);
        }
        stack.push([res ? Cond.Affirmative : Cond.NotYetAffirmative, fscope]);
      }

      if (!line) continue;
    }

    // Escaped lines.
    line = line.replace(/^~/, '');

    if (stack[stack.length - 1][0] === Cond.Affirmative) output.push(line);

    while (
      stack[stack.length - 1][1] === Scope.Line ||
      (stack[stack.length - 1][1] === Scope.Chunk && BLANK_RE.test(line))
    ) {
      do {
        stack.pop();
      } while (stack.length && stack[stack.length - 1][0] === Cond.DummyFrame);
      if (stack.length === 0) stack.push([Cond.Affirmative, Scope.Nest]);
    }
  }
  return output;
}

/** Convenience: run the processor over a text blob. */
export function applyConditionals(text: string, ctx: ConditionContext): string {
  if (!text) return text;
  if (!text.includes('(')) return text;
  return processConditionalLines(text.split('\n'), ctx).join('\n');
}

/** The version string this app is fixed to. */
export const RUBRICS_1960 = 'Rubrics 1960 - 1960';
