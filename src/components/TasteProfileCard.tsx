import { radarToBlocks } from "@/lib/tasteRadar";

type TasteProfileCardProps = {
  profile: string;
  radar?: {
    sweetness: number;
    body: number;
    acidity: number;
    tannin: number;
  };
};

const RADAR_ROWS: { key: keyof NonNullable<TasteProfileCardProps["radar"]>; label: string }[] = [
  { key: "sweetness", label: "Sweetness" },
  { key: "body", label: "Body" },
  { key: "acidity", label: "Acidity" },
  { key: "tannin", label: "Tannin" },
];

export function TasteProfileCard({ profile, radar }: TasteProfileCardProps) {
  const hasRadarData = radar && Object.values(radar).some((v) => v !== 2);

  return (
    <section
      className="rounded-2xl border border-[var(--border)] bg-[var(--accent-soft)] px-4 py-3 shadow-sm"
      aria-live="polite"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        Your taste profile
      </p>
      <p className="mt-1 text-sm font-medium text-[var(--ink)]">{profile}</p>
      {hasRadarData && radar ? (
        <div className="mt-3 space-y-1.5">
          {RADAR_ROWS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2">
              <span className="w-16 shrink-0 text-[10px] text-[var(--muted)]">{label}</span>
              <span className="font-mono text-xs tracking-wider text-[var(--accent)]">
                {radarToBlocks(radar[key])}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
