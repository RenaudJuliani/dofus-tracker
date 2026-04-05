import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  StyleProp,
  TouchableWithoutFeedback,
  View,
  ViewStyle,
} from "react-native";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const CLOSED_Y = SCREEN_HEIGHT;

export interface BottomSheetHandle {
  expand: () => void;
  close: () => void;
}

interface Props {
  children?: React.ReactNode;
  snapPoints?: (string | number)[];
  enablePanDownToClose?: boolean;
  backgroundStyle?: StyleProp<ViewStyle>;
  handleIndicatorStyle?: StyleProp<ViewStyle>;
  index?: number;
}

function snapToHeight(snap: string | number): number {
  if (typeof snap === "string" && snap.endsWith("%")) {
    return (parseFloat(snap) / 100) * SCREEN_HEIGHT;
  }
  return Number(snap);
}

export const CustomBottomSheet = forwardRef<BottomSheetHandle, Props>(
  function CustomBottomSheet(
    {
      children,
      snapPoints = ["50%"],
      enablePanDownToClose = true,
      backgroundStyle,
      handleIndicatorStyle,
    },
    ref
  ) {
    const [visible, setVisible] = useState(false);
    const translateY = useRef(new Animated.Value(CLOSED_Y)).current;
    const sheetHeight = snapToHeight(snapPoints[snapPoints.length - 1]);

    const open = useCallback(() => {
      setVisible(true);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
      }).start();
    }, [translateY]);

    const close = useCallback(() => {
      Animated.timing(translateY, {
        toValue: sheetHeight,
        duration: 250,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }, [translateY, sheetHeight]);

    useImperativeHandle(ref, () => ({ expand: open, close }), [open, close]);

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => enablePanDownToClose,
        onPanResponderMove: (_, g) => {
          if (g.dy > 0) translateY.setValue(g.dy);
        },
        onPanResponderRelease: (_, g) => {
          const isTap = Math.abs(g.dy) < 8 && Math.abs(g.dx) < 8;
          if (isTap || g.dy > sheetHeight * 0.3 || g.vy > 0.5) {
            close();
          } else {
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
          }
        },
      })
    ).current;

    if (!visible) return null;

    return (
      <Modal transparent animationType="none" onRequestClose={close}>
        <TouchableWithoutFeedback onPress={close}>
          <Animated.View
            style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: "rgba(0,0,0,0.5)",
              opacity: translateY.interpolate({
                inputRange: [0, sheetHeight],
                outputRange: [1, 0],
                extrapolate: "clamp",
              }),
            }}
          />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            {
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: sheetHeight,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              overflow: "hidden",
            },
            backgroundStyle,
            { transform: [{ translateY }] },
          ]}
        >
          {/* Handle — PanResponder only here so content can scroll */}
          <View
            {...panResponder.panHandlers}
            style={{ alignItems: "center", paddingTop: 12, paddingBottom: 8 }}
          >
            <View
              style={[
                {
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: "rgba(255,255,255,0.3)",
                },
                handleIndicatorStyle,
              ]}
            />
          </View>

          {children}
        </Animated.View>
      </Modal>
    );
  }
);

// Drop-in replacement for BottomSheetView
export function BottomSheetView({
  children,
  style,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[{ flex: 1 }, style]}>{children}</View>;
}

// StyleSheet used inline above
import { StyleSheet } from "react-native";
