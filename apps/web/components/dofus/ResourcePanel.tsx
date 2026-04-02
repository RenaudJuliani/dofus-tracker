import type { Resource } from "@dofus-tracker/types";

interface Props {
  resources: Resource[];
  dofusColor: string;
}

export function ResourcePanel({ resources }: Props) {
  return (
    <div className="glass rounded-2xl p-4">
      <h2 className="font-bold text-white mb-2">Ressources</h2>
      <p className="text-gray-400 text-sm">{resources.length} ressources</p>
    </div>
  );
}
