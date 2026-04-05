import { createClient } from "@/lib/supabase/server";
import { getDofusList, getCharacters, getAllProgressForUser } from "@dofus-tracker/db";
import { CharactersClient } from "@/components/characters/CharactersClient";
import { redirect } from "next/navigation";

export default async function CharactersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const [characters, dofusList, allProgress] = await Promise.all([
    getCharacters(supabase, user.id),
    getDofusList(supabase),
    getAllProgressForUser(supabase, user.id),
  ]);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-white">
          Mes <span className="text-dofus-green">Personnages</span>
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          {characters.length} personnage{characters.length !== 1 ? "s" : ""}
        </p>
      </header>

      <CharactersClient
        characters={characters}
        dofusList={dofusList}
        allProgress={allProgress}
        userId={user.id}
      />
    </main>
  );
}
