import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCharacters } from "@dofus-tracker/db";
import { CharacterSelector } from "./CharacterSelector";

interface Props {
  userId: string;
}

export async function Navbar({ userId }: Props) {
  const supabase = await createClient();
  const characters = await getCharacters(supabase, userId);

  return (
    <nav className="glass border-b border-white/5 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 animate-glow">
          <span className="text-xl">🥚</span>
          <span className="font-bold text-dofus-green tracking-wide">Dofus Tracker</span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <CharacterSelector characters={characters} />

          <Link href="/profile" className="text-sm text-gray-400 hover:text-white transition-colors">
            Profil
          </Link>

          <form action="/auth/signout" method="post">
            <button type="submit" className="text-sm text-gray-400 hover:text-red-400 transition-colors">
              Déconnexion
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
