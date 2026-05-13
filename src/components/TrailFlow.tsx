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
  | "palate_reveal"
  | "suggestion"
  | "show_suggestion"
  | "itallap"
  | "itallap_identifying"
  | "itallap_result";

type WineData = {
  name: string;
  region: string;
  description: string;
  tags: string[];
};

type ItallapWine = {
  name: string;
  region: string;
  description: string;
  tags: string[];
  score: number;
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

// ─── Wine glass hero ──────────────────────────────────────────────────────────

function WineGlassHero({ onTap, label, dark }: { onTap: () => void; label: string; dark?: boolean }) {
  return (
    <button
      type="button"
      onClick={onTap}
      className="flex flex-col items-center gap-4 active:scale-95 transition-transform duration-150"
      aria-label={label}
    >
      <svg
        viewBox="0 0 100 155"
        className="w-52"
        style={{ filter: dark ? "drop-shadow(0 0 32px rgba(180,40,60,0.55))" : "drop-shadow(0 6px 24px rgba(140,28,46,0.22))" }}
        aria-hidden
      >
        <defs>
          <clipPath id="wg-bowl">
            <path d="M 15,5 C 2,45 2,88 42,104 L 58,104 C 98,88 98,45 85,5 Z" />
          </clipPath>
          <linearGradient id="wg-wine" x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0%" stopColor="#c4435a" />
            <stop offset="100%" stopColor="#5a1a28" />
          </linearGradient>
        </defs>

        {/* Glass body */}
        <path
          d="M 15,5 C 2,45 2,88 42,104 L 46,138 L 22,138 L 22,148 C 22,154 78,154 78,148 L 78,138 L 54,138 L 58,104 C 98,88 98,45 85,5 Z"
          fill={dark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.10)"}
        />

        {/* Wine liquid */}
        <g clipPath="url(#wg-bowl)">
          <rect x="-5" y="75" width="110" height="33" fill="url(#wg-wine)" opacity="0.85" />
          <path
            className="animate-wave"
            d="M -40,72 Q -20,63 0,72 Q 20,81 40,72 Q 60,63 80,72 Q 100,81 120,72 Q 140,63 160,72 L 160,78 L -40,78 Z"
            fill="url(#wg-wine)"
            opacity="0.92"
          />
        </g>

        {/* Glass outline */}
        <path
          d="M 15,5 C 2,45 2,88 42,104 L 46,138 L 22,138 L 22,148 C 22,154 78,154 78,148 L 78,138 L 54,138 L 58,104 C 98,88 98,45 85,5"
          fill="none"
          stroke={dark ? "rgba(255,255,255,0.65)" : "#8c1c2c"}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Shine highlight */}
        <path
          d="M 22,18 C 14,48 14,78 37,97"
          fill="none"
          stroke={dark ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.55)"}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>

      <span className={`text-sm font-semibold uppercase tracking-widest ${dark ? "text-[rgba(255,255,255,0.75)]" : "text-[var(--ink)]"}`}>
        {label}
      </span>
    </button>
  );
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
  const [itallapWines, setItallapWines] = useState<ItallapWine[]>([]);

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
    if (step !== "scan" && step !== "itallap") { stopCamera(); return; }
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 720 }, height: { ideal: 1280 } },
          audio: false,
        });
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
        setStep("palate_reveal");
      }, 2200);
      setStep("milestone");
    } else {
      setStep("palate_reveal");
    }
  };

  const handleItallapCapture = async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCaptureUrl(dataUrl);
    setItallapWines([]);
    setStep("itallap_identifying");
    try {
      const res = await fetch("/api/itallap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      const data = await res.json() as unknown;
      if (!Array.isArray(data)) {
        setScanError((data as { error?: string }).error ?? "Nem sikerült olvasni a borlapot");
        setStep("welcome");
        return;
      }
      const wines = data as Array<{ name: string; region: string; description: string; tags: string[] }>;
      const liked = new Set(likedWines.flatMap((w) => w.tags));
      const disliked = new Set(dislikedWines.flatMap((w) => w.tags));
      const scored: ItallapWine[] = wines
        .map((w) => ({
          ...w,
          score: w.tags.reduce((s, t) => s + (liked.has(t) ? 1 : 0) - (disliked.has(t) ? 0.5 : 0), 0),
        }))
        .sort((a, b) => b.score - a.score);
      setItallapWines(scored);
      setStep("itallap_result");
    } catch {
      setScanError("Hálózati hiba — próbáld újra");
      setStep("welcome");
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

  const isDark = step === "welcome";

  return (
    <div className={`relative flex min-h-dvh flex-col transition-colors duration-500 ${isDark ? "bg-[#0a0306]" : "bg-[var(--bg)]"}`}>

      {/* ── Top bar ── */}
      <header className="flex items-center justify-between px-5 pt-10 pb-4">
        <div>
          <p className={`text-[10px] font-semibold uppercase tracking-widest ${isDark ? "text-[rgba(255,255,255,0.3)]" : "text-[var(--muted)]"}`}>
            {winesTriedTotal > 0 ? `${winesTriedTotal}. állomás` : "Bortúra"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowProfile(true)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm ${
              isDark
                ? "border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.07)] text-[rgba(255,255,255,0.8)]"
                : "border-[var(--border)] bg-white text-[var(--ink)]"
            }`}
          >
            <span>🧬</span>
            <span>Profil</span>
          </button>
          {session ? (
            <button type="button" onClick={() => signOut()} className={`text-[10px] ${isDark ? "text-[rgba(255,255,255,0.3)]" : "text-[var(--muted)]"}`}>Ki</button>
          ) : (
            <Link href="/auth/login" className={`text-[10px] font-medium ${isDark ? "text-[rgba(255,255,255,0.6)]" : "text-[var(--accent)]"}`}>Be</Link>
          )}
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex flex-1 flex-col px-5 pb-10">

        {/* WELCOME */}
        {step === "welcome" && (
          <div className="flex flex-1 flex-col items-center py-6" style={{ animation: "screen-in 300ms ease-out" }}>
            {/* Radial wine glow */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: "radial-gradient(ellipse at 50% 110%, rgba(140,28,46,0.38) 0%, transparent 62%)" }}
            />

            {/* Centre piece: heading + bottle + button */}
            <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-5 w-full">
              {/* Heading */}
              <div className="text-center">
                {isFirstVisit ? (
                  <>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[rgba(255,255,255,0.35)]">Bortúra</p>
                    <h1
                      className="mt-3 text-[2.6rem] leading-[1.15] font-bold text-white"
                      style={{ fontFamily: "var(--font-playfair)" }}
                    >
                      Fedezd fel<br />
                      <em>az ízlésedet</em>
                    </h1>
                    <p className="mt-3 text-sm text-[rgba(255,255,255,0.42)] max-w-[210px] mx-auto leading-relaxed">
                      Fotózz le egy bort — az app megtanulja, mi illik hozzád.
                    </p>
                  </>
                ) : (
                  <>
                    <h1
                      className="text-[2.2rem] font-bold text-white"
                      style={{ fontFamily: "var(--font-playfair)" }}
                    >
                      Üdv vissza!
                    </h1>
                    {winesTriedTotal > 0 && (
                      <p className="mt-2 text-sm text-[rgba(255,255,255,0.42)]">{winesTriedTotal} bor mögötted — folytatjuk?</p>
                    )}
                  </>
                )}
              </div>

              {/* 3D wine bottle — Spline iframe embed */}
              <div
                className="animate-float-1 cursor-pointer active:scale-95 transition-transform duration-150 relative overflow-hidden"
                style={{ width: "min(80vw, 320px)", height: "460px" }}
                onClick={startTrail}
              >
                <iframe
                  src="https://my.spline.design/winebottle-PBiCYKhnKM2nyO4JJ6tVWTbu/"
                  style={{ width: "120%", height: "calc(100% + 60px)", border: "none", marginLeft: "-10%", marginTop: "-10px" }}
                  title="3D wine bottle"
                  loading="lazy"
                />
                {/* Wine label overlay */}
                <div
                  className="pointer-events-none absolute"
                  style={{ top: "44%", left: "54%", transform: "translateX(-50%)", width: "68px" }}
                >
                  <div className="rounded bg-[rgba(245,240,225,0.90)] px-2 py-1.5 text-center">
                    <p className="text-[5px] font-bold uppercase tracking-[0.15em] text-[#5a1a28]">Bortúra</p>
                    <p className="text-[8px] font-bold text-[#2e0810]" style={{ fontFamily: "var(--font-playfair)" }}>2024</p>
                    <div className="my-0.5 h-px bg-[rgba(90,26,40,0.25)]" />
                    <p className="text-[5px] text-[#5a1a28] opacity-60">Magyarország</p>
                  </div>
                </div>
              </div>

              {/* Continue button */}
              <button
                type="button"
                onClick={startTrail}
                className="rounded-full border border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.1)] px-8 py-3 text-sm font-semibold uppercase tracking-widest text-[rgba(255,255,255,0.85)] backdrop-blur-sm active:scale-95 transition-transform"
              >
                {isFirstVisit ? "Kezdjük!" : "Folytatom"}
              </button>
            </div>

            {/* Bottom actions */}
            <div className="relative z-10 w-full max-w-sm space-y-2 mt-4">
              {scanHistory.slice(0, 1).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[rgba(255,255,255,0.75)]">{entry.wineName}</p>
                    <p className="truncate text-xs text-[rgba(255,255,255,0.35)]">{entry.wineRegion}</p>
                  </div>
                  <span className="ml-2 text-base">{entry.vote === "up" ? "👍" : "👎"}</span>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setStep("itallap")}
                className="w-full rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)] py-3 text-sm font-medium text-[rgba(255,255,255,0.55)] active:scale-95 transition-transform"
              >
                📋 Étteremben vagy? Borlap fotózása
              </button>
            </div>
          </div>
        )}

        {/* SCAN */}
        {step === "scan" && (
          <div className="animate-screen-in flex flex-1 flex-col gap-4">
            <p className="text-center text-sm text-[var(--muted)]">Irányítsd a kamerát a palackra</p>
            <div className="relative mx-auto overflow-hidden rounded-3xl border border-[var(--border)] bg-black shadow-xl"
                 style={{ width: "min(100%, calc(65vh * 3 / 4))", aspectRatio: "3/4" }}>
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
          <div className="animate-screen-in flex flex-1 flex-col gap-5">
            {scanError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4">
                <p className="text-sm font-medium text-red-700">{scanError}</p>
                <button type="button" onClick={() => setStep("scan")} className="mt-3 text-sm font-medium text-red-700 underline">Próbáld újra</button>
              </div>
            ) : scannedWine ? (
              <>
                {/* Premium wine card */}
                <article className="overflow-hidden rounded-3xl" style={{ boxShadow: "0 8px 40px rgba(140,28,46,0.18)" }}>
                  <div className="bg-gradient-to-br from-[#8c1c2c] to-[#2e0810] px-5 py-5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[rgba(255,255,255,0.4)]">Azonosítva</p>
                    <h2
                      className="mt-1.5 text-2xl font-bold text-white leading-tight"
                      style={{ fontFamily: "var(--font-playfair)" }}
                    >
                      {scannedWine.name}
                    </h2>
                    <p className="mt-0.5 text-sm text-[rgba(255,255,255,0.5)]">{scannedWine.region}</p>
                  </div>
                  <div className="bg-white px-5 py-4">
                    <p className="text-sm leading-relaxed text-[var(--ink)]">{scannedWine.description}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {scannedWine.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-[var(--accent-soft)] px-3 py-0.5 text-xs font-semibold text-[var(--accent)]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>

                {/* Vote */}
                <div className="flex flex-col items-center gap-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Ízlett?</p>
                  <div className="flex w-full gap-3">
                    {(["up", "down"] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        disabled={vote !== null}
                        onClick={() => handleVote(v)}
                        className={`flex flex-1 flex-col items-center gap-2 rounded-2xl border-2 py-5 transition-all duration-200 active:scale-95 disabled:opacity-50 ${
                          vote === v
                            ? v === "up"
                              ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                              : "border-[var(--muted)] bg-[var(--muted)] text-white"
                            : "border-[var(--border)] bg-white text-[var(--ink)]"
                        }`}
                      >
                        <span className="text-3xl">{v === "up" ? "👍" : "👎"}</span>
                        <span className="text-[10px] font-semibold uppercase tracking-wide">
                          {v === "up" ? "Ízlett" : "Nem jött be"}
                        </span>
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

        {/* PALATE REVEAL */}
        {step === "palate_reveal" && (
          <div className="animate-screen-in flex flex-1 flex-col gap-6 pt-2">
            {winesTriedTotal < 3 ? (
              <>
                <div className="text-center">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Ízlésprofil</p>
                  <h2 className="mt-2 text-xl font-bold text-[var(--ink)]">Még alakul a képed...</h2>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-white px-5 py-6 shadow-sm space-y-4">
                  <p className="text-sm text-[var(--muted)] text-center">
                    Még <span className="font-bold text-[var(--ink)]">{3 - winesTriedTotal}</span> bor és látod az ízlésed mintázatát
                  </p>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--border)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
                      style={{ width: `${(winesTriedTotal / 3) * 100}%` }}
                    />
                  </div>
                  <p className="text-center text-xs text-[var(--muted)]">{winesTriedTotal} / 3</p>
                </div>
              </>
            ) : (
              <>
                <div className="text-center">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
                    {winesTriedTotal === 3 ? "Elkészült az első képed!" : "Így változott az ízlésed"}
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-[var(--ink)]">A te bor-DNS-ed</h2>
                </div>
                <TasteProfileCard profile={tasteProfile} radar={tasteRadar} />
              </>
            )}

            <button
              type="button"
              onClick={() => setStep("suggestion")}
              className="mt-auto w-full rounded-2xl bg-[var(--accent)] py-4 text-base font-bold text-white active:scale-95 transition-transform shadow-md"
            >
              Tovább →
            </button>
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
        {/* ITALLAP CAMERA */}
        {step === "itallap" && (
          <div className="animate-screen-in flex flex-1 flex-col gap-4">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Borlap</p>
              <h2 className="mt-1 text-lg font-bold text-[var(--ink)]">Fotózd le az éttermi borlapot</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">Az egész lapot próbáld befogni</p>
            </div>
            <div
              className="relative mx-auto overflow-hidden rounded-3xl border border-[var(--border)] bg-black shadow-xl"
              style={{ width: "min(100%, calc(65vh * 3 / 4))", aspectRatio: "3/4" }}
            >
              <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover" />
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
                type="button"
                onClick={handleItallapCapture}
                className="flex-1 rounded-2xl bg-[var(--accent)] py-3.5 text-sm font-bold text-white active:scale-95 transition-transform"
              >
                Fotózás
              </button>
            </div>
          </div>
        )}

        {/* ITALLAP IDENTIFYING */}
        {step === "itallap_identifying" && (
          <div className="animate-screen-in flex flex-1 flex-col items-center justify-center gap-6">
            {captureUrl && (
              <div className="w-full overflow-hidden rounded-3xl border border-[var(--border)] shadow-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={captureUrl} alt="Borlap" className="aspect-[4/3] w-full object-cover" />
              </div>
            )}
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 animate-spin text-[var(--accent)]" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              <p className="text-sm text-[var(--muted)]">Borlap feldolgozása…</p>
            </div>
          </div>
        )}

        {/* ITALLAP RESULT */}
        {step === "itallap_result" && itallapWines.length > 0 && (
          <div className="animate-screen-in flex flex-1 flex-col gap-4">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Borlap</p>
              <h2 className="mt-1 text-xl font-bold text-[var(--ink)]">
                {likedWines.length > 0 ? "A te borlapod" : `${itallapWines.length} bor a lapon`}
              </h2>
              {likedWines.length > 0 && (
                <p className="mt-1 text-xs text-[var(--muted)]">Az ízlésedhez illesztve</p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {itallapWines.map((wine, i) => (
                <article
                  key={i}
                  className={`rounded-2xl border px-4 py-3 shadow-sm ${
                    i === 0 && likedWines.length > 0
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-[var(--border)] bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[var(--ink)] leading-tight">{wine.name}</p>
                      <p className="text-xs text-[var(--muted)]">{wine.region}</p>
                    </div>
                    {i === 0 && likedWines.length > 0 && (
                      <span className="shrink-0 rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-bold text-white">
                        Neked való
                      </span>
                    )}
                  </div>
                  {wine.description && (
                    <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">{wine.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {wine.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-[var(--border)] px-2 py-0.5 text-[10px] text-[var(--muted)]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setStep("welcome")}
              className="w-full rounded-2xl border border-[var(--border)] bg-white py-4 text-sm font-medium text-[var(--ink)] active:scale-95 transition-transform shadow-sm"
            >
              ← Vissza
            </button>
          </div>
        )}
      </main>

      {/* ── Profile panel (escape hatch) ── */}
      {showProfile && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg)]">
          <div className="flex items-center justify-between px-5 pt-10 pb-4">
            <h2 className="text-lg font-bold text-[var(--ink)]">Megjárt állomások</h2>
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
