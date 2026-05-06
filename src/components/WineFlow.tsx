"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ProgressIndicator } from "@/components/ProgressIndicator";
import { RecommendationCard } from "@/components/RecommendationCard";
import { TasteProfileCard } from "@/components/TasteProfileCard";
import { matchWine } from "@/lib/semanticWineMatch";
import type { SemanticWineMatch } from "@/lib/semanticWineMatch";
import { buildTasteProfile, type LikedWine } from "@/lib/tasteProfile";
import { buildTasteRadar } from "@/lib/tasteRadar";
import { WINE_REFERENCE } from "@/lib/wineReference";

type Step = "home" | "camera" | "result" | "feedback";

type WineData = {
  name: string;
  region: string;
  description: string;
  tags: string[];
};


const TASTE_TAGS = [
  "sweet",
  "dry",
  "fruity",
  "spicy",
  "acidic",
  "bold",
  "light",
  "mineral",
  "tannic",
  "fresh",
] as const;
type TasteTag = (typeof TASTE_TAGS)[number];
const TASTE_TAG_SET = new Set<string>(TASTE_TAGS);

function getTagOverlapScore(preferredTags: Set<string>, wineTags: string[]): number {
  return wineTags.reduce((sum, tag) => sum + (preferredTags.has(tag) ? 1 : 0), 0);
}

function explorerBadgeLabel(level: number): string | null {
  if (level >= 10) return "Wine explorer";
  if (level >= 5) return "Curious taster";
  if (level >= 3) return "Getting started";
  return null;
}

/** Fills toward Lv.10 (matches top “Wine explorer” tier). */
function explorerLevelProgressPercent(level: number): number {
  const cap = 10;
  if (level <= 0) return 0;
  return Math.min(100, Math.round((level / cap) * 100));
}

