"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function AuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  async function handleOAuth(provider: "google" | "discord") {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <div className="glass p-8 w-full max-w-md rounded-2xl">
      <div className="text-center mb-8">
        <h1 className="flex flex-col items-center gap-0.5">
          <span className="text-5xl font-black text-dofus-green tracking-[0.15em] uppercase">Dofus</span>
          <span className="text-xl font-black text-white tracking-[0.5em] uppercase">Tracker</span>
        </h1>
      </div>
      <h2 className="text-2xl font-bold text-white mb-6">
        {mode === "login" ? "Connexion" : "Créer un compte"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className="input"
          data-testid="email-input"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe"
          required
          className="input"
          data-testid="password-input"
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full"
          data-testid="submit-btn"
        >
          {loading ? "..." : mode === "login" ? "Se connecter" : "S'inscrire"}
        </button>
      </form>

      <div className="mt-4 space-y-2">
        <button
          onClick={() => handleOAuth("google")}
          className="btn-secondary w-full"
        >
          Continuer avec Google
        </button>
        <button
          onClick={() => handleOAuth("discord")}
          className="btn-secondary w-full"
        >
          Continuer avec Discord
        </button>
      </div>

      <button
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
        className="mt-4 text-sm text-gray-400 hover:text-white transition-colors"
      >
        {mode === "login"
          ? "Pas de compte ? S'inscrire"
          : "Déjà un compte ? Se connecter"}
      </button>
    </div>
  );
}
