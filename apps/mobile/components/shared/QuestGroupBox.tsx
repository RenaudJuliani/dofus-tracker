import { View, Text } from "react-native";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export function QuestGroupBox({ children }: Props) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: "#f9731644",
        backgroundColor: "#f9731608",
        borderRadius: 12,
        padding: 8,
        marginBottom: 4,
      }}
    >
      <Text style={{ color: "#f97316", fontSize: 10, fontWeight: "700", marginBottom: 6 }}>
        FAIRE ENSEMBLE
      </Text>
      {children}
    </View>
  );
}
