export function classImageUrl(characterClass: string, gender: "m" | "f" | undefined): string | null {
  if (!characterClass) return null;
  return `/images/classes/${characterClass.toLowerCase()}_${gender ?? "m"}.png`;
}
