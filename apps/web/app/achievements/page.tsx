import { createClient } from "@/lib/supabase/server";
import {
  getAchievementSubcategories,
  getAchievementsForCharacter,
  getCharacters,
} from "@dofus-tracker/db";
import { AchievementsClient } from "@/components/achievements/AchievementsClient";
import { redirect } from "next/navigation";

interface Props {
  searchParams: Promise<{ cat?: string }>;
}

export default async function AchievementsPage({ searchParams }: Props) {
  const { cat } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const characters = await getCharacters(supabase, user.id);
  if (characters.length === 0) redirect("/profile");

  const defaultCharacterId = characters[0].id;

  const subcategories = await getAchievementSubcategories(supabase, defaultCharacterId);

  const initialCatId = cat ? (parseInt(cat, 10) || null) : (subcategories[0]?.subcategory_id ?? null);
  const initialAchievements = initialCatId
    ? await getAchievementsForCharacter(supabase, initialCatId, defaultCharacterId)
    : [];

  return (
    <AchievementsClient
      subcategories={subcategories}
      initialAchievements={initialAchievements}
      initialCatId={initialCatId}
    />
  );
}
