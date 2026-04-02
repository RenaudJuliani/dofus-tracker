import type { Dofus, QuestWithChain } from "@dofus-tracker/types";

interface Props {
  dofus: Dofus;
  allDofus: Dofus[];
  quests: QuestWithChain[];
  completedCount: number;
}

export function DofusHeader({ dofus, completedCount, quests }: Props) {
  return (
    <div className="glass rounded-2xl p-6">
      <h1 className="text-2xl font-bold text-white">{dofus.name}</h1>
      <p className="text-gray-400">{completedCount}/{quests.length} quêtes</p>
    </div>
  );
}
