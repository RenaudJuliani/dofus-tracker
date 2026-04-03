import { View, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
} from "react-native-reanimated";
import { useEffect } from "react";

interface Props {
  pct: number;
  color: string;
  showLabel?: boolean;
}

export function ProgressBar({ pct, color, showLabel = false }: Props) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(pct, { duration: 600 });
  }, [pct, width]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View>
      {showLabel && (
        <View className="flex-row justify-between items-center mb-1">
          <Text className="text-xs text-gray-400">{Math.round(pct)}%</Text>
        </View>
      )}
      <View className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <Animated.View
          style={[
            {
              height: "100%",
              borderRadius: 999,
              backgroundColor: color,
            },
            barStyle,
          ]}
        />
      </View>
    </View>
  );
}
