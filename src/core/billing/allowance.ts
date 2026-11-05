/**
 * BK.1 (§K.1) — pure allowance math, the operator's "prepaid × 40%" formula.
 *
 * Two formulas, floor-rounded (never round a user's allowance up):
 *  - `spendLimitCents(remaining, bps)` — the per-mint ceiling for a hosted
 *    Sacristan key: 40% (default) of whatever credit remains, so one minted
 *    key can never spend the whole balance (§K.1: "spend limit defined by
 *    amount of prepaid x 40% default").
 *  - `grantCents(gross, tax, bps)` — how much chat allowance a top-up grants:
 *    40% of the net (gross minus tax) becomes hosted-chat credit.
 *
 * Pure and dependency-free: imported by the Netlify billing functions, the
 * SK.3 client, and these unit tests. Everything guards against nonsense —
 * zero/negative/NaN inputs yield 0, never a fabricated allowance.
 */

/** Default allocation: 40% of prepaid (basis points, per §K.1 / BILLING_ALLOCATION_BPS). */
export const DEFAULT_ALLOCATION_BPS = 4000;

function guardUnits(cents: number): number {
  return Number.isFinite(cents) && cents > 0 ? cents : 0;
}

function guardBps(bps: number): number {
  return Number.isFinite(bps) && bps > 0 ? bps : 0;
}

/** Per-mint spend ceiling: `floor(remaining × bps / 10000)`; garbage in → 0. */
export function spendLimitCents(remainingAllowanceCents: number, bps: number = DEFAULT_ALLOCATION_BPS): number {
  const remaining = guardUnits(remainingAllowanceCents);
  const rate = guardBps(bps);
  if (remaining === 0 || rate === 0) return 0;
  return Math.floor((remaining * rate) / 10000);
}

/** Top-up grant: `floor((gross − tax) × bps / 10000)`; net ≤ 0 → 0. */
export function grantCents(grossCents: number, taxCents: number, bps: number = DEFAULT_ALLOCATION_BPS): number {
  const gross = guardUnits(grossCents);
  const tax = Number.isFinite(taxCents) && taxCents > 0 ? taxCents : 0;
  const rate = guardBps(bps);
  if (gross === 0 || rate === 0) return 0;
  const net = gross - tax;
  if (net <= 0) return 0;
  return Math.floor((net * rate) / 10000);
}
