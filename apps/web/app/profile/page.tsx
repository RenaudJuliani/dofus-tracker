import { createClient } from "@/lib/supabase/server";
import { getCharacters } from "@dofus-tracker/db";
import { CharacterManager } from "@/components/profile/CharacterManager";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const characters = await getCharacters(supabase, user.id);

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-white">
          Mon <span className="text-dofus-green">Profil</span>
        </h1>
        <p className="text-gray-400 mt-1 text-sm">{user.email}</p>
      </header>

      <CharacterManager characters={characters} userId={user.id} />
    </main>
  );
}
