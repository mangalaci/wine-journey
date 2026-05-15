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
  animate?: boolean;
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

function RadarChart({ scores, animate = false }: { scores: RadarScores; animate?: boolean }) {
  const cx = 140, cy = 150, r = 105;

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
    const pad = 26;
    const p = toXY(cx, cy, r + pad, angle, 5);
    return { x: p.x, y: p.y, label, key, angle };
  });

  const clipId = `wine-fill-${cx}`;

  return (
    <svg viewBox="-25 -75 330 370" className="w-full max-w-[340px] mx-auto">
      <defs>
        {animate && (
          <clipPath id={clipId}>
            <rect x="-25" width="330" y="295" height="0">
              <animate attributeName="y" from="295" to="0" dur="1.4s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0;1" begin="0.7s" />
              <animate attributeName="height" from="0" to="295" dur="1.4s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0;1" begin="0.7s" />
            </rect>
          </clipPath>
        )}
      </defs>

      {/* ── Wine bottle ── */}
      {animate && (
        <g>
          {/* bottle group: translate to top-center, rotate around bottle base */}
          <g transform="translate(35, 25)">
            <g>
              {/* bottle silhouette */}
              <path
                d="M-4,-42 L-4,-28 C-8,-24 -11,-18 -11,-8 L-11,18 C-11,22 -7,24 0,24 C7,24 11,22 11,18 L11,-8 C11,-18 8,-24 4,-28 L4,-42 Z"
                fill="#7c2d43"
                fillOpacity="0.9"
              />
              {/* label */}
              <rect x="-7" y="-4" width="14" height="14" rx="2" fill="rgba(255,255,255,0.25)" />
              {/* cork */}
              <rect x="-3" y="-50" width="6" height="9" rx="1.5" fill="#c4956a" />
              {/* shine */}
              <line x1="-3" y1="-38" x2="-3" y2="10" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeLinecap="round" />
              {/* tilt: pivot around bottle base (0, 24) */}
              <animateTransform attributeName="transform" type="rotate"
                values="0 0 24; 55 0 24; 55 0 24; 0 0 24"
                keyTimes="0; 0.25; 0.8; 1"
                dur="3s" fill="freeze" />
            </g>
          </g>

          {/* pour stream: bottle mouth (96,7) → diagram top (140,45) */}
          <path d="M 96,7 Q 118,30 140,45" fill="none" stroke="#7c2d43" strokeWidth="4" strokeLinecap="round" opacity="0.75"
            strokeDasharray="100" strokeDashoffset="100">
            <animate attributeName="strokeDashoffset" from="100" to="0" dur="1.4s" fill="freeze" begin="0.65s" calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0;1" />
            <animate attributeName="strokeDashoffset" from="0" to="-100" dur="0.3s" fill="freeze" begin="2.05s" />
          </path>
        </g>
      )}

      {gridPolygons.map((pts, i) => (
        <polygon key={i} points={pts} fill="none" stroke="#e8e0d8" strokeWidth="1" />
      ))}

      {axisEnds.map((ep, i) => (
        <line key={i} x1={cx} y1={cy} x2={ep.x.toFixed(1)} y2={ep.y.toFixed(1)} stroke="#e8e0d8" strokeWidth="1" />
      ))}

      {/* outline */}
      <polygon points={polygon} fill="none" stroke="#7c2d43" strokeWidth="2" strokeLinejoin="round" strokeOpacity={animate ? "0.2" : "1"} />

      {/* fill alulról felfelé */}
      <polygon
        points={polygon}
        fill="#7c2d43"
        fillOpacity="0.25"
        stroke="#7c2d43"
        strokeWidth="2"
        strokeLinejoin="round"
        clipPath={animate ? `url(#${clipId})` : undefined}
      />

      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r={animate ? "0" : "3.5"} fill="#7c2d43">
          {animate && (
            <animate attributeName="r" from="0" to="3.5" dur="0.4s" fill="freeze" begin={`${2.2 + i * 0.08}s`} />
          )}
        </circle>
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

export function TasteProfileCard({ profile, radar, compact, animate }: Props) {
  const hasData = radar && Object.values(radar).some((v) => v !== 3 && v !== 0);

  if (compact) {
    return (
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--accent-soft)] px-4 py-3 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Ízprofilod
        </p>
        <p className="mt-1 text-sm font-medium text-[var(--ink)]">{profile}</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white px-4 py-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
        Ízpaletta
      </p>
      <p className="mt-1 text-sm font-medium text-[var(--ink)]">{profile}</p>

      {hasData && radar ? (
        <div className="mt-4">
          <RadarChart scores={radar} animate={!!animate} />
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
          Értékelj néhány bort, hogy látható legyen az ízlésed mintázata.
        </p>
      )}
    </section>
  );
}
