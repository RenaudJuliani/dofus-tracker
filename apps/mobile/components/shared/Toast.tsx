import { Animated, Text } from "react-native";
import { useEffect, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToast } from "@/lib/ToastContext";

export function Toast() {
  const { message } = useToast();
  const { bottom } = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: message ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [message, opacity]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        opacity,
        position: "absolute",
        bottom: bottom + 80,
        left: 16,
        right: 16,
        backgroundColor: "rgba(15,30,18,0.95)",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: "rgba(74,222,128,0.2)",
        zIndex: 999,
      }}
    >
      <Text style={{ color: "#4ade80", fontSize: 13, textAlign: "center" }}>
        {message}
      </Text>
    </Animated.View>
  );
}
