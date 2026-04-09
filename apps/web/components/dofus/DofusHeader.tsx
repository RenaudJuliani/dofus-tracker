import Image from "next/image";
import Link from "next/link";
import type { Dofus, QuestWithChain } from "@dofus-tracker/types";

interface Props {
  dofus: Dofus;
  allDofus: Dofus[];
  quests: QuestWithChain[];
  completedCount: number;
}

export function DofusHeader({ dofus, allDofus, quests, completedCount }: Props) {
  const total = quests.length;
  const remaining = total - completedCount;
  const pct = total > 0 ? Math.min(100, Math.round((completedCount / total) * 100)) : 0;

  // Compute which other Dofus share quests with this one
  const sharedDofusIds = new Set(quests.flatMap((q) => q.shared_dofus_ids));
  const sharedDofus = allDofus.filter(
    (d) => sharedDofusIds.has(d.id) && d.id !== dofus.id
  );

  // Count shared quests per Dofus
  const sharedCountPerDofus = new Map<string, number>();
  for (const quest of quests) {
    for (const did of quest.shared_dofus_ids) {
      sharedCountPerDofus.set(did, (sharedCountPerDofus.get(did) ?? 0) + 1);
    }
  }

  return (
    <div className="glass rounded-2xl p-6 space-y-5">
      {/* Egg + title row */}
      <div className="flex items-start gap-5">
        <div className="w-24 h-24 shrink-0 animate-float relative">
          {dofus.image_url ? (
            <Image
              src={dofus.image_url}
              alt={dofus.name}
              fill
              className="object-contain"
              priority
            />
          ) : (
            <div
              className="w-full h-full rounded-full opacity-80"
              style={{
                background: `radial-gradient(circle at 35% 35%, ${dofus.color}dd, ${dofus.color}44)`,
                boxShadow: `0 0 30px ${dofus.color}44`,
              }}
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-extrabold text-white leading-tight">{dofus.name}</h1>
          <p className="text-sm text-gray-400 capitalize mt-0.5">{dofus.type}</p>
          {dofus.description && (
            <p className="text-sm text-gray-300 mt-2 leading-relaxed">{dofus.description}</p>
          )}
          {dofus.recommended_level > 0 && (
            <p className="text-xs text-gray-500 mt-1">Niveau recommandé : {dofus.recommended_level}</p>
          )}
        </div>
      </div>

      {/* Progress stats */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <div className="flex gap-4 text-sm">
            <span className="text-dofus-green font-semibold">{completedCount} complétées</span>
            <span className="text-gray-400">{remaining} restantes</span>
            <span className="text-gray-500">{total} total</span>
          </div>
          <span className="text-xl font-extrabold" style={{ color: dofus.color }}>
            {pct}%
          </span>
        </div>
        <div className="progress-bar-track">
          <div
            className="progress-bar-fill"
            style={{
              width: `${pct}%`,
              background: `linear-gradient(90deg, ${dofus.color}99, ${dofus.color})`,
            }}
          />
        </div>
      </div>

      {/* Shared quests info */}
      {sharedDofus.length > 0 && (
        <div className="border-t border-white/5 pt-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Quêtes partagées avec
          </h3>
          <div className="flex flex-wrap gap-2">
            {sharedDofus.map((d) => (
              <Link
                key={d.id}
                href={`/dofus/${d.slug}`}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
                style={{
                  background: `${d.color}22`,
                  border: `1px solid ${d.color}44`,
                  color: d.color,
                }}
              >
                <span>{d.name}</span>
                <span className="opacity-60">×{sharedCountPerDofus.get(d.id)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
