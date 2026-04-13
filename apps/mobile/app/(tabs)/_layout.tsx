import { Tabs } from "expo-router";
import { Text, View } from "react-native";
import { ToastProvider } from "@/lib/ToastContext";
import { Toast } from "@/components/shared/Toast";
import { useNetworkStatus } from "@/lib/useNetworkStatus";

function TabsWithToast() {
  useNetworkStatus();

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarStyle: {
            backgroundColor: "#0d1f12",
            borderTopColor: "rgba(255,255,255,0.06)",
          },
          tabBarActiveTintColor: "#4ade80",
          tabBarInactiveTintColor: "#6b7280",
          headerStyle: { backgroundColor: "#080e0a" },
          headerTintColor: "#fff",
          headerShadowVisible: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Mes Dofus",
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🥚</Text>,
          }}
        />
        <Tabs.Screen
          name="resources"
          options={{
            title: "Ressources",
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>📦</Text>,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profil",
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>👤</Text>,
          }}
        />
        <Tabs.Screen
          name="achievements"
          options={{
            title: "Succès",
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🏆</Text>,
          }}
        />
      </Tabs>
      <Toast />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <ToastProvider>
      <TabsWithToast />
    </ToastProvider>
  );
}
