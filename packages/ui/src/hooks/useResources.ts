import { useState } from "react";
import type { Resource } from "@dofus-tracker/types";

export function useResources(resources: Resource[]) {
  const [multiplier, setMultiplier] = useState(1);

  const items = resources.filter((r) => !r.is_kamas);
  const kamas = resources.filter((r) => r.is_kamas);
  const getQuantity = (r: Resource) => r.quantity_per_character * multiplier;

  return { multiplier, setMultiplier, items, kamas, getQuantity };
}
