import { createClient } from "@supabase/supabase-js";
import { fetchAllSheetTabs } from "./sheets-client.js";
import { syncTabToSupabase } from "./upsert.js";
import { fetchAppsScriptData } from "./apps-script-client.js";
import { syncQuestResources } from "./sync-apps-script-upsert.js";

async function main() {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH ?? "./service-account.json";
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const appsScriptUrl = process.env.APPS_SCRIPT_URL;

  if (!sheetId || !supabaseUrl || !serviceRoleKey || !appsScriptUrl) {
    console.error(
      "Missing required env vars: GOOGLE_SHEET_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APPS_SCRIPT_URL"
    );
    process.exit(1);
  }

  const client = createClient(supabaseUrl, serviceRoleKey);

  // ── Phase 1: Sync quests + chains from Google Sheets ──────────────────────
  console.log("📋 Phase 1: Fetching Google Sheet tabs...");
  const tabs = await fetchAllSheetTabs(sheetId, keyPath);
  console.log(`Found ${tabs.length} Dofus tab(s): ${tabs.map((t) => t.dofusName).join(", ")}`);

  let totalQuests = 0;
  const allErrors: string[] = [];

  for (const tab of tabs) {
    process.stdout.write(`⚙️  Syncing "${tab.dofusName}"... `);
    const report = await syncTabToSupabase(tab, client);
    console.log(`✅ ${report.questsUpserted} quests`);

    if (report.errors.length > 0) {
      console.warn(`   ⚠️  ${report.errors.length} error(s):`, report.errors);
      allErrors.push(...report.errors);
    }

    totalQuests += report.questsUpserted;
  }

  console.log(`\n✅ Phase 1 complete: ${totalQuests} quests`);

  // ── Phase 2: Sync quest resources from Apps Script ────────────────────────
  console.log("\n📦 Phase 2: Fetching Apps Script data...");
  const appsScriptData = await fetchAppsScriptData(appsScriptUrl);
  console.log(`Last update: ${appsScriptData.metadata.lastUpdate}`);

  process.stdout.write("⚙️  Syncing quest resources... ");
  const resourceReport = await syncQuestResources(appsScriptData, client);
  console.log(`✅ ${resourceReport.resourcesUpserted} resources upserted`);

  if (resourceReport.questsUnmatched.length > 0) {
    console.warn(
      `   ⚠️  ${resourceReport.questsUnmatched.length} quest(s) in Apps Script not found in DB:`,
      resourceReport.questsUnmatched
    );
  }

  if (resourceReport.errors.length > 0) {
    console.error(`   ❌ Errors:`, resourceReport.errors);
    allErrors.push(...resourceReport.errors);
  }

  console.log(`\n✅ Sync complete: ${totalQuests} quests, ${resourceReport.resourcesUpserted} resources`);

  if (allErrors.length > 0) {
    console.error(`❌ ${allErrors.length} total error(s) — check output above`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
