import { createClient } from "@supabase/supabase-js";
import { fetchAllSheetTabs } from "./sheets-client.js";
import { syncTabToSupabase } from "./upsert.js";

async function main() {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH ?? "./service-account.json";
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!sheetId || !supabaseUrl || !serviceRoleKey) {
    console.error(
      "Missing required env vars: GOOGLE_SHEET_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
    );
    process.exit(1);
  }

  const client = createClient(supabaseUrl, serviceRoleKey);

  console.log("📋 Fetching Google Sheet tabs...");
  const tabs = await fetchAllSheetTabs(sheetId, keyPath);
  console.log(
    `Found ${tabs.length} Dofus tab(s): ${tabs.map((t) => t.dofusName).join(", ")}`
  );

  let totalQuests = 0;
  let totalResources = 0;
  const allErrors: string[] = [];

  for (const tab of tabs) {
    process.stdout.write(`⚙️  Syncing "${tab.dofusName}"... `);
    const report = await syncTabToSupabase(tab, client);
    console.log(`✅ ${report.questsUpserted} quests, ${report.resourcesUpserted} resources`);

    if (report.errors.length > 0) {
      console.warn(`   ⚠️  ${report.errors.length} error(s):`, report.errors);
      allErrors.push(...report.errors);
    }

    totalQuests += report.questsUpserted;
    totalResources += report.resourcesUpserted;
  }

  console.log(`\n✅ Sync complete: ${totalQuests} quests, ${totalResources} resources`);

  if (allErrors.length > 0) {
    console.error(`❌ ${allErrors.length} total error(s) — check output above`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
