import { createClient } from "@/lib/supabase/server";
import { getDofusList, getCharacters } from "@dofus-tracker/db";
import { DofusGrid } from "@/components/home/DofusGrid";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mes Dofus — Dofus Tracker",
  description: "Suivez votre progression vers tous les Dofus Primordiaux et Secondaires.",
};

export default async function DofusPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

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
