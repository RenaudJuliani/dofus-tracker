import { createClient } from "@supabase/supabase-js";
import { fetchAppsScriptData } from "./apps-script-client.js";
import { syncAllFromAppsScript } from "./sync-apps-script-upsert.js";

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const appsScriptUrl = process.env.APPS_SCRIPT_URL;

  if (!supabaseUrl || !serviceRoleKey || !appsScriptUrl) {
    console.error("Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APPS_SCRIPT_URL");
    process.exit(1);
  }

  const client = createClient(supabaseUrl, serviceRoleKey);

  console.log("📦 Fetching Apps Script data...");
  const data = await fetchAppsScriptData(appsScriptUrl);
  console.log(`Last update: ${data.metadata.lastUpdate}`);

  const dofusCount = Object.keys(data.dofus).length;
  console.log(`Found ${dofusCount} Dofus in Apps Script`);

  console.log("⚙️  Syncing quests, chains, and resources...");
  const report = await syncAllFromAppsScript(data, client);

  console.log(`\n✅ Sync complete: ${report.questsUpserted} quests, ${report.resourcesUpserted} resources`);

  if (report.errors.length > 0) {
    console.error(`❌ ${report.errors.length} error(s):`);
    report.errors.forEach((e) => console.error("  -", e));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
