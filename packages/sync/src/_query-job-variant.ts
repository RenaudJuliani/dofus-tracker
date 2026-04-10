import { createClient } from "@supabase/supabase-js";

const client = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 1. Quels dofus ont des quêtes avec job_variant ?
const { data: dofusWithJob } = await client
  .from("dofus_quest_chains")
  .select("dofus_id, job_variant, dofus!inner(name)")
  .not("job_variant", "is", null)
  .order("dofus_id");

const byDofus = new Map<string, { name: string; paysan: number; alchimiste: number }>();
for (const row of dofusWithJob ?? []) {
  const name = (row.dofus as unknown as { name: string }).name;
  const key = row.dofus_id as string;
  if (!byDofus.has(key)) byDofus.set(key, { name, paysan: 0, alchimiste: 0 });
  const entry = byDofus.get(key)!;
  if (row.job_variant === "paysan") entry.paysan++;
  else if (row.job_variant === "alchimiste") entry.alchimiste++;
}

console.log("\n=== Dofus avec job_variant ===");
for (const [, { name, paysan, alchimiste }] of byDofus) {
  console.log(`  ${name}: paysan=${paysan}, alchimiste=${alchimiste}`);
}

// 2. Détail des quêtes job_variant pour le DDG
const { data: ddgQuests } = await client
  .from("dofus_quest_chains")
  .select("quest_id, job_variant, sub_section, order_index, quests!inner(name)")
  .eq("dofus_id", (await client.from("dofus").select("id").eq("slug", "dofus-des-glaces").single()).data!.id)
  .not("job_variant", "is", null)
  .order("order_index");

console.log("\n=== DDG — quêtes job_variant (ordre index) ===");
for (const q of ddgQuests ?? []) {
  const questName = (q.quests as unknown as { name: string }).name;
  console.log(`  [${q.order_index}] ${q.job_variant.padEnd(12)} | ${q.sub_section ?? "—"} | ${questName}`);
}

// 3. Vérif parité : même nombre de quêtes paysan / alchimiste par sub_section ?
const groups = new Map<string, { paysan: number; alchimiste: number }>();
for (const q of ddgQuests ?? []) {
  const key = q.sub_section ?? "null";
  if (!groups.has(key)) groups.set(key, { paysan: 0, alchimiste: 0 });
  const g = groups.get(key)!;
  if (q.job_variant === "paysan") g.paysan++;
  else if (q.job_variant === "alchimiste") g.alchimiste++;
}

console.log("\n=== Parité paysan/alchimiste par sub_section ===");
for (const [section, { paysan, alchimiste }] of groups) {
  const ok = paysan === alchimiste ? "✓" : "✗";
  console.log(`  ${ok} ${section}: paysan=${paysan}, alchimiste=${alchimiste}`);
}
