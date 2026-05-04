type RecommendationTier = "safe" | "premium" | "explore";

type RecommendationCardProps = {
  name: string;
  detail: string;
  tier: RecommendationTier;
};

const TIER_COPY: Record<RecommendationTier, { label: string; reason: string }> = {
  safe: { label: "Safe", reason: "Matches your taste" },
  premium: { label: "Premium", reason: "A step up in quality" },
  explore: { label: "Explore", reason: "Try something new" },
};

export function RecommendationCard({
  name,
  detail,
  tier,
}: RecommendationCardProps) {
  const copy = TIER_COPY[tier];

  return (
    <li className="rounded-xl border border-[var(--border)] bg-white px-4 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--ink)]">{name}</p>
        <span className="shrink-0 rounded-full bg-[var(--accent)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
          {copy.label}
        </span>
      </div>
      <p className="mt-1 text-xs text-[var(--muted)]">{detail}</p>
      <p className="mt-2 text-xs font-medium text-[var(--ink)]">{copy.reason}</p>
    </li>
  );
}
