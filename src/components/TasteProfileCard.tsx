"use client";

type RadarScores = {
  sweetness: number;
  body: number;
  acidity: number;
  tannin: number;
};

type Props = {
  profile: string;
  radar?: RadarScores;
  compact?: boolean;
};

const DESCRIPTORS: Record<keyof RadarScores, string[]> = {
  sweetness: ["Bone Dry", "Dry",      "Off-Dry",    "Semi-Sweet", "Sweet"],
  acidity:   ["Flat",     "Soft",     "Medium",     "Crisp",      "Racy"],
  tannin:    ["Silky",    "Smooth",   "Round",      "Firm",       "Grippy"],
  body:      ["Light",    "Light-Med","Medium",     "Med-Full",   "Full"],
};

const AXES: { key: keyof RadarScores; label: string; angle: number }[] = [
  { key: "sweetness", label: "Sweetness", angle: -90 },
  { key: "acidity",   label: "Acidity",   angle:   0 },
  { key: "body",      label: "Body",      angle:  90 },
  { key: "tannin",    label: "Tannin",    angle: 180 },
];

function descriptor(key: keyof RadarScores, value: number): string {
  const idx = Math.max(0, Math.min(4, Math.round(value) - 1));
  return DESCRIPTORS[key][idx] ?? "";
}

function toXY(cx: number, cy: number, r: number, angleDeg: number, value: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + (value / 5) * r * Math.cos(rad),
    y: cy + (value / 5) * r * Math.sin(rad),
  };
}

function RadarChart({ scores }: { scores: RadarScores }) {
  const cx = 110, cy = 110, r = 72;

  const dataPoints = AXES.map(({ angle, key }) => toXY(cx, cy, r, angle, scores[key]));
  const polygon = dataPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  const gridPolygons = [1, 2, 3, 4, 5].map((level) =>
    AXES.map(({ angle }) => {
      const p = toXY(cx, cy, r, angle, level);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }).join(" ")
  );

  const axisEnds = AXES.map(({ angle }) => toXY(cx, cy, r, angle, 5));

  const labelPositions = AXES.map(({ angle, key, label }) => {
    const pad = 22;
    const p = toXY(cx, cy, r + pad, angle, 5);
    return { x: p.x, y: p.y, label, key, angle };
  });

  return (
    <svg viewBox="0 0 220 220" className="w-full max-w-[220px] mx-auto">
      {gridPolygons.map((pts, i) => (
        <polygon
          key={i}
          points={pts}
          fill={i === 4 ? "none" : "none"}
          stroke="#e8e0d8"
          strokeWidth="1"
        />
      ))}

      {axisEnds.map((ep, i) => (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={ep.x.toFixed(1)}
          y2={ep.y.toFixed(1)}
          stroke="#e8e0d8"
          strokeWidth="1"
        />
      ))}

      <polygon
        points={polygon}
        fill="#7c2d43"
        fillOpacity="0.25"
        stroke="#7c2d43"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="3.5" fill="#7c2d43" />
      ))}

      {labelPositions.map(({ x, y, label, key, angle }) => {
        const anchor =
          angle === 0 ? "start" : angle === 180 ? "end" : "middle";
        const val = scores[key as keyof RadarScores];
        const desc = descriptor(key as keyof RadarScores, val);
        return (
          <text key={label} x={x.toFixed(1)} y={y.toFixed(1)} textAnchor={anchor}>
            <tspan
              x={x.toFixed(1)}
              dy="0"
              fontSize="8"
              fill="#9c8e85"
              fontFamily="sans-serif"
            >
              {label}
            </tspan>
            <tspan
              x={x.toFixed(1)}
              dy="11"
              fontSize="9"
              fontWeight="600"
              fill="#2c1810"
              fontFamily="sans-serif"
            >
              {desc}
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}

export function TasteProfileCard({ profile, radar, compact }: Props) {
  const hasData = radar && Object.values(radar).some((v) => v !== 3 && v !== 0);

  if (compact) {
    return (
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--accent-soft)] px-4 py-3 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Your taste profile
        </p>
        <p className="mt-1 text-sm font-medium text-[var(--ink)]">{profile}</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white px-4 py-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
        Your Palate
      </p>
      <p className="mt-1 text-sm font-medium text-[var(--ink)]">{profile}</p>

      {hasData && radar ? (
        <div className="mt-4">
          <RadarChart scores={radar} />
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
            {AXES.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-[10px] text-[var(--muted)]">{label}</span>
                <span className="text-[10px] font-semibold text-[var(--ink)]">
                  {radar[key]}/5
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs text-[var(--muted)]">
          Rate a few wines to see your taste DNA emerge.
        </p>
      )}
    </section>
  );
}
