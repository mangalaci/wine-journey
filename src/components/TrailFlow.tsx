"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { TasteProfileCard } from "@/components/TasteProfileCard";
import { matchWine, type SemanticWineMatch } from "@/lib/semanticWineMatch";
import { buildTasteProfile, type LikedWine } from "@/lib/tasteProfile";
import { buildTasteRadar } from "@/lib/tasteRadar";
import { WINE_REFERENCE } from "@/lib/wineReference";

// ─── Types ────────────────────────────────────────────────────────────────────

type TrailStep =
  | "welcome"
  | "scan"
  | "identifying"
  | "result"
  | "react"
  | "milestone"
  | "suggestion"
  | "show_suggestion";

type WineData = {
  name: string;
  region: string;
  description: string;
  tags: string[];
};

type ScanEntry = {
  id: string;
  wineName: string;
  wineRegion: string;
  vote: "up" | "down" | null;
  scannedAt: string;
};

// ─── Milestone config ─────────────────────────────────────────────────────────

const MILESTONES: Record<number, { emoji: string; text: string }> = {
  1:  { emoji: "🍷", text: "Első állomás teljesítve!" },
  3:  { emoji: "🌱", text: "Formálódik az ízlésed..." },
  5:  { emoji: "🔥", text: "Kíváncsi kóstoló vagy!" },
  10: { emoji: "🧬", text: "A te bor-DNS-ed feltárult!" },
};

// ─── Sound ────────────────────────────────────────────────────────────────────

function playCorkPop() {
  try {
    const ctx = new AudioContext();
    const t = ctx.currentTime;
    const bufferSize = Math.floor(ctx.sampleRate * 0.06);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.006));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const crack = ctx.createBiquadFilter();
    crack.type = "bandpass";
    crack.frequency.value = 2500;
    crack.Q.value = 0.4;
    const crackGain = ctx.createGain();
    crackGain.gain.setValueAtTime(2.0, t);
    crackGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    noise.connect(crack);
    crack.connect(crackGain);
    crackGain.connect(ctx.destination);
    noise.start(t);
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.07);
    oscGain.gain.setValueAtTime(1.0, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.07);
  } catch { /* AudioContext not available */ }
}

// ─── Suggestion helper ────────────────────────────────────────────────────────

