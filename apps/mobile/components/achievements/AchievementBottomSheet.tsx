import { forwardRef, useImperativeHandle, useRef } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import {
  CustomBottomSheet,
  BottomSheetView,
  type BottomSheetHandle,
} from "@/components/shared/CustomBottomSheet";
import type { AchievementWithProgress, AchievementObjectiveWithStatus } from "@dofus-tracker/types";

interface Props {
  achievement: AchievementWithProgress | null;
  onToggleObjective: (objectiveId: string, questId: string | null, completed: boolean) => void;
}

export interface AchievementBottomSheetHandle {
  expand: () => void;
  close: () => void;
}

function ObjectiveRow({ obj, onToggle }: {
  obj: AchievementObjectiveWithStatus;
  onToggle: (objectiveId: string, questId: string | null, completed: boolean) => void;
}) {
  const isAuto = obj.completion_source === "auto";

  return (
    <TouchableOpacity
      style={styles.objective}
      onPress={isAuto ? undefined : () => onToggle(obj.id, obj.quest_id, !obj.is_completed)}
      activeOpacity={isAuto ? 1 : 0.6}
      disabled={isAuto}
    >
      <View style={[
        styles.checkbox,
        obj.is_completed && isAuto && styles.checkboxAuto,
        obj.is_completed && !isAuto && styles.checkboxManual,
      ]}>
        {obj.is_completed && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <Text style={[styles.objText, obj.is_completed && styles.objTextDone]} numberOfLines={2}>
        {obj.description}
      </Text>
      {isAuto && <Text style={styles.autoLabel}>auto</Text>}
    </TouchableOpacity>
  );
}

export const AchievementBottomSheet = forwardRef<AchievementBottomSheetHandle, Props>(
  function AchievementBottomSheet({ achievement, onToggleObjective }, ref) {
    const sheetRef = useRef<BottomSheetHandle>(null);

    useImperativeHandle(ref, () => ({
      expand: () => sheetRef.current?.expand(),
      close: () => sheetRef.current?.close(),
    }));

    return (
      <CustomBottomSheet
        ref={sheetRef}
        snapPoints={["70%"]}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: "#0d1f12" }}
        handleIndicatorStyle={{ backgroundColor: "rgba(255,255,255,0.2)" }}
      >
        <BottomSheetView>
          {achievement && (
            <ScrollView contentContainerStyle={styles.content}>
              {/* Header */}
              <View style={styles.achHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.achName}>{achievement.name}</Text>
                  <Text style={styles.achDesc}>{achievement.description}</Text>
                </View>
                <View style={styles.pointsBadge}>
                  <Text style={styles.pointsText}>{achievement.points}</Text>
                </View>
              </View>

              {/* Objectifs */}
              <Text style={styles.sectionLabel}>Objectifs</Text>
              {achievement.objectives.map((obj) => (
                <ObjectiveRow key={obj.id} obj={obj} onToggle={onToggleObjective} />
              ))}
            </ScrollView>
          )}
        </BottomSheetView>
      </CustomBottomSheet>
    );
  }
);

const styles = StyleSheet.create({
  content: { padding: 16 },
  achHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  achName: { color: "#e2e8f0", fontSize: 16, fontWeight: "700", marginBottom: 2 },
  achDesc: { color: "#64748b", fontSize: 12 },
  pointsBadge: {
    backgroundColor: "#1e293b",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pointsText: { color: "#f59e0b", fontWeight: "700", fontSize: 14 },
  sectionLabel: {
    color: "#475569",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  objective: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: "#475569",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  checkboxAuto: { backgroundColor: "#1e3a5f", borderColor: "#3b82f6" },
  checkboxManual: { backgroundColor: "#14532d", borderColor: "#22c55e" },
  checkmark: { color: "#fff", fontSize: 10, fontWeight: "700" },
  objText: { flex: 1, color: "#cbd5e1", fontSize: 13 },
  objTextDone: { color: "#475569", textDecorationLine: "line-through" },
  autoLabel: { color: "#3b82f6", fontSize: 10, fontStyle: "italic", flexShrink: 0 },
});
