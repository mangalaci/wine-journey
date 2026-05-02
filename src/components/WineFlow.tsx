"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ProgressIndicator } from "@/components/ProgressIndicator";
import { RecommendationCard } from "@/components/RecommendationCard";
import { TasteProfileCard } from "@/components/TasteProfileCard";
import { buildTasteProfile, type LikedWine } from "@/lib/tasteProfile";

type Step = "home" | "camera" | "result" | "feedback";

const MOCK_WINE = {
  name: "Les Hauts Verdots Sauvignon Blanc",
  region: "Loire Valley, France",
  description: "Bright citrus and green apple — crisp and refreshing.",
  tags: ["light", "fruity", "white"] as const,
};

const RECOMMENDATIONS = [
  {
    tier: "safe" as const,
    name: "Kim Crawford Sauvignon Blanc",
    detail: "Popular Marlborough pour — reliable citrus zip.",
  },
  {
    tier: "premium" as const,
    name: "Domaine Vacheron Sancerre",
    detail: "Linear minerality; a step up for weeknight splurge.",
  },
  {
    tier: "explore" as const,
    name: "Ameztoi Txakoli",
    detail: "Spritzy Basque white — low ABV, high fun.",
  },
];

export function WineFlow() {
  const [step, setStep] = useState<Step>("home");
  const [captureUrl, setCaptureUrl] = useState<string | null>(null);
  const [likedWines, setLikedWines] = useState<LikedWine[]>([]);
  const [showRecs, setShowRecs] = useState(false);
  const [vote, setVote] = useState<"up" | "down" | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (step !== "camera") {
      stopCamera();
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const el = videoRef.current;
        if (el) {
          el.srcObject = stream;
          await el.play();
        }
      } catch {
        setStep("home");
      }
    })();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [step, stopCamera]);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    setCaptureUrl(canvas.toDataURL("image/jpeg", 0.85));
    setStep("result");
    setShowRecs(false);
  };

  const tasteProfile = buildTasteProfile(likedWines);
  const likedCount = likedWines.length;

  const resetFlow = () => {
    setCaptureUrl(null);
    setShowRecs(false);
    setVote(null);
    setStep("home");
  };

  return (
    <div className="flex flex-1 flex-col gap-8">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-widest text-[var(--muted)]">
          Sip & learn
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--ink)]">
          Wine scanner
        </h1>
      </header>

      {step === "home" && (
        <div className="animate-screen-in flex flex-1 flex-col items-center justify-center gap-6 py-12">
          <p className="max-w-[260px] text-center text-sm leading-relaxed text-[var(--muted)]">
            Point your camera at any bottle — we&apos;ll show a demo match and
            learn what you like.
          </p>
          <button
            type="button"
            onClick={() => setStep("camera")}
            className="w-full max-w-xs rounded-full bg-[var(--accent)] px-6 py-4 text-base font-semibold text-white shadow-md transition duration-150 hover:opacity-95 active:scale-95"
          >
            Scan wine
          </button>
        </div>
      )}

      {step === "camera" && (
        <div className="animate-screen-in flex flex-col gap-4">
          <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-black shadow-inner aspect-[3/4]">
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep("home")}
              className="flex-1 rounded-xl border border-[var(--border)] bg-white py-3 text-sm font-medium text-[var(--ink)] transition duration-150 active:scale-95"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCapture}
              className="flex-1 rounded-xl bg-[var(--accent)] py-3 text-sm font-semibold text-white transition duration-150 active:scale-95"
            >
              Capture
            </button>
          </div>
        </div>
      )}

      {step === "result" && captureUrl && (
        <div className="animate-screen-in flex flex-col gap-6">
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] shadow-sm">
            <img
              src={captureUrl}
              alt="Your capture"
              className="aspect-[4/3] w-full object-cover"
            />
          </div>

          <article className="rounded-2xl border border-[var(--border)] bg-white px-4 py-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              Match (demo)
            </p>
            <h2 className="mt-1 text-xl font-semibold">{MOCK_WINE.name}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{MOCK_WINE.region}</p>
            <p className="mt-3 text-sm leading-relaxed">{MOCK_WINE.description}</p>
          </article>

          <button
            type="button"
            onClick={() => {
              setVote(null);
              setShowRecs(false);
              setStep("feedback");
            }}
            className="rounded-full bg-[var(--accent)] px-6 py-4 text-center text-base font-semibold text-white transition duration-150 active:scale-95"
          >
            Continue
          </button>
        </div>
      )}

      {step === "feedback" && (
        <div className="animate-screen-in flex flex-col gap-8 py-4">
          <p className="text-center text-lg font-medium text-[var(--ink)]">
            Did you like it?
          </p>
          <div className="flex justify-center gap-6">
            <button
              type="button"
              aria-label="Thumbs up"
              disabled={vote !== null}
              className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[var(--border)] bg-white text-3xl shadow-sm transition duration-150 enabled:hover:border-[var(--accent)] enabled:active:scale-95 disabled:opacity-40"
              onClick={() => {
                if (vote) return;
                setVote("up");
                setLikedWines((prev) => [
                  ...prev,
                  { name: MOCK_WINE.name, tags: [...MOCK_WINE.tags] },
                ]);
                setShowRecs(true);
              }}
            >
              👍
            </button>
            <button
              type="button"
              aria-label="Thumbs down"
              disabled={vote !== null}
              className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[var(--border)] bg-white text-3xl shadow-sm transition duration-150 enabled:hover:border-[var(--accent)] enabled:active:scale-95 disabled:opacity-40"
              onClick={() => {
                if (vote) return;
                setVote("down");
                setShowRecs(false);
              }}
            >
              👎
            </button>
          </div>

          {vote === "down" ? (
            <p className="text-center text-sm text-[var(--muted)]">
              Noted — we&apos;ll steer differently next time.
            </p>
          ) : null}

          {showRecs && vote === "up" ? (
            <section className="animate-card-in space-y-4 rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
              <TasteProfileCard profile={tasteProfile} />
              <ProgressIndicator likedCount={likedCount} />
              <p className="text-sm font-medium text-[var(--ink)]">
                Because you liked this style
              </p>
              <ul className="space-y-3">
                {RECOMMENDATIONS.map((wine) => (
                  <RecommendationCard
                    key={wine.name}
                    name={wine.name}
                    detail={wine.detail}
                    tier={wine.tier}
                  />
                ))}
              </ul>
            </section>
          ) : null}

          {vote !== null ? (
            <button
              type="button"
              onClick={resetFlow}
              className="rounded-full border border-[var(--border)] bg-white py-3 text-sm font-medium text-[var(--ink)] transition duration-150 active:scale-95"
            >
              Scan another bottle
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
