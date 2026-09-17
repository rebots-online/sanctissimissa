# PROVENANCE — vendored model catalogs (CP.4, operator vendoring regime)

Inc-15 rule: provenance locked BEFORE assimilation; additive; nothing deleted.

| File | Source | Upstream commit | Fetched |
|---|---|---|---|
| `atomic-chat-recommended.json` | https://github.com/rebots-online/atomic-chat-conf (`models/recommended.json`) | `6d8c3a915e0303d1344c150c779f46f15bcb40f6` | 2026-09-17 |
| `atomic-chat-catalog.json.gz` | https://github.com/rebots-online/atomic-chat-model-catalog (`dist/catalog.json.gz`, 3184 entries) | `5f271abbce2589242115bd96f51dd9a230943e7e` | 2026-09-17 |

- These are the operator's own Atomic Chat catalog repositories (rebots-online org).
- The catalog rows carry Hugging Face download URLs and file sizes; the registry
  resolves Atomic Chat recommended/staff-pick names against those rows to produce
  concrete `EngineConfig`s — never hardcoded models (§7.8.5).
- Refresh = re-vendor with the new upstream commit recorded here. The registry
  treats the vendored snapshot as immutable input.
