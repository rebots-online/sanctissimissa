ONLY AND ALWAYS comply with `~/Admin-Manual/` — save for project-scoped, previously-discussed exceptions enumerated in this CLAUDE.md.

## THE ARCHITECTURE LAW (read before anything else)

**ARCHITECTURE.md = SNAPSHOT of the finished product. CHECKLIST.md = RECIPE to make the snapshot real.**

- The program already exists, fully defined, in ARCHITECTURE.md before any code is written: every component, entity, enumeration (closed sets), relationship, workflow, screen, string, data format, algorithm, and build step. No undefined portions, no unarchitected portions, nothing "resolved later during coding," and no separate planning documents — the workflows are part of ARCHITECTURE.md itself.
- Nothing that is not in ARCHITECTURE.md may exist in CHECKLIST.md. Nothing that is not in CHECKLIST.md may be coded.
- Every CHECKLIST.md task is fully self-contained — no other task is needed to code any task — and checklist items cannot be terse: a task is as long as it must be, one full page if it needs to be, naming exact files, entities, names, formulas, strings, and acceptance.
- A 1,000-task checklist can be executed in one pass by 1,000 agents in parallel, or 500 agents in two passes. Parallelization is not about saving time — it is about forcing success: if coding a task would require asking, deciding, exploring, or improvising anything, the planning has already failed. The checklist is the last metre of the marathon.
- Failing to plan is planning to fail. If you don't know how you will finish the story, do not begin writing it. Every question asked during coding wastes all the time already spent planning.
- Only an operator decision changes the architecture. A "major change" discovered during implementation means the architecture was done wrong.

## THE AMENDMENT-SEQUENCE GATE (operator directive 2026-09-17 — binding, no exceptions)

Any architecture change executes in this order, and **the order is a hard gate, not a preference**:

1. **Amend `DOCS/ARCHITECTURE.md` FIRST** — and nothing else. No CHECKLIST edit, no code, no vendoring, no build, in the same change.
2. **STOP. Present the amendment to the operator and WAIT for explicit signoff.** An instruction to "rearchitect X → CHECKLIST" authorizes the work; it NEVER authorizes skipping this gate. Signoff is recorded in `DOCS/ARCHITECTURE-SIGNOFF.md` (architecture SHA-256 + date + operator line) before anything else moves.
3. **Only then derive/re-derive `CHECKLIST.md`** 1:1 from the signed architecture.
4. **Only then code** — and only checklist tasks that cite the signed architecture version.

Violations of this sequence — however productive the outcome, however urgent the request, however combined the directive — are defects in themselves. "The operator asked for both in one breath" is NOT an exemption: pause at step 2 regardless, and say so. Enforcement is machine-checked (pre-commit hook + release-driver gate validating the signoff ledger); those checks fail closed and exist because prose alone already failed once (2026-09-17: CHECKLIST re-derived and code shipped before signoff).

Authority order: `~/Admin-Manual/` is the organization-wide single source of truth (its index
is `MANUAL.md`); this file is the project layer — where it is silent, the manual governs.
Rules are cited by code with their operative clause inlined; full text lives in the manual:
