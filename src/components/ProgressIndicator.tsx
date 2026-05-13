type ProgressIndicatorProps = {
  likedCount: number;
};

function getMilestoneMessage(likedCount: number): string | null {
  if (likedCount >= 10) return "A borfelfedező már ott van";
  if (likedCount >= 5) return "Az ízlésed formálódik";
  if (likedCount >= 3) return "Már beindult a borvadászat 🍷";
  return null;
}

export function ProgressIndicator({ likedCount }: ProgressIndicatorProps) {
  const milestoneMessage = getMilestoneMessage(likedCount);

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 shadow-sm">
      <p className="text-sm font-medium text-[var(--ink)]">
        Eddig {likedCount} {likedCount === 1 ? "bort" : "bort"} kedveltél
      </p>
      {milestoneMessage ? (
        <p className="mt-1 text-xs text-[var(--muted)]">{milestoneMessage}</p>
      ) : null}
    </section>
  );
}
