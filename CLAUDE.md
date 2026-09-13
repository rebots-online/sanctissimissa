Refresh and follow all conventions in `/home/robin/Admin-Manual`, the global single source of truth.

`AGENTS.md` and `CLAUDE.md` are equivalent entrypoints for this use case and carry identical project-specific guidance.

This checkout is **SanctissiMissa**, the distinct active project after fork commit `009aedd8a9c924848ed8cca65be732a6ffe0c412` (2026-09-04). Its display name is `SanctissiMissa`, artifact/package slug is `sanctissimissa`, and application identifier is `mba.robin.sanctissimissa`. The predecessor is frozen at its known-working state; its names, build paths, deployments, and release instructions are historical, not this project's defaults.

- Project identity and current overview: `README.md`. Architecture and execution contract: `DOCS/ARCHITECTURE.md` and `CHECKLIST.md`.
- Build, corpus provisioning, deployment targets, and credential locations: `/home/robin/Admin-Manual/PROJECTS/BUILD-INSTRUCTIONS-SanctissiMissa.md`; local build details: `DOCS/BUILD.md`.
- Authoritative remote: `origin = https://forgejo.robin.mba/rcheung/sanctissimissa.git`; code mirror: `github = https://github.com/rebots-online/sanctissimissa.git`. Both use Forgejo's LFS endpoint. Root `dist/` is the tracked, durable home for every release artifact; `dist-web/` is disposable web build output. `assets/missal.db` and `VENDORED/divinum-officium/` remain locally provisioned corpus inputs; a fresh clone needs them before building.
- Builds run on native hosts; do not use WSL. CI remains dormant until public release. Read `version.txt` for the current version rather than copying a version from a historical document.
