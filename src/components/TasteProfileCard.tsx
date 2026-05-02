type TasteProfileCardProps = {
  profile: string;
};

export function TasteProfileCard({ profile }: TasteProfileCardProps) {
  return (
    <section
      className="rounded-2xl border border-[var(--border)] bg-[var(--accent-soft)] px-4 py-3 shadow-sm"
      aria-live="polite"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        Your taste profile
      </p>
      <p className="mt-1 text-sm font-medium text-[var(--ink)]">{profile}</p>
    </section>
  );
}
