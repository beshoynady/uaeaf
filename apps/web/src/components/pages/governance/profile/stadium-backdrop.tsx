/**
 * The opening scene's night stadium: two floodlights, a red track seen from
 * its finish, eight numbered lanes and the chequered finish line.
 *
 * Drawn rather than photographed because the federation has supplied no
 * picture for a profile, and a drawn ground costs no request. Every colour is
 * read from the ink surface around it — white from its text, red from its
 * tricolour end — so nothing here is a colour of its own. Geometry is
 * physical and does not mirror, which is right for a picture.
 */

const LANES = 8;
const BOTTOM = { y: 900, from: -200, to: 1640 };
const TOP = { y: 600, from: 340, to: 1100 };

/** A lane edge's x at a given height, walking up the track's perspective. */
const edgeAt = (edge: number, y: number) => {
  const t = (BOTTOM.y - y) / (BOTTOM.y - TOP.y);
  const bottom = BOTTOM.from + ((BOTTOM.to - BOTTOM.from) * edge) / LANES;
  const top = TOP.from + ((TOP.to - TOP.from) * edge) / LANES;
  return bottom + (top - bottom) * t;
};

const Floodlight = ({ x }: { x: number }) => (
  <g>
    <polygon points={`${x - 40},130 ${x + 40},130 ${x + 260},640 ${x - 260},640`} fill="currentColor" opacity="0.06" />
    <rect x={x - 4} y={130} width={8} height={430} fill="currentColor" opacity="0.35" />
    <rect x={x - 56} y={86} width={112} height={48} rx={6} fill="currentColor" opacity="0.5" />
    {[0, 1, 2].map((column) =>
      [0, 1].map((row) => (
        <circle key={`${column}-${row}`} cx={x - 32 + column * 32} cy={100 + row * 20} r={7} fill="currentColor" />
      )),
    )}
  </g>
);

export const StadiumBackdrop = () => {
  const finishNear = 712;
  const finishFar = 688;

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMax slice"
      className="size-full text-[color:var(--surface-text)]"
    >
      <defs>
        <pattern id="gov-profile-chequer" width="24" height="24" patternUnits="userSpaceOnUse">
          <rect width="12" height="12" fill="currentColor" />
          <rect x="12" y="12" width="12" height="12" fill="currentColor" />
        </pattern>
      </defs>

      <Floodlight x={200} />
      <Floodlight x={1240} />

      <g className="text-[color:var(--surface-tricolor-end)]">
        <polygon
          points={`${BOTTOM.from},${BOTTOM.y} ${BOTTOM.to},${BOTTOM.y} ${TOP.to},${TOP.y} ${TOP.from},${TOP.y}`}
          fill="currentColor"
          opacity="0.55"
        />
      </g>

      {Array.from({ length: LANES + 1 }, (_, edge) => (
        <line
          key={edge}
          x1={edgeAt(edge, BOTTOM.y)}
          y1={BOTTOM.y}
          x2={edgeAt(edge, TOP.y)}
          y2={TOP.y}
          stroke="currentColor"
          strokeWidth="3"
          opacity="0.5"
        />
      ))}

      <polygon
        points={`${edgeAt(0, finishNear)},${finishNear} ${edgeAt(LANES, finishNear)},${finishNear} ${edgeAt(LANES, finishFar)},${finishFar} ${edgeAt(0, finishFar)},${finishFar}`}
        fill="url(#gov-profile-chequer)"
        opacity="0.8"
      />

      {Array.from({ length: LANES }, (_, lane) => (
        <text
          key={lane}
          x={(edgeAt(lane, 860) + edgeAt(lane + 1, 860)) / 2}
          y={860}
          textAnchor="middle"
          direction="ltr"
          fontSize="40"
          fontWeight="700"
          fill="currentColor"
          opacity="0.7"
        >
          {lane + 1}
        </text>
      ))}
    </svg>
  );
};
