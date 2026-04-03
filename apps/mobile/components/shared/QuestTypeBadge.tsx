import { View, Text } from "react-native";
import { QUEST_TYPE_BADGE_CONFIG } from "@dofus-tracker/ui";
import type { QuestType } from "@dofus-tracker/types";

interface Props {
  type: QuestType;
  combatCount?: number | null;
}

export function QuestTypeBadge({ type, combatCount }: Props) {
  const { label, color } = QUEST_TYPE_BADGE_CONFIG[type];
  const displayLabel =
    type === "combat_solo" && combatCount && combatCount > 1
      ? `${label} ×${combatCount}`
      : label;

  return (
    <View
      style={{
        backgroundColor: `${color}22`,
        borderColor: `${color}44`,
        borderWidth: 1,
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 2,
      }}
    >
      <Text style={{ color, fontSize: 11, fontWeight: "600" }}>{displayLabel}</Text>
    </View>
  );
}
