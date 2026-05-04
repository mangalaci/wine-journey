type ProgressIndicatorProps = {
  likedCount: number;
};

function getMilestoneMessage(likedCount: number): string | null {
  if (likedCount >= 10) return "You're a wine explorer";
  if (likedCount >= 5) return "Your taste is taking shape";
  if (likedCount >= 3) return "You're getting started 🍷";
  return null;
}

export function ProgressIndicator({ likedCount }: ProgressIndicatorProps) {
  const milestoneMessage = getMilestoneMessage(likedCount);

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 shadow-sm">
      <p className="text-sm font-medium text-[var(--ink)]">
        You&apos;ve liked {likedCount} {likedCount === 1 ? "wine" : "wines"} so far
      </p>
      {milestoneMessage ? (
        <p className="mt-1 text-xs text-[var(--muted)]">{milestoneMessage}</p>
      ) : null}
    </section>
  );
}
