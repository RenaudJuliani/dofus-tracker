import Link from "next/link";
import Image from "next/image";
import type { Dofus, DofusProgress } from "@dofus-tracker/types";

interface Props {
  dofus: Dofus;
  progress: DofusProgress | null;
  loading?: boolean;
}

export function DofusCard({ dofus, progress, loading }: Props) {
  const pct = Math.min(100, progress?.progress_pct ?? 0);
  const completed = progress?.completed_quests ?? 0;
  const total = progress?.total_quests ?? 0;

  return (
    <Link href={`/dofus/${dofus.slug}`} className="block">
      <div className="glass-hover rounded-2xl p-5 flex flex-col gap-4 h-full">
        {/* Egg image */}
        <div className="flex justify-center">
          <div className="w-20 h-20 animate-float relative">
            {dofus.image_url ? (
              <Image
                src={dofus.image_url}
                alt={dofus.name}
                fill
                className="object-contain"
              />
            ) : (
              <div
                className="w-full h-full rounded-full opacity-70"
                style={{
                  background: `radial-gradient(circle at 35% 35%, ${dofus.color}dd, ${dofus.color}44)`,
                  boxShadow: `0 0 20px ${dofus.color}44`,
                }}
              />
            )}
          </div>
        </div>

        {/* Name + type */}
        <div>
          <h3 className="font-bold text-white text-center leading-tight">{dofus.name}</h3>
          <p className="text-xs text-gray-400 text-center capitalize mt-0.5">{dofus.type}</p>
        </div>

        {/* Progress */}
        <div className="mt-auto">
          {loading ? (
            <div className="animate-pulse space-y-1.5">
              <div className="h-3 bg-white/10 rounded w-3/4" />
              <div className="h-1.5 bg-white/10 rounded" />
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs text-gray-400">{completed} / {total} quêtes</span>
                <span className="text-sm font-bold" style={{ color: dofus.color }}>
                  {pct}%
                </span>
              </div>
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${dofus.color}aa, ${dofus.color})`,
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
