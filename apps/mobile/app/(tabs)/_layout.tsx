import { Tabs } from "expo-router";
import { Text } from "react-native";

export default function TabsLayout() {
  return (
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
    </Tabs>
  );
}
