import { useCallback } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  toggleQuestCompletion,
  bulkCompleteSection,
  bulkUncompleteSection,
  getQuestsForDofus,
} from "@dofus-tracker/db";
import type { QuestWithChain, QuestSection } from "@dofus-tracker/types";

interface Params {
  supabase: SupabaseClient;
  characterId: string | null;
  dofusId: string;
  setQuests: React.Dispatch<React.SetStateAction<QuestWithChain[]>>;
}

export function useQuestToggle({ supabase, characterId, dofusId, setQuests }: Params) {
  const handleToggle = useCallback(
    async (questId: string, completed: boolean) => {
      if (!characterId) return;
      setQuests((prev) =>
        prev.map((q) => (q.id === questId ? { ...q, is_completed: completed } : q))
      );
      try {
        await toggleQuestCompletion(supabase, characterId, questId, completed);
      } catch {
        setQuests((prev) =>
          prev.map((q) => (q.id === questId ? { ...q, is_completed: !completed } : q))
        );
      }
    },
    [supabase, characterId, setQuests]
  );

  const handleBulkComplete = useCallback(
    async (section: QuestSection) => {
      if (!characterId) return;
      setQuests((prev) =>
        prev.map((q) =>
          q.chain.section === section ? { ...q, is_completed: true } : q
        )
      );
      try {
        await bulkCompleteSection(supabase, characterId, dofusId, section);
      } catch {
        const fresh = await getQuestsForDofus(supabase, dofusId, characterId);
        setQuests(fresh);
      }
    },
    [supabase, characterId, dofusId, setQuests]
  );

  const handleBulkUncomplete = useCallback(
    async (section: QuestSection) => {
      if (!characterId) return;
      setQuests((prev) =>
        prev.map((q) =>
          q.chain.section === section ? { ...q, is_completed: false } : q
        )
      );
      try {
        await bulkUncompleteSection(supabase, characterId, dofusId, section);
      } catch {
        const fresh = await getQuestsForDofus(supabase, dofusId, characterId);
        setQuests(fresh);
      }
    },
    [supabase, characterId, dofusId, setQuests]
  );

  return { handleToggle, handleBulkComplete, handleBulkUncomplete };
}
