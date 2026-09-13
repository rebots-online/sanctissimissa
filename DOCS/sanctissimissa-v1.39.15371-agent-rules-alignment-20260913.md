# SanctissiMissa v1.39.15371 — agent-rule alignment record

Original audit: 2026-09-13 UTC on native Linux `asrock`. Identity and workflow
corrections below recorded during v1.40.21223 documentation work the same day.
This is an audit trail, not a replacement for the current agent entrypoints.

## Original scope and evidence

The original request targeted the checkout's `AGENTS.md`, using
`/home/robin/.agents/skills/repo-rules-align/SKILL.md`. Admin-Manual baselines
were local `aedebb2` and HTTPS-fetched Forgejo `cf1056d`. Tracked `CLAUDE.md`
was identified as a parallel rule surface but was outside that original edit.

Git metadata established that fork checkpoint `009aedd8` deliberately excluded
large corpus/release material and, at that point, configured only a GitHub
`origin`. The historical `/home/robin/github/StAndroidsMissal` checkout was absent
on this workstation. These were snapshot facts, not permanent storage or remote
policy. SanctissiMissa is a distinct active fork; StAndroidsMissal is frozen.

The audit corrected stale runtime paths, clone-count assumptions, corpus and
artifact tracking claims, and deployment routing. It retained local port 5173,
one stamp per complete manual release, dormant CI, and application design facts.
CC13 and the explicit user instruction established HTTPS transport for Forgejo.
The missing inventory entry was published through the skill's I-24 exception as
`282b629`; the later fork correction separates the two product identities.

## CodeGraph correction

The original report treated the absence of an initialized graph as sufficient
reason to continue a document audit without initialization. **That was a
workflow failure, not an approved docs-only bypass.** A missing or uninitialized
CodeGraph requires `codegraph init -i`, then graph use before code navigation.

CodeGraph has since been initialized and used. This correction checked its
healthy 139-file / 1,701-node status and ran `codegraph node README.md`, which
returned no symbol. Markdown is outside the indexed language coverage, so the
explicitly identified gap justifies targeted documentation reads and Git-history
checks. It does not justify avoiding initialization or application-code queries.
CodeGraph queries also inspected the version stamper, artifact collector, and
application storage identity. Those implementation facts informed the fork
correction; a documentation label did not exempt this task from graph use.
No application build is claimed by this documentation verification.

## Later authority and identity changes

The original audit proposed changes to global SSH guidance, runtime routes,
legacy file-index instructions, donor ownership and shared policy; it did not
apply those proposals. Later explicit user instructions authorized a separate
Admin-Manual task to reconcile global rules. The old proposal table and its
fixed project/global precedence assumptions are not current instructions.

Current authority routing is defined centrally in
`/home/robin/Admin-Manual/DOCS/SPEC_CONVENTIONS/semantic-names-single-source-of-truth.md#global-agent-entrypoints-and-net-of-all-judgment`.
AGENTS.md and CLAUDE.md are equivalent entrypoints for the same workflow. Their
current contents and the central convention govern; this historical report does
not choose a winner between them.

The active identity is SanctissiMissa, slug `sanctissimissa`, identifier
`mba.robin.sanctissimissa`. The current FI contract, `BUILD_INSTRUCTIONS.md` and
`/home/robin/Admin-Manual/PROJECTS/BUILD-INSTRUCTIONS-SanctissiMissa.md` govern
its remotes, required Forgejo-LFS release storage and deployment. The former
source-only release exception is superseded by the restored tracked `dist/`
requirement; corpus provisioning remains a separate concern.

## Verification and preservation

The original audit checked all 16 cited Admin-Manual routes, remote names,
source-only history and tracked/ignored asset metadata. Its earlier line-number
references describe the then-edited file, not today's rewritten entrypoints.
Global managed blocks were not hand-edited by that audit. Concurrent optional-
glass work and unrelated `.v2c/` and `.video_agent/` directories were preserved.

Current retained pre-correction evidence uses SanctissiMissa paths:

- Inventory snapshot:
  `/home/robin/Admin-Manual/.staging/sanctissimissa-v1.39.15371-app-inventory-before-enrollment-20260913T031644Z.md`.
- Documentation snapshot:
  `/home/robin/Admin-Manual/.staging/sanctissimissa-v1.40.21223-doc-identity-before-20260913T051155Z/`.

The snapshots preserve what was inspected before correction; current guidance
and this report use the active fork's identity.

Documentation verification checks current links, exact identity references,
whitespace and fork ancestry. It does not claim a rebuilt or newly deployed app.
