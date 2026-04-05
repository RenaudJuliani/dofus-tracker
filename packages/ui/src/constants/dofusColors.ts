import type { QuestType } from "@dofus-tracker/types";

export const QUEST_TYPE_BADGE_CONFIG: Record<
  QuestType,
  { label: string; color: string }
> = {
  combat_solo: { label: "Combat solo", color: "#ef4444" },
  combat_groupe: { label: "Groupe", color: "#f97316" },
  donjon: { label: "Donjon", color: "#a855f7" },
  metier: { label: "Métier", color: "#eab308" },
  boss: { label: "Boss", color: "#dc2626" },
  succes: { label: "Succès", color: "#06b6d4" },
  horaires: { label: "Horaires", color: "#64748b" },
};

export const DOFUS_CLASSES = [
  "Cra", "Ecaflip", "Eniripsa", "Enutrof", "Feca",
  "Iop", "Masqueraider", "Osamodas", "Pandawa", "Roublard",
  "Sacrieur", "Sadida", "Sram", "Steamer", "Xelor", "Zobal",
  "Eliotrope", "Huppermage", "Ouginak", "Forgelance",
] as const;
