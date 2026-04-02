import type { QuestWithChain } from "@dofus-tracker/types";

interface Props {
  title: string;
  quests: QuestWithChain[];
  dofusColor: string;
  onToggle: (questId: string, completed: boolean) => void;
  onBulkComplete: () => void;
}

export function QuestSection({ title, quests }: Props) {
  return (
    <div className="glass rounded-2xl p-4">
      <h2 className="font-bold text-white mb-2">{title}</h2>
      <p className="text-gray-400 text-sm">{quests.length} quêtes</p>
    </div>
  );
}
