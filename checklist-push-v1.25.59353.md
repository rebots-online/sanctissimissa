# Checklist — Push v1.25.59353 to remotes

States: `[ ]` not started · `[/]` in progress · `[X]` implemented · ✅ verified by running code

## Applicable conventions (adapted from ~/Admin-Manual/)

- **CC13 — Forgejo-authoritative remotes**: `origin` = Forgejo (LFS store), `github` = code-only mirror. Push `origin` first, `github` second. Never GitHub LFS.
- **CC13 — Auth**: HTTPS-only (no SSH on `$FORGEJO_URL`). Auth is `rcheung:<token>` via `~/.git-credentials`. Token in `~/Admin-Manual/CREDENTIALS/forgejo-robin-mba-v15.md`.
- **CC13 — .lfsconfig**: Was committed at repo root, pointing LFS to `$FORGEJO_URL/rcheung/StAndroidsMissal.git/info/lfs`. Preserved as `.lfsconfig.forgejo-backup` in the checkpoint repo.
- **CC13 — remote.github.lfsurl**: Was set to Forgejo LFS URL so `git push github` resolved LFS against Forgejo, never uploaded to GitHub.
- **CC17 — Evidentiary support**: Verify each step with command output. Don't claim "pushed" without evidence.
- **CC18 — Follow the checklist**: Execute step by step, don't ad-hoc.

## Pre-flight
- ✅ **P.1** Verify remote configuration: `origin` = Forgejo, `github` = GitHub
  Evidence: `git remote -v` → origin=$FORGEJO_URL, github=github.com ✓
- ✅ **P.2** Verify `.lfsconfig` exists and points to Forgejo LFS
  Evidence: `cat .lfsconfig.forgejo-backup` → `[lfs] url = $FORGEJO_URL/rcheung/StAndroidsMissal.git/info/lfs` ✓
- ✅ **P.3** Verify `remote.github.lfsurl` is set to Forgejo
  Evidence: `git config --get remote.github.lfsurl` → `$FORGEJO_URL/rcheung/StAndroidsMissal.git/info/lfs` ✓
- ✅ **P.4** Set up `~/.git-credentials` with Forgejo token from credential file
  Evidence: `~/.git-credentials` written with token from `~/Admin-Manual/CREDENTIALS/forgejo-robin-mba-v15.md` ✓
- ✅ **P.5** Verify token works against Forgejo API
  Evidence: `curl -s -H "Authorization: token <token>" /api/v1/user` → `{"id":1,"login":"rcheung","is_admin":true}` ✓
- ✅ **P.6** Verify git-lfs is on PATH
  Evidence: `/home/robin/.local/bin/git-lfs version` → `git-lfs/3.5.1` ✓

## Push — Forgejo (origin) first (CC13)
- ✅ **F.1** Push master to origin (Forgejo) — LFS objects upload to Forgejo
  Evidence: `git push origin master` → `Everything up-to-date` (objects already uploaded by prior attempts) ✓
- ✅ **F.2** Verify push succeeded with evidence
  Evidence: `git rev-parse origin/master` = `git rev-parse master` = `365561e6` ✓

## Push — GitHub (github) second (CC13)
- ✅ **G.1** Push master to github — commits + LFS pointers only (LFS objects go to Forgejo via lfsurl)
  Evidence: `git push github master` → `c271e40e..365561e6 master -> master`; LFS objects uploaded to Forgejo via lfsurl override ✓
- ✅ **G.2** Verify push succeeded with evidence
  Evidence: `git rev-parse github/master` = `365561e6` = `git rev-parse master` ✓

## Verify
- ✅ **V.1** Both remotes at same commit as local master
  Evidence: `git rev-parse master origin/master github/master` → all three = `365561e6ae8b81063e0aa9d36502d5476915128b` ✓
- ✅ **V.2** GitHub does NOT have LFS objects (only pointers)
  Evidence: `curl -s raw.githubusercontent.com/.../assets/missal.db | head -3` → 3-line LFS pointer (version/oid/size), not binary ✓
