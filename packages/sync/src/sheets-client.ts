import { google } from "googleapis";
import { readFile } from "fs/promises";

export interface SheetTab {
  dofusName: string; // e.g. "Dofus Émeraude"
  dofusSlug: string; // e.g. "emeraude"
  rows: string[][];  // raw cell values, row-major
}

async function loadServiceAccount(keyPath: string): Promise<object> {
  const raw = await readFile(keyPath, "utf-8");
  return JSON.parse(raw);
}

/**
 * Fetch all tabs from the Google Sheet.
 * Each tab = one Dofus. Tabs named "README", "Template", "Légende",
 * or starting with "_" are skipped.
 */
export async function fetchAllSheetTabs(
  sheetId: string,
  keyPath: string
): Promise<SheetTab[]> {
  const credentials = await loadServiceAccount(keyPath);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  // Get all tab names
  const metaRes = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const sheetTabs = metaRes.data.sheets ?? [];

  const SKIP_TABS = new Set(["README", "Template", "Légende"]);
  const results: SheetTab[] = [];

  for (const tab of sheetTabs) {
    const tabName = tab.properties?.title ?? "";
    if (tabName.startsWith("_") || SKIP_TABS.has(tabName)) continue;

    const valuesRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `'${tabName}'`,
    });

    const rows = (valuesRes.data.values ?? []) as string[][];

    // Derive slug: normalize accents, lowercase, replace non-alphanumeric with hyphen
    const slug = tabName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    results.push({ dofusName: tabName, dofusSlug: slug, rows });
  }

  return results;
}
