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
  sub_section: string | null;
  order_index: number;
  group_id: string | null;
  quest_types: QuestType[];
  combat_count: number | null;
  is_avoidable: boolean;
}

/** Ressource requise pour une quête spécifique */
export interface QuestResource {
  id: string;
  quest_id: string;
  name: string;
  quantity: number;
  is_kamas: boolean;
}

/** Ressource agrégée (somme de toutes les quêtes d'un Dofus) — calculée côté client */
export interface AggregatedResource {
  name: string;
  quantity: number;
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
  character_class: string;
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
  progress_pct: number;
}

/** Quest enriched with chain metadata + completion status + per-quest resources */
export interface QuestWithChain extends Quest {
  chain: DofusQuestChain;
  is_completed: boolean;
  shared_dofus_ids: string[];
  resources: QuestResource[];
}

export interface QuestProgressCounts {
  completed: number;
  total: number;
}

/** Dofus enriched with quest lists + aggregated resources for the detail page */
export interface DofusDetail extends Dofus {
  prerequisites: QuestWithChain[];
  main_quests: QuestWithChain[];
  resources: AggregatedResource[];
  progress: QuestProgressCounts;
}
