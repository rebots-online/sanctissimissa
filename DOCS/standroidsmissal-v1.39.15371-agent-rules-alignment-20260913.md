# StAndroidsMissal v1.39.15371 — agent-rule alignment

Verified 2026-09-13 UTC on native Linux `asrock`.

The default target is this checkout's `AGENTS.md`. It now routes shared doctrine
to Admin-Manual and describes the source-only checkout accurately. Global Codex
rules and shared doctrine changes are proposals for discussion, not applied edits.

## Authority and scope

- Target: `/home/robin/Desktop/devProjects/sanctissimissa/AGENTS.md`.
- Admin-Manual: `/home/robin/Admin-Manual`, local baseline `aedebb2`;
  authoritative Forgejo baseline fetched over HTTPS: `cf1056d`.
- Alignment procedure: `/home/robin/.agents/skills/repo-rules-align/SKILL.md`.
- Rule inventory: root `AGENTS.md` (untracked full project rules before this task)
  and tracked `CLAUDE.md` (parallel full rules). No additional project-owned rule
  files were found. Third-party/tool-output trees were excluded from this scope.
- Project history `009aedd8` deliberately created a source-only checkpoint.
  Current metadata, rather than an older sibling checkout description, establishes
  which remotes and assets exist here.
- No current CodeGraph index or PROJECT_INDEX was available. This was a rule and
  document audit using Git/file metadata; application source was not inspected.
- The only authorized cross-repository content change is the skill's I-24
  enrollment exception: the missing app inventory entry, published as `282b629`.

## Findings and disposition

Line numbers below refer to the corrected project file or the unchanged external
file as indicated. The complete original project file is preserved in the backup.

| Topic | Class | Evidence / divergence | Disposition |
|---|---|---|---|
| Ideology gate | Missing gate | Original project file omitted the ideology index; Admin-Manual IDEOLOGIES.md requires it before architecture | Added doctrine gate and SC/TC/CC/incident routes in AGENTS.md:5 |
| Rule authority | Contradiction: accidental drift | Original global route said “never override”; recreation spine says project specifics win where applicable | Corrected precedence and specific-convention resolution in AGENTS.md:14 |
| Runtime paths | Stale fact | All three original `~/.Codex/` paths are absent; directory casing matters on this host | Replaced with existing Admin-Manual routes in AGENTS.md:40 |
| Build host / clone count | Stale fact | Runbook has no “Build host” heading; historic checkout is absent on this workstation | Retained no-WSL requirement; recorded current checkout and routed actual deployment sections in AGENTS.md:28 |
| Forgejo transport | Contradiction: accidental drift | Global AGENTS.md:238 and shared summaries say SSH; CC13:8 explicitly says v15 HTTPS-only | Project now uses CC13 and HTTPS as primary Forgejo push transport, AGENTS.md:122; global correction proposed |
| Remote names / outage | Stale fact | This checkout has only `origin` pointing to GitHub over HTTPS; old text describes three remotes and an outage | Corrected current metadata; preserved deliberate source-only migration; no remote reconfiguration |
| Corpus tracking | Stale fact | `assets/missal.db` and `VENDORED/divinum-officium` exist but have zero tracked files; .gitignore and migration commit establish exclusion | Removed claims that the database is committed or a clone alone supplies it, AGENTS.md:85 |
| Other vendored inputs | Local fact | Excluding Divinum Officium does not exclude every VENDORED subtree | Preserved other input paths; no broad claim that all VENDORED is untracked |
| Artifact storage | Stale fact | `dist/` exists but is gitignored, not an LFS-backed tracked tree in this checkout | Corrected storage claim, AGENTS.md:121; no artifact migration |
| Artifact handling | Contradiction: accidental drift | Original project text says “moved”; CC12 explicitly requires copying with source preserved | Routed CC12 and corrected to copy into the common outbox |
| Repeated doctrine | Restatement | Build, naming, scratch, acceptance, transport, and handback policy belong in shared doctrine | Added absolute named routes with load triggers; kept project-specific commands and behavior |
| Local runtime design | Local fact | Port 5173 is tied to Tauri devUrl; global floor prefers high ports | Preserved port; changing it is a design decision, not a documentation correction |
| Local release cadence | Local fact | Project stamp runs once at the start of a complete manual release; shared CC2 describes CI invocations | Preserved project cadence and dormant CI; no build or stamp run |
| Filename scope | Local fact | Project applies stamped naming to all authored artifacts; CC12 text primarily describes build artifacts | Preserved the stricter project instruction; fixed conventional rule filenames remain existing runtime entrypoints |
| Application architecture | Local fact | Product, corpus flow, query-layer parity, calendar, Commune precedence, Latin, embeddings, concepts, UI, and gotchas | Preserved project design statements; no new architecture adoption or behavioral attestation |
| Parallel CLAUDE.md | Stale fact | It retains the old paths, remote names, tracking claims, and missing ideology gate | Surfaced; not rewritten because the requested file was AGENTS.md |
| Inventory enrollment | Missing gate | No SanctissiMissa/StAndroidsMissal entry existed in either Admin-Manual baseline | Added only verified facts through the skill's I-24 exception; commit `282b629` on Forgejo |

