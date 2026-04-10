"use client";

import Image from "next/image";
import Link from "next/link";
import type { QuestSearchResult } from "@dofus-tracker/types";

interface Props {
  results: QuestSearchResult[];
  query: string;
  loading: boolean;
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{text}</span>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-dofus-green/30 text-white rounded-sm px-0.5 not-italic">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export function QuestSearchResults({ results, query, loading }: Props) {
  if (loading) {
    return <p className="text-gray-400 text-sm animate-pulse py-4">Recherche…</p>;
  }
  if (results.length === 0) {
    return (
      <p className="text-gray-500 text-sm py-4">
        Aucune quête trouvée pour &laquo;&nbsp;{query}&nbsp;&raquo;
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 mb-3">
        {results.length} résultat{results.length > 1 ? "s" : ""}
      </p>
      {results.map((r) => (
        <Link
          key={`${r.quest_id}-${r.dofus_id}`}
          href={`/dofus/${r.dofus_slug}?highlight=${r.quest_slug}`}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 transition-colors"
        >
          <div className="shrink-0 w-8 h-8 relative">
            {r.dofus_image_url ? (
              <Image src={r.dofus_image_url} alt={r.dofus_name} fill className="object-contain" />
            ) : (
              <div
                className="w-8 h-8 rounded-full opacity-80"
                style={{ background: `radial-gradient(circle at 35% 35%, ${r.dofus_color}dd, ${r.dofus_color}44)` }}
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              <HighlightMatch text={r.quest_name} query={query} />
            </p>
            <p className="text-xs text-gray-500 truncate">
              {r.dofus_name}
              {r.sub_section ? ` · ${r.sub_section}` : ""}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
