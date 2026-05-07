"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Onboarding } from "@/components/Onboarding";
import { ProgressIndicator } from "@/components/ProgressIndicator";
import { RecommendationCard } from "@/components/RecommendationCard";
import { TasteProfileCard } from "@/components/TasteProfileCard";
import { matchWine } from "@/lib/semanticWineMatch";
import type { SemanticWineMatch } from "@/lib/semanticWineMatch";
import { buildTasteProfile, type LikedWine } from "@/lib/tasteProfile";
import { buildTasteRadar } from "@/lib/tasteRadar";
import { WINE_REFERENCE } from "@/lib/wineReference";

type Step = "home" | "camera" | "result" | "feedback";

type ScanEntry = {
  id: string;
  wineName: string;
  wineRegion: string;
  vote: "up" | "down" | null;
  scannedAt: string;
};

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

function playCorkPop() {
  try {
    const ctx = new AudioContext();
    const bufferSize = Math.floor(ctx.sampleRate * 0.12);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.025));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 700;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(1.0, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  } catch { /* AudioContext not available */ }
}

export function WineFlow() {
  const { data: session } = useSession();
  const profileStorageKey = "wineProfile";
  const scanButtonRef = useRef<HTMLButtonElement>(null);
  const [onboardingDone, setOnboardingDone] = useState(true);
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
  const [scanHistory, setScanHistory] = useState<ScanEntry[]>([]);
  const [moodQuery, setMoodQuery] = useState("");
  const [moodResults, setMoodResults] = useState<{ name: string; reason: string; tags: string[] }[]>([]);
  const [moodLoading, setMoodLoading] = useState(false);

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
    const seen = localStorage.getItem("onboardingDone");
    setOnboardingDone(seen === "true");
  }, []);

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

  // Backend szinkronizáció: betöltés bejelentkezéskor
  useEffect(() => {
    if (!session?.user?.id) return;
    (async () => {
      try {
        const [profileRes, historyRes] = await Promise.all([
          fetch("/api/profile"),
          fetch("/api/history"),
        ]);
        if (profileRes.ok) {
          const data = await profileRes.json() as {
            likedWines?: LikedWine[];
            dislikedWines?: LikedWine[];
            sessionCount?: number;
          };
          if (Array.isArray(data.likedWines) && data.likedWines.length > 0) {
            setLikedWines(data.likedWines);
            setDislikedWines(Array.isArray(data.dislikedWines) ? data.dislikedWines : []);
            const count = data.sessionCount ?? 0;
            setWinesTriedThisSession(count);
            prevLevelGateRef.current = count;
            setPrevLevel(count);
            setShowWelcomeBack(true);
          }
        }
        if (historyRes.ok) {
          const history = await historyRes.json() as ScanEntry[];
          setScanHistory(history);
        }
      } catch {
        // Fallback to localStorage if backend unavailable.
      }
    })();
  }, [session?.user?.id]);

  // Backend szinkronizáció: mentés változáskor (csak bejelentkezve)
  useEffect(() => {
    if (!session?.user?.id) return;
    const timeout = setTimeout(() => {
      fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          likedWines,
          dislikedWines,
          sessionCount: winesTriedThisSession,
        }),
      }).catch(() => {});
    }, 1000);
    return () => clearTimeout(timeout);
  }, [session?.user?.id, likedWines, dislikedWines, winesTriedThisSession]);

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

  if (!onboardingDone) {
    return (
      <Onboarding
        onDone={() => {
          localStorage.setItem("onboardingDone", "true");
          setOnboardingDone(true);
        }}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      <header className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-widest text-[var(--muted)]">
            Sip & learn
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--ink)]">
            Wine scanner
          </h1>
        </div>
        <div className="pt-1">
          {session ? (
            <button
              type="button"
              onClick={() => signOut()}
              className="text-xs text-[var(--muted)] hover:text-[var(--ink)]"
            >
              Kilépés
            </button>
          ) : (
            <Link href="/auth/login" className="text-xs font-medium text-[var(--accent)]">
              Bejelentkezés
            </Link>
          )}
        </div>
      </header>

      {step === "home" && (
        <div className="animate-screen-in flex flex-1 flex-col gap-8">

          {/* Liquid hero */}
          <div className="relative flex flex-col items-center justify-center py-10 overflow-hidden">

            {/* SVG goo filter */}
            <svg className="absolute w-0 h-0" aria-hidden>
              <defs>
                <filter id="goo">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="blur" />
                  <feColorMatrix in="blur" mode="matrix"
                    values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -12"
                    result="goo"
                  />
                </filter>
              </defs>
            </svg>

            {/* Floating background blobs */}
            <div className="absolute inset-0 pointer-events-none" style={{ filter: "url(#goo)" }}>
              <div className="animate-blob-morph animate-float-1 absolute w-36 h-36 bg-[var(--accent)] opacity-20"
                style={{ top: "0%", left: "5%" }} />
              <div className="animate-blob-morph animate-float-2 absolute w-28 h-28 bg-[var(--accent)] opacity-15"
                style={{ top: "15%", right: "8%", animationDelay: "-4s" }} />
              <div className="animate-blob-morph animate-float-3 absolute w-20 h-20 bg-[var(--accent)] opacity-10"
                style={{ bottom: "5%", left: "25%", animationDelay: "-2s" }} />
            </div>

            {/* Main scan button */}
            <button
              ref={scanButtonRef}
              type="button"
              onClick={(e) => {
                playCorkPop();
                const btn = scanButtonRef.current;
                if (btn) {
                  const rect = btn.getBoundingClientRect();
                  const ripple = document.createElement("span");
                  ripple.className = "animate-ripple";
                  ripple.style.cssText = `position:absolute;left:${e.clientX - rect.left}px;top:${e.clientY - rect.top}px;width:24px;height:24px;background:rgba(255,255,255,0.5);border-radius:50%;pointer-events:none;`;
                  btn.appendChild(ripple);
                  ripple.addEventListener("animationend", () => ripple.remove());
                }
                setStep("camera");
              }}
              className="animate-blob-morph animate-blob-pulse relative z-10 overflow-hidden flex flex-col items-center justify-center w-52 h-52 bg-[var(--accent)] text-white shadow-2xl transition-transform duration-150 active:scale-90 cursor-pointer"
              style={{ willChange: "border-radius, transform" }}
            >
              <span className="text-5xl mb-2 select-none">🍷</span>
              <span className="text-lg font-bold tracking-wide select-none">Scan wine</span>
            </button>

            <p className="relative z-10 mt-5 text-xs text-[var(--muted)] text-center">
              Fényképezz le bármilyen palackot
            </p>
          </div>

          {/* Secondary sections */}
          <div className="flex flex-col gap-6">
            {likedWines.length >= 2 && (
              <TasteProfileCard profile={tasteProfile} radar={tasteRadar} />
            )}

            {scanHistory.length > 0 && (
              <section className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-widest text-[var(--muted)]">
                  Legutóbbi scanek
                </p>
                <ul className="space-y-2">
                  {scanHistory.slice(0, 5).map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-white px-4 py-3 shadow-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--ink)]">{entry.wineName}</p>
                        <p className="truncate text-xs text-[var(--muted)]">{entry.wineRegion}</p>
                      </div>
                      <span className="ml-3 shrink-0 text-lg">
                        {entry.vote === "up" ? "👍" : "👎"}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
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
                  if (session?.user?.id) {
                    fetch("/api/history", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        wineName: scannedWine.name,
                        wineRegion: scannedWine.region,
                        tags: tagsToUse,
                        vote: "up",
                      }),
                    }).then((r) => r.ok ? r.json() : null).then((entry) => {
                      if (entry) setScanHistory((prev) => [entry as ScanEntry, ...prev]);
                    }).catch(() => {});
                  }
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
                  if (session?.user?.id) {
                    fetch("/api/history", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        wineName: scannedWine.name,
                        wineRegion: scannedWine.region,
                        tags: tagsToUse,
                        vote: "down",
                      }),
                    }).then((r) => r.ok ? r.json() : null).then((entry) => {
                      if (entry) setScanHistory((prev) => [entry as ScanEntry, ...prev]);
                    }).catch(() => {});
                  }
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
              <TasteProfileCard profile={tasteProfile} radar={tasteRadar} compact />
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
