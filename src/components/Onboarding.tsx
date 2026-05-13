"use client";

import { useState } from "react";

const SLIDES = [
  {
    emoji: "📸",
    title: "Fotózz borcímkét",
    body: "Irányítsd a kamerát a címkére — mi felismerjük a bort.",
  },
  {
    emoji: "👍",
    title: "Tetszik vagy nem",
    body: "Egy koppintás elmondja, mit szeretsz. Minden borral okosabbak leszünk.",
  },
  {
    emoji: "🍷",
    title: "Személyes ajánlatok",
    body: "Minél többet scannelünk, annál pontosabb borokat ajánlunk.",
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
          {isLast ? "Kezdjük" : "Tovább"}
        </button>
        {!isLast && (
          <button
            type="button"
            onClick={onDone}
            className="text-sm text-[var(--muted)]"
          >
            Kihagyom
          </button>
        )}
      </div>
    </div>
  );
}
