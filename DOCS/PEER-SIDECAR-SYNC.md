# Peer sidecar sync — DHT-primary, operator-free multi-device user data

**Status:** design (pre-architecture entity table for mesh code).  
**Origin product:** St. Android's Missal (`mba.robin.standroidsmissal`).  
**Admin-Manual:** `DOCS/CONCEPTS/peer-sidecar-sync.md` (portable).  
**Related:** stream-DHT, decent-network matchmaking, BILLING_CONVENTIONS, ARCHITECTURE §7.6 sidecar.

**Thesis:** Journal, homily, study notes, lore, and settings sync across the user’s devices by **peers finding each other** (DHT / libp2p-class discovery), exchanging **encrypted sidecar deltas**. No monopolist cloud holds content. Billing (RevenueCat et al.) may help **who is this subscriber** — never **what did they write**.

## Non-goals

- No operator-run content sync server as primary path.
- No RC/Stripe/Play payload contains `body_pm`, `body_html`, quotes, lore, or parish text.
- No email magic-link session we implement.

## Invariants

| ID | Rule |
| --- | --- |
| S-1 | Content plane ≠ money plane |
| S-2 | No us-in-the-middle on bodies (ciphertext-only relays) |
| S-3 | Sidecar LWW-friendly: `id`, `device_id`, `updated_at`, `deleted_at` |
| S-4 | Deterministic merge |
| S-5 | UX hides the mesh |
| S-6 | Portable module for other local-first apps |

## Data unit

Entire sidecar user plane: accompaniments, occurrences, lore, settings (careful device-local keys), parish_profile, reading_progress. Rebuild `sidecar_embeddings` after merge.

## Discovery (primary)

1. Device keypair + sync circle of authorized device keys.
2. Circle rendezvous id from recovery/circle secret (not email).
3. DHT / libp2p (or Nostr+WebRTC) presence → authenticated encrypted deltas.
4. Billing may label circle id after restore — never upload rows.

## Fallbacks

Encrypted snapshot export/import; LAN mDNS if same circle; user-chosen ciphertext relay.

## Merge (v1)

LWW on `(updated_at, device_id)`; tombstones win when newer.

## Phases

| Phase | Deliverable |
| --- | --- |
| P0 | This DOC + Admin-Manual CONCEPTS + ARCHITECTURE pointer |
| P1 | Circle key + encrypted snapshot export/import |
| P2 | DHT discovery + peer channel + LWW merge |
| P3 | Settings Sync UI |
| P4 | Billing-assisted circle label only; extract portable package |

## Acceptance

Two devices, no operator server: journal on A appears on B. RC restore does not leak content. Airplane local R/W intact.