export function WineFlow() {
  const profileStorageKey = "wineProfile";
  const [step, setStep] = useState<Step>("home");
  const [captureUrl, setCaptureUrl] = useState<string | null>(null);
  const [likedWines, setLikedWines] = useState<LikedWine[]>([]);
  const [dislikedWines, setDislikedWines] = useState<LikedWine[]>([]);
  const [winesTriedThisSession, setWinesTriedThisSession] = useState(0);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [prevLevel, setPrevLevel] = useState(0);
  const [levelUpMessage, setLevelUpMessage] = useState<string | null>(null);
  const [showRecs, setShowRecs] = useState(false);
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const [scannedWine, setScannedWine] = useState<WineData | null>(null);
  const [semanticResult, setSemanticResult] = useState<SemanticWineMatch>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [mode, setMode] = useState<"for_you" | "explore">("for_you");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const prevLevelGateRef = useRef(0);

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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(profileStorageKey);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;

      const data = parsed as {
        likedWines?: unknown;
        dislikedWines?: unknown;
        session?: unknown;
      };

      const restoreWineArray = (raw: unknown): LikedWine[] =>
        Array.isArray(raw)
          ? raw.filter(
              (wine): wine is LikedWine =>
                !!wine &&
                typeof wine === "object" &&
                "name" in wine &&
                typeof wine.name === "string" &&
                "tags" in wine &&
                Array.isArray(wine.tags) &&
                wine.tags.every((tag: unknown) => typeof tag === "string"),
            )
          : [];

      const restoredLikedWines = restoreWineArray(data.likedWines);
      const restoredDislikedWines = restoreWineArray(data.dislikedWines);

      const restoredSession =
        typeof data.session === "number" && Number.isFinite(data.session) && data.session >= 0
          ? Math.floor(data.session)
          : 0;

      if (restoredLikedWines.length > 0 || restoredSession > 0) {
        setLikedWines(restoredLikedWines);
        setDislikedWines(restoredDislikedWines);
        setWinesTriedThisSession(restoredSession);
        prevLevelGateRef.current = restoredSession;
        setPrevLevel(restoredSession);
        setShowWelcomeBack(true);
      }
    } catch {
      // Ignore invalid localStorage content and start fresh.
    }
  }, [profileStorageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(
        profileStorageKey,
        JSON.stringify({
          likedWines,
          dislikedWines,
          session: winesTriedThisSession,
        }),
      );
    } catch {
      // Ignore write failures (e.g. storage unavailable).
    }
  }, [likedWines, dislikedWines, winesTriedThisSession, profileStorageKey]);

  useEffect(() => {
    const level = winesTriedThisSession;
    const prev = prevLevelGateRef.current;
    if (level <= prev) return;

    const msg =
      level === 3
        ? "🎉 You're getting started!"
        : level === 5
          ? "🔥 Curious taster!"
          : level === 10
            ? "🚀 Wine explorer!"
            : null;

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (msg) {
      setLevelUpMessage(msg);
      timeoutId = setTimeout(() => setLevelUpMessage(null), 2000);
    }

    prevLevelGateRef.current = level;
    setPrevLevel(level);

    return () => {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, [winesTriedThisSession]);

  useEffect(() => {
    if (!scannedWine?.description) return;

    let cancelled = false;
    (async () => {
      try {
        const semanticMatch = await matchWine(scannedWine.description);
        if (!cancelled) {
          setSemanticResult(semanticMatch);
          console.log("Semantic wine match:", JSON.stringify(semanticMatch, null, 2));
        }
      } catch (error) {
        if (!cancelled) {
          setSemanticResult(null);
          console.warn("Semantic wine match failed:", error);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [scannedWine]);

  const handleCapture = async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

    setCaptureUrl(dataUrl);
    setScannedWine(null);
    setSemanticResult(null);
    setScanError(null);
    setScanning(true);
    setShowRecs(false);
    setStep("result");

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      const data = await res.json() as WineData & { error?: string };
      if (!res.ok || data.error) {
        setScanError(data.error ?? "Could not identify wine");
      } else {
        setScannedWine(data);
      }
    } catch {
      setScanError("Network error — try again");
    } finally {
      setScanning(false);
    }
  };

  const tasteProfile = buildTasteProfile(likedWines);
  const tasteRadar = buildTasteRadar(likedWines, dislikedWines);
  const likedCount = likedWines.length;
  const explorerBadge = explorerBadgeLabel(winesTriedThisSession);
  const explorerLevelBarPct = explorerLevelProgressPercent(winesTriedThisSession);
  const userPreferredTags = new Set<TasteTag>();
  for (const wine of likedWines) {
    for (const tag of wine.tags) {
      if (TASTE_TAG_SET.has(tag)) {
        userPreferredTags.add(tag as TasteTag);
      }
    }
  }

  const tagCounts = new Map<string, number>();
  for (const wine of likedWines) {
    for (const tag of wine.tags) {
      if (TASTE_TAG_SET.has(tag)) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
    }
  }
  const primaryTags = new Set<string>();
  if (tagCounts.size > 0) {
    let maxCount = 0;
    tagCounts.forEach((c) => {
      if (c > maxCount) maxCount = c;
    });
    tagCounts.forEach((c, tag) => {
      if (c === maxCount) primaryTags.add(tag);
    });
  }

  const userDislikedTags = new Set<string>();
  for (const wine of dislikedWines) {
    for (const tag of wine.tags) {
      if (TASTE_TAG_SET.has(tag)) userDislikedTags.add(tag);
    }
  }

  const excludedName = semanticResult?.name ?? null;
  let recommendationPool = WINE_REFERENCE.filter((w) => w.name !== excludedName);
  if (mode === "for_you" && primaryTags.size > 0) {
    const filtered = recommendationPool.filter((w) => w.tags.some((t) => primaryTags.has(t)));
    if (filtered.length > 0) recommendationPool = filtered;
  }

  const TIERS = ["safe", "premium", "explore"] as const;
  const rankedRecommendations = [...recommendationPool]
    .sort((a, b) => {
      const scoreA = getTagOverlapScore(userPreferredTags, a.tags) - getTagOverlapScore(userDislikedTags, a.tags) * 0.5;
      const scoreB = getTagOverlapScore(userPreferredTags, b.tags) - getTagOverlapScore(userDislikedTags, b.tags) * 0.5;
      const scoreDiff = scoreB - scoreA;
      if (scoreDiff !== 0) return scoreDiff;
      return a.name.localeCompare(b.name);
    })
    .slice(0, 3)
    .map((wine, index) => ({
      ...wine,
      tier: TIERS[index],
      detail: wine.description,
      matchedTags: wine.tags.filter((t) => userPreferredTags.has(t as TasteTag)),
    }));

  const resetFlow = () => {
    setCaptureUrl(null);
    setScannedWine(null);
    setSemanticResult(null);
    setScanError(null);
    setScanning(false);
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

      {showWelcomeBack ? (
        <section className="rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3 text-center shadow-sm">
          <p className="text-sm font-semibold text-[var(--ink)]">Welcome back 🍷</p>
          <p className="text-xs text-[var(--muted)]">Your taste profile is evolving</p>
        </section>
      ) : null}

      {step === "home" && (
        <div className="animate-screen-in flex flex-1 flex-col items-center justify-center gap-6 py-12">
          <p className="max-w-[260px] text-center text-sm leading-relaxed text-[var(--muted)]">
            Point your camera at any bottle — we&apos;ll identify it and learn
            what you like.
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

          {scanning && (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-white px-4 py-5 shadow-sm">
              <svg className="h-4 w-4 animate-spin text-[var(--accent)]" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              <p className="text-sm text-[var(--muted)]">Identifying wine…</p>
            </div>
          )}

          {scanError && !scanning && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-5 shadow-sm">
              <p className="text-sm font-medium text-red-700">{scanError}</p>
            </div>
          )}

          {scannedWine && !scanning && (
            <article className="rounded-2xl border border-[var(--border)] bg-white px-4 py-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                Identified
              </p>
              <h2 className="mt-1 text-xl font-semibold">{scannedWine.name}</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">{scannedWine.region}</p>
              <p className="mt-3 text-sm leading-relaxed">{scannedWine.description}</p>
            </article>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              disabled={scanning}
              onClick={() => {
                setCaptureUrl(null);
                setScannedWine(null);
                setSemanticResult(null);
                setScanError(null);
                setStep("camera");
              }}
              className="flex-1 rounded-full border border-[var(--border)] bg-white px-6 py-4 text-base font-semibold text-[var(--ink)] transition duration-150 active:scale-95 disabled:opacity-40"
            >
              Try again
            </button>
            <button
              type="button"
              disabled={scanning}
              onClick={() => {
                setVote(null);
                setShowRecs(false);
                setStep("feedback");
              }}
              className="flex-1 rounded-full bg-[var(--accent)] px-6 py-4 text-center text-base font-semibold text-white transition duration-150 active:scale-95 disabled:opacity-40"
            >
              Continue
            </button>
          </div>
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
                setWinesTriedThisSession((n) => n + 1);
                if (scannedWine) {
                  const SEMANTIC_MIN_SCORE = 0.72;
                  const tagsToUse =
                    semanticResult && semanticResult.score >= SEMANTIC_MIN_SCORE && semanticResult.tags.length > 0
                      ? semanticResult.tags
                      : scannedWine.tags;
                  setLikedWines((prev) => {
                    if (prev.some((w) => w.name === scannedWine.name)) return prev;
                    return [...prev, { name: scannedWine.name, tags: [...tagsToUse] }];
                  });
                }
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
                setWinesTriedThisSession((n) => n + 1);
                if (scannedWine) {
                  const tagsToUse =
                    semanticResult && semanticResult.score >= 0.72 && semanticResult.tags.length > 0
                      ? semanticResult.tags
                      : scannedWine.tags;
                  setDislikedWines((prev) => {
                    if (prev.some((w) => w.name === scannedWine.name)) return prev;
                    return [...prev, { name: scannedWine.name, tags: [...tagsToUse] }];
                  });
                }
                setShowRecs(false);
              }}
            >
              👎
            </button>
          </div>

          {levelUpMessage && vote === "down" ? (
            <p
              className="motion-safe:animate-screen-in text-center text-base font-semibold text-violet-600"
              role="status"
              aria-live="polite"
            >
              {levelUpMessage}
            </p>
          ) : null}

          {vote === "down" ? (
            <p className="text-center text-sm text-[var(--muted)]">
              Noted — we&apos;ll steer differently next time.
            </p>
          ) : null}

          {showRecs && vote === "up" ? (
            <section className="animate-card-in space-y-4 rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
              {levelUpMessage ? (
                <p
                  className="motion-safe:animate-screen-in text-center text-base font-semibold text-violet-600"
                  role="status"
                  aria-live="polite"
                >
                  {levelUpMessage}
                </p>
              ) : null}
              <div className="space-y-2 border-b border-[var(--border)] pb-4 text-center">
                <p className="text-sm font-semibold text-[var(--ink)]">
                  🍷 Wine Explorer Lv. {winesTriedThisSession}
                </p>
                {explorerBadge ? (
                  <p className="text-xs font-medium text-[var(--muted)]">
                    {explorerBadge}
                  </p>
                ) : null}
                <div
                  className="mx-auto h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-[var(--border)]"
                  role="progressbar"
                  aria-valuenow={Math.min(winesTriedThisSession, 10)}
                  aria-valuemin={0}
                  aria-valuemax={10}
                  aria-label="Wine explorer level progress"
                >
                  <div
                    className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300 ease-out"
                    style={{ width: `${explorerLevelBarPct}%` }}
                  />
                </div>
              </div>
              <TasteProfileCard profile={tasteProfile} radar={tasteRadar} />
              <ProgressIndicator likedCount={likedCount} />
              <p className="text-sm font-medium text-[var(--ink)]">
                Because you liked this style
              </p>
              <div className="flex flex-wrap items-center justify-center gap-1 text-center">
                <button
                  type="button"
                  onClick={() => setMode("for_you")}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    mode === "for_you"
                      ? "bg-[var(--accent)] text-white"
                      : "text-[var(--muted)] hover:text-[var(--ink)]"
                  }`}
                >
                  For you
                </button>
                <span className="text-[var(--muted)] text-xs" aria-hidden>
                  |
                </span>
                <button
                  type="button"
                  onClick={() => setMode("explore")}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    mode === "explore"
                      ? "bg-[var(--accent)] text-white"
                      : "text-[var(--muted)] hover:text-[var(--ink)]"
                  }`}
                >
                  Explore
                </button>
              </div>
              <ul className="space-y-3">
                {rankedRecommendations.map((wine) => (
                  <RecommendationCard
                    key={wine.name}
                    name={wine.name}
                    detail={wine.detail}
                    tier={wine.tier}
                    matchedTags={wine.matchedTags}
                  />
                ))}
              </ul>
            </section>
          ) : null}

          {vote !== null ? (
            <div className="flex flex-col gap-3 pt-1">
              {likedWines.length >= 3 ? (
                <p
                  className="text-center text-sm font-medium text-[var(--ink)]"
                  role="status"
                >
                  🍷 Your taste profile is forming
                </p>
              ) : null}
              <p className="text-center text-sm leading-relaxed text-[var(--muted)]">
                You&apos;re getting closer to your perfect wine
              </p>
              <p className="text-center text-xs text-[var(--muted)]">
                You&apos;ve tried {winesTriedThisSession}{" "}
                {winesTriedThisSession === 1 ? "wine" : "wines"} in this session
              </p>
              <button
                type="button"
                onClick={resetFlow}
                className="rounded-full border border-[var(--border)] bg-white py-3.5 text-sm font-semibold text-[var(--ink)] transition duration-150 active:scale-95"
              >
                Refine your taste 🍷
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
