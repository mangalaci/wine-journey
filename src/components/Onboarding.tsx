"use client";

import { useState } from "react";

const SLIDES = [
  {
    emoji: "📸",
    title: "Scan any wine",
    body: "Point your camera at a label — we identify the wine instantly.",
  },
  {
    emoji: "👍",
    title: "Like or dislike",
    body: "One tap tells us what you enjoy. We learn your taste with every bottle.",
  },
  {
    emoji: "🍷",
    title: "Get personalised picks",
    body: "The more you scan, the smarter your recommendations become.",
  },
];

type OnboardingProps = {
  onDone: () => void;
};

export function Onboarding({ onDone }: OnboardingProps) {
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;
  const slide = SLIDES[index]!;

  return (
    <div className="flex flex-1 flex-col items-center justify-between py-12 px-6 animate-screen-in">
      <div className="flex gap-1.5 pt-2">
        {SLIDES.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === index
                ? "w-6 bg-[var(--accent)]"
                : "w-1.5 bg-[var(--border)]"
            }`}
          />
        ))}
      </div>

      <div className="flex flex-col items-center gap-6 text-center">
        <span className="text-7xl">{slide.emoji}</span>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--ink)]">
            {slide.title}
          </h2>
          <p className="max-w-[260px] text-sm leading-relaxed text-[var(--muted)]">
            {slide.body}
          </p>
        </div>
      </div>

      <div className="flex w-full flex-col gap-3">
        <button
          type="button"
          onClick={() => {
            if (isLast) {
              onDone();
            } else {
              setIndex((i) => i + 1);
            }
          }}
          className="w-full rounded-full bg-[var(--accent)] px-6 py-4 text-base font-semibold text-white transition duration-150 active:scale-95"
        >
          {isLast ? "Get started" : "Next"}
        </button>
        {!isLast && (
          <button
            type="button"
            onClick={onDone}
            className="text-sm text-[var(--muted)]"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
