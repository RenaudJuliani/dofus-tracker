/**
 * Convert a display name to a URL-safe slug.
 * e.g. "Dofus Émeraude" → "dofus-emeraude"
 */
export function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
