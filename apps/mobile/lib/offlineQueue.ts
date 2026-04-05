import AsyncStorage from "@react-native-async-storage/async-storage";
import { toggleQuestCompletion } from "@dofus-tracker/db";
import type { SupabaseClient } from "@supabase/supabase-js";

const QUEUE_KEY = "offline:queue";

export interface ToggleAction {
  questId: string;
  characterId: string;
  dofusId: string;
  completed: boolean;
  timestamp: number;
}

export async function getQueue(): Promise<ToggleAction[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveQueue(queue: ToggleAction[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Non-fatal
  }
}

export async function addToQueue(action: Omit<ToggleAction, "timestamp">): Promise<void> {
  const queue = await getQueue();
  // Dédupe : si même questId existe déjà, remplacer (last-write-wins)
  const filtered = queue.filter((a) => a.questId !== action.questId);
  filtered.push({ ...action, timestamp: Date.now() });
  await saveQueue(filtered);
}

export async function flushQueue(
  supabase: SupabaseClient,
  onFlushed: (count: number) => void
): Promise<void> {
  const queue = await getQueue();
  if (queue.length === 0) return;

  let flushed = 0;
  const remaining: ToggleAction[] = [];

  for (const action of queue) {
    try {
      await toggleQuestCompletion(supabase, action.characterId, action.questId, action.completed);
      flushed++;
    } catch (err: unknown) {
      const isNetworkError =
        err instanceof TypeError ||
        (err instanceof Error && err.message.toLowerCase().includes("network"));
      if (isNetworkError) {
        // Pas de réseau — stopper, garder le reste en queue
        remaining.push(...queue.slice(queue.indexOf(action)));
        break;
      }
      // Autre erreur (ex: RLS) — supprimer de la queue pour éviter boucle infinie
    }
  }

  await saveQueue(remaining);
  if (flushed > 0) onFlushed(flushed);
}
