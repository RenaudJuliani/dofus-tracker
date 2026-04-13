import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";

async function handleCallbackUrl(url: string) {
  // Supabase retourne les tokens dans le hash fragment ou les query params
  const hashPart = url.includes("#") ? url.split("#")[1] : url.split("?")[1] ?? "";
  const params = new URLSearchParams(hashPart);
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");

  if (access_token && refresh_token) {
    await supabase.auth.setSession({ access_token, refresh_token });
    // _layout.tsx onAuthStateChange redirige vers /(tabs) automatiquement
  } else {
    router.replace("/(auth)/login");
  }
}

export default function AuthCallbackScreen() {
  useEffect(() => {
    // App déjà ouverte : le deep link arrive via un URL event
    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleCallbackUrl(url);
    });

    // Cold start : l'app a été ouverte directement par le deep link
    Linking.getInitialURL().then((url) => {
      if (url?.includes("auth/callback")) handleCallbackUrl(url);
    });

    return () => subscription.remove();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#080e0a" }}>
      <ActivityIndicator color="#22c55e" size="large" />
    </View>
  );
}
