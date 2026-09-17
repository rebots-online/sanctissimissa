// Shared TurboQuant policy (operator decision 2026-09-07): KV key/value →
// turbo3 preferred, turbo4 as the higher-fidelity fallback, turbo2 only for
// severely constrained contexts. Weight quantization is independent of KV
// format — Q4_K_M weights + turbo3 KV is a valid, common pairing, as are
// TQ3_1S weights + turbo3 KV. The registry describes preference; a live
// engine probe() is authority.
import type { EngineCapabilities, TurboQuantKvFormat } from './engine-types.ts';

/** Best-first KV preference shared by every backend. */
export const KV_PREFERENCE: readonly TurboQuantKvFormat[] = ['turbo3', 'turbo4', 'turbo2', 'q8_0', 'f16'];

export type WeightQuantFormat = 'Q4_K_M' | 'Q4_K_S' | 'Q6_K' | 'Q8_0' | 'TQ3_1S' | 'TQ4_1S' | 'F16';

/** Best-first weight preference; TQ formats only where native kernels exist. */
export const WEIGHT_PREFERENCE: readonly WeightQuantFormat[] = ['Q4_K_M', 'TQ4_1S', 'Q6_K', 'Q8_0', 'TQ3_1S', 'F16'];

export function resolveKvFormat(
  supported: readonly TurboQuantKvFormat[],
  constrained = false,
): TurboQuantKvFormat | null {
  const available = new Set(supported);
  if (constrained && available.has('turbo2')) return 'turbo2';
  for (const format of KV_PREFERENCE) {
    if (available.has(format)) return format;
  }
  return null;
}

export function resolveEngineKvFormat(
  capabilities: Pick<EngineCapabilities, 'kvFormats'>,
  constrained = false,
): TurboQuantKvFormat | null {
  return resolveKvFormat(capabilities.kvFormats, constrained);
}

export function resolveWeightFormat(supported: readonly string[]): WeightQuantFormat | null {
  const available = new Set(supported);
  for (const format of WEIGHT_PREFERENCE) {
    if (available.has(format)) return format;
  }
  return null;
}
