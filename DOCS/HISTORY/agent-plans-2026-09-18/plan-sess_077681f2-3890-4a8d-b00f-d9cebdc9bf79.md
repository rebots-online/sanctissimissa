# Plan: push first, then fix the three defects (walkthrough obscuring UI, zero feedback, default model)

## Step 0 — Push the 77 stranded commits to GitHub (the very first action, nothing else before it)

Local `master` (6656f646, 2026-09-18) is 77 commits ahead of `origin/master` (remote last seen 2026-09-13). Everything since — v1.55→v1.58 stamps, CP.3/CP.4/CP.7/CP.11/CP.12 engine fixes, REL.1 Surge publication, release-artifact tracking — is unpushed, violating the always-push rule.

1. `git push origin master` (no force, plain fast-forward push).
2. If auth/network fails, fix the credential path (`gh auth status` / credential helper) and retry — the push must land before any other work.
3. Verify: `git status -sb` shows `## master...origin/master` with no "ahead" count, and `git log -1 origin/master` equals local HEAD.
4. From then on: **every completed checklist item = commit + immediate `git push`** (global rule, reconfirmed by you today). No batching, no end-of-session pushes.

## Step 1 — Read-only exploration pass to pin exact files (short, then hands-on)

Locate precisely: the orientation walkthrough component (its full-screen vs bottom-left CSS conditions), the Companion header state machine (READY badge), the generation/download progress plumbing (Tauri events/Channels), global button CSS (presence/absence of :active press states), the model catalog + default-selection logic, and the project's rubric/acceptance-gate files. Findings summarized to you before code changes.

## Step 2 — ARCHITECTURE.md amendment + operator signoff (Architecture Law sequence)

Your three directives are operator decisions, so architecture first:

1. **Orientation walkthrough**: may never obscure the Mass view (the app's USP) or the chat composer; never renders full-screen; default position docked clear of content (top-right); draggable by pointer with position persisted across sessions; clamp inside the window on resize.
2. **Feedback plane**: every button gets visible pressed/active/disabled states; any wait >~300 ms shows a busy indicator; model download, model load, and generation all show progress (percentage where byte/token counts exist; indeterminate spinner + elapsed time otherwise); tokens stream to the reply as decoded; failures show an honest inline error, never silent death.
3. **Default model**: qwen3.5:2b is the universal first-run default on all platforms (desktop native, web WebLLM, Android); no heavier model is ever auto-selected — heavier only by express user choice in the picker/Settings.

Amend ARCHITECTURE.md with these, record your signoff in DOCS/ARCHITECTURE-SIGNOFF.md, commit, **push**.

## Step 3 — Derive CHECKLIST.md tasks, then implement one by one

Self-contained tasks (each naming exact files, strings, and acceptance), roughly:

- **T1 Walkthrough geometry**: remove/override the full-screen branch; default anchored top-right, clear of Mass view and composer; pointer-drag to move; persist position (localStorage key); clamp to window; `Show me`/`Next`/`Continue later` behaviors unchanged.
- **T2 Press feedback**: global button `:hover`/`:active`/`:disabled` states (color shift + subtle transform) for the design-system classes used by orientation buttons and Send; disabled-while-busy where actions are async.
- **T3 Busy/progress plane**: spinner + percentage on download and load (wire existing progress events fully into the header/composer), "Generating… Ns" indicator with streamed partial reply, cancel affordance on generation.
- **T4 Default model**: qwen3.5:2b default in catalog/resolution logic for every platform; audit any VRAM/auto-upgrade heuristic that could pick heavier; status line reflects it on first run.
- **T5 Crash honesty**: surface Rust-side generation failures as an inline error state instead of silent app death where the engine can fail gracefully; add panic-capture to the diagnostics log for post-mortem.

Each task: implement → platform build → its acceptance checks → commit → **push immediately** (Step 0 rule).

## Step 4 — Qualitative verification before declaring success (your explicit requirement)

No "success" claims from green tests alone. Before declaring any success condition:

1. Drive the real app (Xvfb desktop run + web build), capturing screenshots: fresh-profile first run shows walkthrough top-right (Mass fully visible, composer unobstructed), drag it to a new position and verify persistence, click each orientation button and capture the pressed/busy states, verify spinner/percentage during a Prepare, verify the "Selected: Qwen 3.5 2B · recommended" default on a fresh profile.
2. Run the project's rubric gates found in Step 1 and record results.
3. Have the rendered screenshots judged against the request (visual acceptance pass) — fix and re-verify anything that fails.
4. Only then: release stamp per release train, push everything, and surge cutover per the rubric-gated incremental-ship rule.

Failure at any point is reported honestly with the evidence; verification artifacts (screenshots, rubric results) land in the repo with the final push.