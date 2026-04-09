import { View, Text } from "react-native";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  note?: string | null;
}

export function QuestGroupBox({ children, note }: Props) {
  const borderColor = note ? "#22d3ee44" : "#f9731644";
  const bgColor = note ? "#22d3ee08" : "#f9731608";
  const textColor = note ? "#22d3ee" : "#f97316";

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor,
        backgroundColor: bgColor,
        borderRadius: 12,
        padding: 8,
        marginBottom: 4,
      }}
    >
      <Text style={{ color: textColor, fontSize: 10, fontWeight: "700", marginBottom: 6 }}>
        {note ?? "FAIRE ENSEMBLE"}
      </Text>
      {children}
    </View>
  );
}
