type RecommendationTier = "safe" | "premium" | "explore";

type RecommendationCardProps = {
  name: string;
  detail: string;
  tier: RecommendationTier;
  matchedTags?: string[];
};

const TIER_LABEL: Record<RecommendationTier, string> = {
  safe: "Biztos választás",
  premium: "Prémium",
  explore: "Felfedezés",
};

const TIER_FALLBACK_REASON: Record<RecommendationTier, string> = {
  safe: "Az ízlésedhez igazítva",
  premium: "Minőségi feljebb lépés",
  explore: "Próbálj ki valami újat",
};

export function RecommendationCard({
  name,
  detail,
  tier,
  matchedTags,
}: RecommendationCardProps) {
  const label = TIER_LABEL[tier];
  const reason =
    matchedTags && matchedTags.length > 0
      ? `Mert ez a stílus illik hozzád: ${matchedTags.join(", ")}`
      : TIER_FALLBACK_REASON[tier];

  return (
    <li className="rounded-xl border border-[var(--border)] bg-white px-4 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--ink)]">{name}</p>
        <span className="shrink-0 rounded-full bg-[var(--accent)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
          {label}
        </span>
      </div>
      <p className="mt-1 text-xs text-[var(--muted)]">{detail}</p>
      <p className="mt-2 text-xs font-medium text-[var(--ink)]">{reason}</p>
    </li>
  );
}
