import { useState } from "react";
import type { AggregatedResource } from "@dofus-tracker/types";

export function useResources(resources: AggregatedResource[]) {
  const [multiplier, setMultiplier] = useState(1);

  const items = resources.filter((r) => !r.is_kamas);
  const kamas = resources.filter((r) => r.is_kamas);
  const getQuantity = (r: AggregatedResource) => r.quantity * multiplier;

  return { multiplier, setMultiplier, items, kamas, getQuantity };
}