## Required global changes — for discussion

The current session's explicit HTTPS instruction and CC13 already settle push
transport. These proposals make other instruction surfaces express that policy.
The policy itself does not need another decision.

| External surface | Divergence | Proposed resolution |
|---|---|---|
| `/home/robin/.codex/AGENTS.md:238` | SSH-only instruction targets the old Forgejo instance | Make configured HTTPS origin the primary v15 push method; route CC13 |
| Global AGENTS.md:223 | Legacy Forgejo container is presented as current | Label legacy instance and add documented v15 identity; documentary fact, not a fresh fleet-health assertion |
| Global AGENTS.md:17 | Ideology/spec/tooling gates missing | Add compact absolute-path routes |
| Global AGENTS.md:42 and :61 | Recovered narrative appears above current local contracts | Describe sesh as recovery procedure; local contract and Git state remain authoritative |
| Global AGENTS.md:25 | Admin staging is suggested for all project work | Separate project-owned artifacts from the runtime-sync staging exception |
| Global AGENTS.md:185 | Pieces MCP first, SQLite fallback | Route current TC2 direct-SQLite-first procedure; retain orchestrator-only gate |
| Global AGENTS.md:93 and :108 | PROJECT_INDEX is exclusive map surface | Route TC8's CodeGraph policy; do not regenerate a graph as an alignment side effect |
| Admin recreation spine:198, :227; INFRASTRUCTURE.md:184 | Shared summaries still prescribe old SSH endpoint | Correct v15 transport/current authority, preserving historical migration records |
| TOOLING_CONVENTIONS.md:20; commit-and-push-every-task-and-handback.md:87, :128; PRD_TEMPLATE.md:40 | Active policy/index/template still suggest SSH | Replace current guidance with configured HTTPS and CC13 |
| Baked CI images:162; release manifest example:72 | Historical commands/examples name old SSH repositories | Mark historical or verify exact modern repo identities before changing examples |
| Alignment skill ssot-map.md:8 | Old Admin repository identity conflicts with the skill's own correct target | Update canonical reference and propagate through its deployment script |
| Recreation spine:148, :241 | Present-tense sesh absence claim derives from July 10 inventory | Label that inventory historical; current shared sesh file exists |
| Global donor policy versus managed sesh block | Claude donor files described as non-authoritative, but deploy-sesh.sh takes canonical input from ~/.claude/skills/sesh | Decide canonical ownership migration centrally; preserve managed blocks |
| Local Admin-Manual versus Forgejo | Local I2 v0.2, TC6, and recreation rule 13 permit autonomous completion after sign-off; Forgejo cf1056d still contains older halt/escalate policy | Review and publish the intended policy explicitly. This alignment does not silently publish or choose between those edits |
| CC12 index versus detail | CICD_CONVENTIONS.md:50 still says stale artifacts are deleted; CC12 detail requires copying with sources preserved | Correct the index summary to match the amended detail |

The exact proposed unified diff for definite external drift is retained locally:
`/home/robin/Desktop/devProjects/sanctissimissa/.tmp/standroidsmissal-v1.39.15371-agent-rules-alignment-20260913/standroidsmissal-v1.39.15371-global-rules-proposed-20260913.patch`.
It is not applied. Detailed global topology remains outside this source-only
repository's published files. Canonical ownership changes and the unpublished I2
policy require a decision; the table states that decision rather than inventing it.

## Backup, verification, and preservation

Original AGENTS snapshot:
`/home/robin/Desktop/devProjects/sanctissimissa/.tmp/standroidsmissal-v1.39.15371-agent-rules-alignment-20260913/standroidsmissal-v1.39.15371-AGENTS-before-alignment-20260913.md`.

Inventory snapshot:
`/home/robin/Admin-Manual/.staging/standroidsmissal-v1.39.15371-app-inventory-before-enrollment-20260913T031644Z.md`.

Verified all 16 cited Admin-Manual paths exist; inspected the full edited file;
checked remote names, source-only migration history, and tracked/ignored asset
metadata. Application tests and builds were not needed for this instruction-only
change. Project AGENTS.md contains no managed marker blocks. Global managed blocks
were not edited.

Concurrent optional-glass work was present when the task began and committed by
its owner during the audit. Unrelated `.v2c/` and `.video_agent/` directories were
preserved. Only this task's AGENTS.md and this report are eligible for the project
commit. No sibling checkout, deployment, remote configuration, or artifact was
modified by the alignment.
