"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json() as { error?: string };
      setError(data.error ?? "Regisztráció sikertelen");
      setLoading(false);
      return;
    }

    await signIn("credentials", { email, password, redirect: false });
    router.push("/");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--ink)]">Regisztráció</h1>
          <p className="text-sm text-[var(--muted)]">Mentsd el az ízprofilod</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--ink)]">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
              placeholder="email@example.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--ink)]">Jelszó</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
              placeholder="minimum 8 karakter"
            />
          </div>

          {error && (
            <p className="text-sm font-medium text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[var(--accent)] py-4 text-base font-semibold text-white transition duration-150 active:scale-95 disabled:opacity-50"
          >
            {loading ? "Regisztráció…" : "Regisztráció"}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--muted)]">
          Már van fiókod?{" "}
          <Link href="/auth/login" className="font-medium text-[var(--accent)]">
            Bejelentkezés
          </Link>
        </p>
      </div>
    </div>
  );
}
