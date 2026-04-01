export type DofusType = "primordial" | "secondaire";

export type QuestType =
  | "combat_solo"
  | "combat_groupe"
  | "donjon"
  | "metier"
  | "boss"
  | "succes"
  | "horaires";

export type QuestSection = "prerequisite" | "main";

export interface Dofus {
  id: string;
  name: string;
  slug: string;
  type: DofusType;
  color: string;
  description: string;
  recommended_level: number;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Quest {
  id: string;
  name: string;
  slug: string;
  dofuspourlesnoobs_url: string | null;
  created_at: string;
}

export interface DofusQuestChain {
  id: string;
  dofus_id: string;
  quest_id: string;
  section: QuestSection;
  order_index: number;
  group_id: string | null;
  quest_types: QuestType[];
  combat_count: number | null;
  is_avoidable: boolean;
}

export interface Resource {
  id: string;
  name: string;
  icon_emoji: string;
  dofus_id: string;
  quantity_per_character: number;
  is_kamas: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Character {
  id: string;
  user_id: string;
  name: string;
  character_class: string;  // renamed from 'class' (reserved keyword)
  created_at: string;
}

export interface UserQuestCompletion {
  id: string;
  character_id: string;
  quest_id: string;
  completed_at: string;
}

export interface DofusProgress {
  character_id: string;
  user_id: string;
  character_name: string;
  dofus_id: string;
  dofus_name: string;
  total_quests: number;
  completed_quests: number;
  /**
   * Percentage 0-100. Computed via SQL ROUND(numeric).
   * Supabase may return this as a string — cast with Number() in packages/db.
   */
  progress_pct: number;
}

/** Quest enriched with chain metadata + completion status for a given character */
export interface QuestWithChain extends Quest {
  chain: DofusQuestChain;
  is_completed: boolean;
  /**
   * IDs of other Dofus that also require this quest.
   * Computed via a secondary query on dofus_quest_chains — not a DB column.
   * Returns [] if this quest is unique to one Dofus.
   */
  shared_dofus_ids: string[];
}

export interface QuestProgressCounts {
  completed: number;
  total: number;
}

/** Dofus enriched with quest lists + resources for the detail page */
export interface DofusDetail extends Dofus {
  prerequisites: QuestWithChain[];
  main_quests: QuestWithChain[];
  resources: Resource[];
  progress: QuestProgressCounts;
}
