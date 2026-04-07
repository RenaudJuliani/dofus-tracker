"use client";

import { useState } from "react";
import type { AggregatedResource } from "@dofus-tracker/types";

const PRESETS = [1, 2, 3, 4, 5];

interface Props {
  resources: AggregatedResource[];
  dofusColor: string;
}

export function ResourcePanel({ resources, dofusColor }: Props) {
  const [multiplier, setMultiplier] = useState(1);
  const [copied, setCopied] = useState<string | null>(null);

  function copyToClipboard(name: string) {
    navigator.clipboard.writeText(name).then(() => {
      setCopied(name);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  const formatNumber = (n: number) =>
    n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });

  const kamas = resources.filter((r) => r.is_kamas);
  const items = resources.filter((r) => !r.is_kamas);

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div
        className="px-5 py-3.5 border-b border-white/5"
        style={{ borderTop: `2px solid ${dofusColor}44` }}
      >
        <h2 className="font-bold text-white">Ressources nécessaires</h2>
      </div>

      <div className="px-5 py-3 border-b border-white/5">
        <p className="text-xs text-gray-400 mb-2">Personnages</p>
        <div className="flex gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setMultiplier(p)}
              className={`flex-1 py-1 text-sm font-semibold rounded-lg transition-all ${
                multiplier === p ? "text-black" : "btn-secondary"
              }`}
              style={
                multiplier === p
                  ? { background: `linear-gradient(135deg, ${dofusColor}, ${dofusColor}cc)` }
                  : {}
              }
            >
              ×{p}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-white/[0.04] max-h-[60vh] overflow-y-auto">
        {items.map((resource) => (
          <button
            key={resource.name}
            onClick={() => copyToClipboard(resource.name)}
            className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-white/5 transition-colors text-left group"
            title={`Copier "${resource.name}"`}
          >
            <span className="text-sm text-white flex-1 min-w-0 truncate">
              {copied === resource.name ? (
                <span className="text-dofus-green text-xs font-semibold">✓ Copié !</span>
              ) : resource.name}
            </span>
            <span className="text-sm font-bold shrink-0" style={{ color: dofusColor }}>
              {formatNumber(resource.quantity * multiplier)}
            </span>
          </button>
        ))}
      </div>

      {kamas.length > 0 && (
        <div className="border-t border-white/5 px-5 py-3 bg-yellow-500/5">
          {kamas.map((k) => (
            <div key={k.name} className="flex items-center gap-3">
              <span className="text-sm text-white flex-1">{k.name}</span>
              <span className="text-sm font-bold text-yellow-400">
                {formatNumber(k.quantity * multiplier)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="px-5 py-3 border-t border-white/5">
        <p className="text-xs text-gray-500 text-center">
          {items.length} type{items.length > 1 ? "s" : ""} de ressources
          {multiplier > 1 ? ` · ×${multiplier} personnages` : ""}
        </p>
      </div>
    </div>
  );
}
