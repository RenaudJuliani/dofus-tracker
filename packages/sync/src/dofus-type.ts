const PRIMORDIAL_SLUGS = new Set([
  "dofus-emeraude", "emeraude",
  "dofus-pourpre",  "pourpre",
  "dofus-turquoise","turquoise",
  "dofus-ivoire",   "ivoire",
  "dofus-ebene",    "ebene",
  "dofus-ocre",     "ocre",
]);

export function getDofusType(slug: string): "primordial" | "secondaire" {
  return PRIMORDIAL_SLUGS.has(slug) ? "primordial" : "secondaire";
}
