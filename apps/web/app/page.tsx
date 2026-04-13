import { createClient } from "@/lib/supabase/server";
import { getDofusList, getCharacters } from "@dofus-tracker/db";
import { DofusGrid } from "@/components/home/DofusGrid";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dofus Tracker – Suivi de progression Dofus Retro",
  description:
    "Suivez votre progression vers tous les Dofus Primordiaux et Secondaires sur Dofus Retro. Gérez vos quêtes, succès et ressources par personnage.",
  keywords: ["Dofus", "Dofus Retro", "tracker", "progression", "quêtes", "succès", "Dofus Emeraude", "Dofus Ocre"],
  openGraph: {
    title: "Dofus Tracker",
    description: "Suivez votre progression vers tous les Dofus sur Dofus Retro.",
    url: "https://dofus-tracker-ten.vercel.app",
    siteName: "Dofus Tracker",
    locale: "fr_FR",
    type: "website",
  },
};

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <LandingPage />;
  }

  const [dofusList, characters] = await Promise.all([
    getDofusList(supabase),
    getCharacters(supabase, user.id),
  ]);

  if (characters.length === 0) redirect("/profile");

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-white">
          Mes <span className="text-dofus-green">Dofus</span>
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          {dofusList.length} Dofus disponibles · Sélectionne un personnage pour voir ta progression
        </p>
      </header>

      <DofusGrid dofusList={dofusList} />
    </main>
  );
}

function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-5xl font-black text-white mb-4">
        Dofus <span className="text-dofus-green">Tracker</span>
      </h1>
      <p className="text-xl text-gray-400 max-w-xl mb-4">
        Suivez votre progression vers tous les Dofus Primordiaux et Secondaires sur{" "}
        <strong className="text-white">Dofus Retro</strong>.
      </p>
      <p className="text-gray-500 max-w-lg mb-10">
        Gérez vos quêtes, succès et ressources par personnage. Synchronisé sur le web et sur mobile.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 mb-16">
        <Link
          href="/auth/login"
          className="bg-dofus-green text-black font-bold px-8 py-3 rounded-xl hover:brightness-110 transition"
        >
          Se connecter
        </Link>
        <Link
          href="/auth/login"
          className="border border-white/20 text-white font-semibold px-8 py-3 rounded-xl hover:bg-white/5 transition"
        >
          Créer un compte
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl w-full text-left">
        {[
          {
            icon: "📋",
            title: "Suivi de quêtes",
            desc: "Toutes les quêtes nécessaires à chaque Dofus, filtrées selon votre alignement et métier.",
          },
          {
            icon: "🏆",
            title: "Succès de quêtes",
            desc: "Progressez dans les succès liés aux quêtes, validés automatiquement quand la quête est cochée.",
          },
          {
            icon: "📦",
            title: "Ressources",
            desc: "Visualisez les ressources et kamas nécessaires pour vos quêtes restantes.",
          },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="bg-white/5 border border-white/10 rounded-xl p-5">
            <div className="text-2xl mb-2">{icon}</div>
            <h2 className="font-semibold text-white mb-1">{title}</h2>
            <p className="text-sm text-gray-400">{desc}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
