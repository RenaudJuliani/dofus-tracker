import { useEffect, useRef } from "react";
import { View, Text, Animated } from "react-native";

interface Props {
  pct: number;
  color: string;
  showLabel?: boolean;
}

export function ProgressBar({ pct, color, showLabel = false }: Props) {
  const width = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(width, {
      toValue: pct,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [pct, width]);

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
            {
              width: width.interpolate({
                inputRange: [0, 100],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>
    </View>
  );
}
