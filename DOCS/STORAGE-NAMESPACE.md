# Storage namespace & the common-storage plane

**Decision 22 contract** (operator, 2026-09-09). Org-wide convention:
`~/Admin-Manual/DOCS/TOOLING_CONVENTIONS/org-namespace-storage.md`.

## Purpose

Sibling apps in the `mba.robin` family must not each download and store their
own copy of large shared resources — LLM model weights (the Companion's
on-device engine, §7.6) and corpus/module caches (decision 19's versioned
downloads). One org-wide root holds them once; a `.env` toggle opts an app
out where sharing is impossible.

**Why the fallback exists (operator, 2026-09-09):** Google's response to
abuse — Play Store sandboxing and per-developer-account restrictions —
degrades capability on devices we own, in ways that do not exist on F-Droid
or sideload distribution. An `app`-scoped namespace that cannot share
(because a store's rules or a joint-production-key requirement stand in the
way) must degrade cleanly, not break; the toggle exists so such namespaces
need no code change.

## The `.env` contract

| Key | Default | Meaning |
|---|---|---|
| `VITE_APP_NAMESPACE` | `mba.robin.sanctissimissa` | the app's identifier family; must match `src-tauri/tauri.conf.json` `identifier` |
| `VITE_STORAGE_SCOPE` | `common` | `common` → org-shared root `mba.robin`; `app` → app-private `<VITE_APP_NAMESPACE>` |

Copy `.env.example` → `.env` (gitignored) to override the storage scope. This
contract governs the distinct SanctissiMissa fork. StAndroidsMissal is frozen;
its historical namespace is not the active application identity.

## Resolution

**BUILD-TIME choice, not runtime discretion.** `vite.config.ts` reads `.env`
when the bundle is built and freezes the pair into literals via `define`
(`__SAM_BUILD_STORAGE__`); `src/core/storage/root.ts` derives everything from
that constant. Nothing at runtime can flip the scope — only the platform's
structural capability caps it, and those caps are compile-time facts in the
platform layers (web origin-scoping; Rust `cfg!(mobile)`).

```
orgNamespace()  = first two labels of appNamespace()        → 'mba.robin'
storageRootName() = scope === 'common' ? orgNamespace() : appNamespace()
```

The storage root is **requested**, and the platform layer degrades where
sharing is impossible:

| Platform | Storage reality | Effective scope |
|---|---|---|
| Desktop (Linux/Windows/macOS) | sibling dirs of the app data dir (`~/.local/share/mba.robin` ⋯) | toggle honored (`common` shares the org root with all sibling apps) |
| Web / PWA | origin-scoped (IndexedDB/OPFS); no cross-origin sharing exists | always app-private |
| Android / iOS | sandboxed app dirs; cross-app storage needs joint production keys | always app-private |

## Sidecar integration (first consumer)

`load_sidecar(scopeDir?)` / `save_sidecar(bytes, scopeDir?)`
(`src-tauri/src/lib.rs`) resolve `<parent(app_data_dir)>/<scopeDir>` on
desktop when `scopeDir` differs from the app identifier; mobile ignores it
(sandbox). `SidecarDb` passes `storageRootName()` at both invoke sites.
**Legacy fallback:** existing installs keep reading a sidecar sitting
directly in the app data dir until the next save adopts the namespaced path —
no data movement, nothing deleted.

## Future consumers (same contract, no new keys)

- Companion `OnDeviceEngine` model weights (§7.6): store under the resolved
  root so HelloWord / EnZIME / SanctissiMissa share one Gemma download.
- Decision-19 module downloads: the versioned module cache lives under
  `<root>/modules/<module-id>/v<version>/`.
