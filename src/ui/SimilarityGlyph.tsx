/**
 * Icon-sized inline SVG "relative vector map" for a similarity hit.
 *
 * Faint outer ring = the far horizon of meaning; small centre dot = the query.
 * Each sibling hit in the group is a ghosted dot at radius ∝ (1 − score)
 * (closer to centre = closer in meaning), angles distributed deterministically
 * by golden-angle index — no randomness, same input renders identically.
 * This hit's own dot is emphasized in the accent colour, slightly larger.
 *
 * Colors ride CSS: ring/ghost dots use currentColor, the hit dot uses
 * var(--accent). Styling hooks via the `sim-glyph` root class.
 */

/** Golden angle in radians — spreads dots evenly without collisions. */
const GOLDEN_ANGLE = 2.399963229728653;

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export default function SimilarityGlyph({
  score,
  siblings,
  size = 22,
}: {
  score: number;
  siblings: number[];
  size?: number;
}) {
  const c = size / 2;
  const ringRadius = c - 1.5;
  const radiusOf = (s: number) => ringRadius * clamp01(1 - s);
  const angleOf = (i: number) => i * GOLDEN_ANGLE;

  // The hit keeps its own deterministic slot when its score appears among
  // the siblings; otherwise it takes the next free golden-angle index.
  const hitIndex = siblings.indexOf(score);
  const hitAngle = angleOf(hitIndex >= 0 ? hitIndex : siblings.length);
  const hitR = radiusOf(score);
  const title = `similarity ${score.toFixed(3)} — closer to centre = closer in meaning`;

  return (
    <svg
      className="sim-glyph"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      {/* Outer ring — the horizon of dissimilarity. */}
      <circle cx={c} cy={c} r={ringRadius} fill="none" stroke="currentColor" strokeOpacity={0.25} strokeWidth={1} />
      {/* Centre dot — the query itself. */}
      <circle cx={c} cy={c} r={1.4} fill="currentColor" />
      {/* Ghosted sibling dots (skip the hit's own slot — drawn emphasized below). */}
      {siblings.map((s, i) =>
        i === hitIndex ? null : (
          <circle
            key={i}
            cx={c + radiusOf(s) * Math.cos(angleOf(i))}
            cy={c + radiusOf(s) * Math.sin(angleOf(i))}
            r={1.2}
            fill="currentColor"
            fillOpacity={0.3}
          />
        ),
      )}
      {/* This hit, emphasized. */}
      <circle
        cx={c + hitR * Math.cos(hitAngle)}
        cy={c + hitR * Math.sin(hitAngle)}
        r={2.2}
        fill="var(--accent, currentColor)"
      />
    </svg>
  );
}