function getSuggestion(likedWines: LikedWine[], dislikedWines: LikedWine[], excludeName: string | null) {
  const liked = new Set(likedWines.flatMap((w) => w.tags));
  const disliked = new Set(dislikedWines.flatMap((w) => w.tags));
  const pool = WINE_REFERENCE.filter((w) => w.name !== excludeName);
  return pool
    .map((w) => ({
      ...w,
      score: w.tags.reduce((s, t) => s + (liked.has(t) ? 1 : 0) - (disliked.has(t) ? 0.5 : 0), 0),
    }))
    .sort((a, b) => b.score - a.score)[0] ?? pool[0]!;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TrailFlow() {
  const { data: session } = useSession();

  // Trail
  const [step, setStep] = useState<TrailStep>("welcome");
  const [isFirstVisit, setIsFirstVisit] = useState(true);
  const [showProfile, setShowProfile] = useState(false);

  // Scan
  const [captureUrl, setCaptureUrl] = useState<string | null>(null);
  const [scannedWine, setScannedWine] = useState<WineData | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [semanticResult, setSemanticResult] = useState<SemanticWineMatch>(null);

  // Reaction
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const [currentMilestone, setCurrentMilestone] = useState<{ emoji: string; text: string } | null>(null);
  const [suggestion, setSuggestion] = useState<(typeof WINE_REFERENCE)[0] | null>(null);

  // Profile data
  const [likedWines, setLikedWines] = useState<LikedWine[]>([]);
  const [dislikedWines, setDislikedWines] = useState<LikedWine[]>([]);
  const [winesTriedTotal, setWinesTriedTotal] = useState(0);
  const [scanHistory, setScanHistory] = useState<ScanEntry[]>([]);

  // Camera
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanButtonRef = useRef<HTMLButtonElement>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // ── First visit detection ──
  useEffect(() => {
    const seen = localStorage.getItem("trailStarted");
    setIsFirstVisit(!seen);
    if (seen) setStep("welcome");
  }, []);

  // ── Camera ──
  useEffect(() => {
    if (step !== "scan") { stopCamera(); return; }
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        const el = videoRef.current;
        if (el) { el.srcObject = stream; await el.play(); }
      } catch { setStep("welcome"); }
    })();
    return () => { cancelled = true; stopCamera(); };
  }, [step, stopCamera]);

  // ── Semantic match after scan ──
  useEffect(() => {
    if (!scannedWine?.description) return;
    let cancelled = false;
    matchWine(scannedWine.description).then((r) => { if (!cancelled) setSemanticResult(r); }).catch(() => {});
    return () => { cancelled = true; };
  }, [scannedWine]);

  // ── localStorage profile ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem("trailProfile");
      if (!raw) return;
      const d = JSON.parse(raw) as { likedWines?: LikedWine[]; dislikedWines?: LikedWine[]; total?: number };
      if (Array.isArray(d.likedWines)) setLikedWines(d.likedWines);
      if (Array.isArray(d.dislikedWines)) setDislikedWines(d.dislikedWines);
      if (typeof d.total === "number") setWinesTriedTotal(d.total);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("trailProfile", JSON.stringify({ likedWines, dislikedWines, total: winesTriedTotal }));
    } catch {}
  }, [likedWines, dislikedWines, winesTriedTotal]);

  // ── Backend sync ──
  useEffect(() => {
    if (!session?.user?.id) return;
    (async () => {
      try {
        const [pr, hr] = await Promise.all([fetch("/api/profile"), fetch("/api/history")]);
        if (pr.ok) {
          const d = await pr.json() as { likedWines?: LikedWine[]; dislikedWines?: LikedWine[]; sessionCount?: number };
          if (Array.isArray(d.likedWines) && d.likedWines.length > 0) {
            setLikedWines(d.likedWines);
            setDislikedWines(Array.isArray(d.dislikedWines) ? d.dislikedWines : []);
            setWinesTriedTotal(d.sessionCount ?? 0);
          }
        }
        if (hr.ok) setScanHistory(await hr.json() as ScanEntry[]);
      } catch {}
    })();
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) return;
    const t = setTimeout(() => {
      fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ likedWines, dislikedWines, sessionCount: winesTriedTotal }),
      }).catch(() => {});
    }, 1000);
    return () => clearTimeout(t);
  }, [session?.user?.id, likedWines, dislikedWines, winesTriedTotal]);

  // ── Handlers ──

  const startTrail = () => {
    localStorage.setItem("trailStarted", "true");
    setIsFirstVisit(false);
    setStep("scan");
  };

  const handleCapture = async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCaptureUrl(dataUrl);
    setScannedWine(null);
    setSemanticResult(null);
    setScanError(null);
    setVote(null);
    setStep("identifying");
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      const data = await res.json() as WineData & { error?: string };
      if (!res.ok || data.error) { setScanError(data.error ?? "Nem sikerült azonosítani"); setStep("result"); }
      else { setScannedWine(data); setStep("result"); }
    } catch { setScanError("Hálózati hiba — próbáld újra"); setStep("result"); }
  };

  const handleVote = (v: "up" | "down") => {
    if (vote) return;
    setVote(v);
    const newTotal = winesTriedTotal + 1;
    setWinesTriedTotal(newTotal);

    if (scannedWine) {
      const SEMANTIC_MIN = 0.72;
      const tagsToUse = semanticResult && semanticResult.score >= SEMANTIC_MIN && semanticResult.tags.length > 0
        ? semanticResult.tags : scannedWine.tags;

      if (v === "up") {
        setLikedWines((prev) => prev.some((w) => w.name === scannedWine.name) ? prev : [...prev, { name: scannedWine.name, tags: tagsToUse }]);
      } else {
        setDislikedWines((prev) => prev.some((w) => w.name === scannedWine.name) ? prev : [...prev, { name: scannedWine.name, tags: tagsToUse }]);
      }

      if (session?.user?.id) {
        fetch("/api/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wineName: scannedWine.name, wineRegion: scannedWine.region, tags: tagsToUse, vote: v }),
        }).then((r) => r.ok ? r.json() : null).then((entry) => {
          if (entry) setScanHistory((prev) => [entry as ScanEntry, ...prev]);
        }).catch(() => {});
      }
    }

    const milestone = MILESTONES[newTotal];
    if (milestone) {
      setCurrentMilestone(milestone);
      setTimeout(() => {
        setCurrentMilestone(null);
        setStep("suggestion");
      }, 2200);
      setStep("milestone");
    } else {
      setStep("suggestion");
    }
  };

  const continueTrail = () => {
    setCaptureUrl(null);
    setScannedWine(null);
    setScanError(null);
    setVote(null);
    setSuggestion(null);
    setStep("scan");
  };

  const tasteProfile = buildTasteProfile(likedWines);
  const tasteRadar = buildTasteRadar(likedWines, dislikedWines);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="relative flex min-h-dvh flex-col">

      {/* ── Top bar ── */}
      <header className="flex items-center justify-between px-5 pt-10 pb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">
            {winesTriedTotal > 0 ? `${winesTriedTotal}. állomás` : "Bortúra"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowProfile(true)}
            className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--ink)] shadow-sm"
          >
            <span>🧬</span>
            <span>Profil</span>
          </button>
          {session ? (
            <button type="button" onClick={() => signOut()} className="text-[10px] text-[var(--muted)]">Ki</button>
          ) : (
            <Link href="/auth/login" className="text-[10px] font-medium text-[var(--accent)]">Be</Link>
          )}
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex flex-1 flex-col px-5 pb-10">

        {/* WELCOME */}
        {step === "welcome" && (
          <div className="animate-screen-in flex flex-1 flex-col">
            <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden">
              <svg className="absolute w-0 h-0" aria-hidden>
                <defs>
                  <filter id="goo">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="blur" />
                    <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -12" />
                  </filter>
                </defs>
              </svg>
              <div className="absolute inset-0 pointer-events-none" style={{ filter: "url(#goo)" }}>
                <div className="animate-blob-morph animate-float-1 absolute w-40 h-40 bg-[var(--accent)] opacity-20" style={{ top: "5%", left: "0%" }} />
                <div className="animate-blob-morph animate-float-2 absolute w-32 h-32 bg-[var(--accent)] opacity-15" style={{ top: "20%", right: "5%", animationDelay: "-4s" }} />
                <div className="animate-blob-morph animate-float-3 absolute w-24 h-24 bg-[var(--accent)] opacity-10" style={{ bottom: "15%", left: "20%", animationDelay: "-2s" }} />
              </div>

              <div className="relative z-10 flex flex-col items-center gap-6 text-center">
                {isFirstVisit ? (
                  <>
                    <p className="text-4xl">🍷</p>
                    <h1 className="text-2xl font-bold text-[var(--ink)]">Üdv a Bortúrán!</h1>
                    <p className="max-w-[240px] text-sm text-[var(--muted)] leading-relaxed">
                      Fotózz le egy bort — mi azonosítjuk, te értékeled, az app tanul.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-4xl">👋</p>
                    <h1 className="text-2xl font-bold text-[var(--ink)]">Üdv vissza!</h1>
                    {winesTriedTotal > 0 && (
                      <p className="text-sm text-[var(--muted)]">{winesTriedTotal} bor mögötted — folytatjuk?</p>
                    )}
                  </>
                )}
                <button
                  type="button"
                  onClick={startTrail}
                  className="animate-blob-morph animate-blob-pulse mt-4 flex h-44 w-44 flex-col items-center justify-center bg-[var(--accent)] text-white shadow-2xl active:scale-90 transition-transform duration-150"
                  style={{ willChange: "border-radius, transform" }}
                >
                  <span className="text-4xl mb-1">📷</span>
                  <span className="text-base font-bold">{isFirstVisit ? "Kezdjük!" : "Folytatom"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SCAN */}
        {step === "scan" && (
          <div className="animate-screen-in flex flex-1 flex-col gap-4">
            <p className="text-center text-sm text-[var(--muted)]">Irányítsd a kamerát a palackra</p>
            <div className="relative w-full overflow-hidden rounded-3xl border border-[var(--border)] bg-black shadow-xl" style={{ height: "65vh" }}>
              <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="h-48 w-32 rounded-2xl border-2 border-white/60" />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep("welcome")}
                className="flex-1 rounded-2xl border border-[var(--border)] bg-white py-3.5 text-sm font-medium text-[var(--ink)] active:scale-95 transition-transform"
              >
                Vissza
              </button>
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
                  handleCapture();
                }}
                className="relative flex-1 overflow-hidden rounded-2xl bg-[var(--accent)] py-3.5 text-sm font-bold text-white active:scale-95 transition-transform"
              >
                Fotózás
              </button>
            </div>
          </div>
        )}

        {/* IDENTIFYING */}
        {step === "identifying" && (
          <div className="animate-screen-in flex flex-1 flex-col items-center justify-center gap-6">
            {captureUrl && (
              <div className="w-full overflow-hidden rounded-3xl border border-[var(--border)] shadow-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={captureUrl} alt="Scan" className="aspect-[4/3] w-full object-cover" />
              </div>
            )}
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 animate-spin text-[var(--accent)]" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              <p className="text-sm text-[var(--muted)]">Azonosítás folyamatban…</p>
            </div>
          </div>
        )}

        {/* RESULT + REACT (egy képernyő) */}
        {(step === "result" || step === "react") && (
          <div className="animate-screen-in flex flex-1 flex-col gap-4">
            {scanError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4">
                <p className="text-sm font-medium text-red-700">{scanError}</p>
                <button type="button" onClick={() => setStep("scan")} className="mt-3 text-sm font-medium text-red-700 underline">Próbáld újra</button>
              </div>
            ) : scannedWine ? (
              <>
                <article className="rounded-2xl border border-[var(--border)] bg-white px-5 py-4 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">Azonosítva</p>
                  <h2 className="mt-1 text-xl font-bold text-[var(--ink)]">{scannedWine.name}</h2>
                  <p className="text-sm text-[var(--muted)]">{scannedWine.region}</p>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--ink)]">{scannedWine.description}</p>
                </article>

                <div className="flex flex-col items-center gap-4 py-4">
                  <p className="text-lg font-bold text-[var(--ink)]">Ízlett?</p>
                  <div className="flex gap-6">
                    {(["up", "down"] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        disabled={vote !== null}
                        onClick={() => handleVote(v)}
                        className={`flex h-20 w-20 items-center justify-center rounded-full border-2 text-4xl shadow-md transition-all duration-200 active:scale-90 disabled:opacity-40 ${
                          vote === v
                            ? "border-[var(--accent)] bg-[var(--accent-soft)] scale-110"
                            : "border-[var(--border)] bg-white"
                        }`}
                      >
                        {v === "up" ? "👍" : "👎"}
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={() => setStep("scan")} className="text-xs text-[var(--muted)] underline underline-offset-2">
                    Újra fotózom
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <svg className="h-5 w-5 animate-spin text-[var(--accent)]" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              </div>
            )}
          </div>
        )}

        {/* MILESTONE */}
        {step === "milestone" && currentMilestone && (
          <div className="animate-screen-in flex flex-1 flex-col items-center justify-center gap-6 text-center">
            <div className="animate-blob-pulse text-8xl">{currentMilestone.emoji}</div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
                {winesTriedTotal}. állomás
              </p>
              <h2 className="mt-2 text-2xl font-bold text-[var(--ink)]">{currentMilestone.text}</h2>
            </div>
          </div>
        )}

        {/* SUGGESTION */}
        {step === "suggestion" && (
          <div className="animate-screen-in flex flex-1 flex-col items-center justify-center gap-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-[var(--ink)]">Kérsz javaslatot?</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">A következő borra</p>
            </div>

            <div className="flex flex-col gap-3 w-full">
              <button
                type="button"
                onClick={() => {
                  const s = getSuggestion(likedWines, dislikedWines, scannedWine?.name ?? null);
                  setSuggestion(s);
                  setStep("show_suggestion" as TrailStep);
                }}
                className="w-full rounded-2xl bg-[var(--accent)] py-4 text-base font-bold text-white active:scale-95 transition-transform shadow-md"
              >
                Igen, mutasd! 🍷
              </button>
              <button
                type="button"
                onClick={continueTrail}
                className="w-full rounded-2xl border border-[var(--border)] bg-white py-4 text-base font-medium text-[var(--ink)] active:scale-95 transition-transform"
              >
                Inkább scannelек →
              </button>
            </div>
          </div>
        )}

        {/* SHOW SUGGESTION */}
        {(step as string) === "show_suggestion" && suggestion && (
          <div className="animate-screen-in flex flex-1 flex-col gap-5 pt-4">
            <article className="rounded-2xl border border-[var(--border)] bg-white px-5 py-4 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">Próbáld ezt</p>
              <h3 className="mt-1 text-xl font-bold text-[var(--ink)]">{suggestion.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{suggestion.description}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {suggestion.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs font-medium text-[var(--accent)]">
                    {tag}
                  </span>
                ))}
              </div>
            </article>

            {likedWines.length >= 3 && (
              <TasteProfileCard profile={tasteProfile} radar={tasteRadar} compact />
            )}

            <button
              type="button"
              onClick={continueTrail}
              className="animate-blob-morph animate-blob-pulse mt-auto flex h-32 w-full flex-col items-center justify-center rounded-3xl bg-[var(--accent)] text-white shadow-xl active:scale-95 transition-transform"
              style={{ willChange: "border-radius" }}
            >
              <span className="text-3xl mb-1">📷</span>
              <span className="text-base font-bold">Következő bor →</span>
            </button>
          </div>
        )}
      </main>

      {/* ── Profile panel (escape hatch) ── */}
      {showProfile && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg)]">
          <div className="flex items-center justify-between px-5 pt-10 pb-4">
            <h2 className="text-lg font-bold text-[var(--ink)]">A te profilod</h2>
            <button
              type="button"
              onClick={() => setShowProfile(false)}
              className="rounded-full border border-[var(--border)] bg-white px-4 py-1.5 text-xs font-medium text-[var(--ink)] shadow-sm"
            >
              ← Vissza a túrára
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-10 space-y-6">
            <TasteProfileCard profile={tasteProfile} radar={tasteRadar} />

            {scanHistory.length > 0 && (
              <section className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Megjárt állomások</p>
                <ul className="space-y-2">
                  {scanHistory.map((entry) => (
                    <li key={entry.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-white px-4 py-3 shadow-sm">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--ink)]">{entry.wineName}</p>
                        <p className="truncate text-xs text-[var(--muted)]">{entry.wineRegion}</p>
                      </div>
                      <span className="ml-3 shrink-0 text-lg">{entry.vote === "up" ? "👍" : "👎"}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {!session && (
              <div className="rounded-2xl border border-[var(--border)] bg-white px-4 py-4 text-center">
                <p className="text-sm text-[var(--muted)]">Jelentkezz be hogy megőrizd a profilodat</p>
                <Link href="/auth/login" className="mt-2 block text-sm font-semibold text-[var(--accent)]">Bejelentkezés →</Link>
              </div>
            )}

            {session && (
              <button type="button" onClick={() => signOut()} className="w-full text-center text-xs text-[var(--muted)]">
                Kilépés
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
