import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// ─── Normalisation ────────────────────────────────────────────────────────────

export function normalizeQuestName(name: string): string {
  return name
    .replace(/[\u2018\u2019]/g, "'") // apostrophes typographiques → droite
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Types DofusDB ────────────────────────────────────────────────────────────

interface DofusDBObjective {
  id: number;
  description: string;
  order: number;
}

interface DofusDBAchievement {
  id: number;
  name: string;
  description: string;
  points: number;
  level_required: number;
  category_id: number;
  order: number;
  objectives: DofusDBObjective[];
  rewards: { experience: number; kamas: number; items: unknown[] };
}

interface DofusDBSubcategory {
  id: number;
  name: string;
  achievements: DofusDBAchievement[];
  count: number;
}

interface DofusDBData {
  subcategories: DofusDBSubcategory[];
  total_achievements: number;
}

// ─── Sync ─────────────────────────────────────────────────────────────────────

interface SyncReport {
  achievementsUpserted: number;
  objectivesUpserted: number;
  objectivesMatched: number;
  objectivesUnmatched: number;
  errors: string[];
}

export async function syncAchievements(
  client: ReturnType<typeof createClient>,
  data: DofusDBData
): Promise<SyncReport> {
  const report: SyncReport = {
    achievementsUpserted: 0,
    objectivesUpserted: 0,
    objectivesMatched: 0,
    objectivesUnmatched: 0,
    errors: [],
  };

  // 1. Charger tous les noms de quêtes existants en DB pour le matching
  const { data: questRows, error: questError } = await client
    .from("quests")
    .select("id, name");
  if (questError) {
    report.errors.push(`Failed to fetch quests: ${questError.message}`);
    return report;
  }

  const questNameMap = new Map<string, string>(); // normalizedName → quest uuid
  for (const q of questRows ?? []) {
    questNameMap.set(normalizeQuestName(q.name), q.id);
  }

  // 2. Traiter chaque sous-catégorie
  for (const subcat of data.subcategories) {
    if (!subcat.achievements || subcat.achievements.length === 0) continue;

    // Upsert achievements
    const achievementRows = subcat.achievements.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      points: a.points,
      level_required: a.level_required,
      subcategory_id: subcat.id,
      subcategory_name: subcat.name,
      order_index: a.order,
    }));

    const { error: achError } = await client
      .from("achievements")
      .upsert(achievementRows, { onConflict: "id" });

    if (achError) {
      report.errors.push(`Achievement upsert failed for subcat ${subcat.name}: ${achError.message}`);
      continue;
    }
    report.achievementsUpserted += achievementRows.length;

    // Upsert objectives pour chaque achievement
    for (const a of subcat.achievements) {
      if (!a.objectives || a.objectives.length === 0) continue;

      // Récupérer les quest_id déjà matchés pour ne pas les écraser
      const { data: existing } = await client
        .from("achievement_objectives")
        .select("id, description, quest_id")
        .eq("achievement_id", a.id);

      const existingMap = new Map<string, { id: string; quest_id: string | null }>();
      for (const e of existing ?? []) {
        existingMap.set(normalizeQuestName(e.description), { id: e.id, quest_id: e.quest_id });
      }

      const objectiveRows = a.objectives.map((o) => {
        const normalizedDesc = normalizeQuestName(o.description);
        const existingEntry = existingMap.get(normalizedDesc);
        // Préserver un quest_id déjà matchés
        const resolvedQuestId =
          existingEntry?.quest_id ?? questNameMap.get(normalizedDesc) ?? null;

        if (resolvedQuestId) {
          report.objectivesMatched++;
        } else {
          report.objectivesUnmatched++;
        }

        return {
          ...(existingEntry?.id ? { id: existingEntry.id } : {}),
          achievement_id: a.id,
          order_index: o.order,
          description: o.description,
          quest_id: resolvedQuestId,
        };
      });

      const { error: objError } = await client
        .from("achievement_objectives")
        .upsert(objectiveRows, { onConflict: "id", ignoreDuplicates: false });

      if (objError) {
        report.errors.push(`Objectives upsert failed for achievement ${a.id}: ${objError.message}`);
      } else {
        report.objectivesUpserted += objectiveRows.length;
      }
    }
  }

  return report;
}

// ─── Entry point ─────────────────────────────────────────────────────────────

async function main() {
  const jsonPath = process.argv[2];
  if (!jsonPath) {
    console.error("Usage: tsx src/sync-achievements.ts <path/to/dofusdb_quetes.json>");
    process.exit(1);
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const client = createClient(supabaseUrl, serviceRoleKey);
  const data: DofusDBData = JSON.parse(readFileSync(resolve(jsonPath), "utf-8"));

  console.log(`Syncing ${data.total_achievements} achievements...`);
  const report = await syncAchievements(client, data);

  console.log(`\nDone:`);
  console.log(`   ${report.achievementsUpserted} achievements upserted`);
  console.log(`   ${report.objectivesUpserted} objectives upserted`);
  console.log(`   ${report.objectivesMatched} objectives matched to quests`);
  console.log(`   ${report.objectivesUnmatched} objectives unmatched (manual only)`);

  if (report.errors.length > 0) {
    console.error(`\n${report.errors.length} error(s):`);
    report.errors.forEach((e) => console.error("  -", e));
    process.exit(1);
  }
}

// Only run when executed directly (not when imported by tests)
const isMain =
  process.argv[1] != null &&
  (process.argv[1].endsWith("sync-achievements.ts") ||
    process.argv[1].endsWith("sync-achievements.js"));

if (isMain) {
  main().catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  });
}
