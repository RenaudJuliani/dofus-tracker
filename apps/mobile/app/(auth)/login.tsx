import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Link } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { supabase } from "@/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectUri = makeRedirectUri({ scheme: "dofustracker", path: "auth/callback" });

  async function handleLogin() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  }

  async function handleOAuth(provider: "google" | "discord") {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirectUri, skipBrowserRedirect: true },
    });
    if (error) { setError(error.message); setLoading(false); return; }
    if (data.url) {
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
      if (result.type === "success" && result.url) {
        const url = new URL(result.url);
        const access_token = url.searchParams.get("access_token") ?? url.hash.match(/access_token=([^&]*)/)?.[1];
        const refresh_token = url.searchParams.get("refresh_token") ?? url.hash.match(/refresh_token=([^&]*)/)?.[1];
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
        }
      }
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-dofus-dark"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 justify-center px-6 py-12">
          <Text className="text-4xl font-black text-dofus-green text-center mb-2">
            Dofus Tracker
          </Text>
          <Text className="text-gray-400 text-center mb-10">
            Suis ta progression vers tous les Dofus
          </Text>

          {error && (
            <View className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-4">
              <Text className="text-red-400 text-sm">{error}</Text>
            </View>
          )}

          <TextInput
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mb-3"
            placeholder="Email"
            placeholderTextColor="#6b7280"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mb-6"
            placeholder="Mot de passe"
            placeholderTextColor="#6b7280"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            className="bg-dofus-green rounded-xl py-3.5 items-center mb-4"
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text className="text-black font-bold text-base">Se connecter</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleOAuth("discord")}
            disabled={loading}
            className="bg-[#5865f2]/20 border border-[#5865f2]/40 rounded-xl py-3.5 items-center mb-3"
          >
            <Text className="text-[#5865f2] font-semibold">Continuer avec Discord</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleOAuth("google")}
            disabled={loading}
            className="bg-white/5 border border-white/10 rounded-xl py-3.5 items-center mb-8"
          >
            <Text className="text-white font-semibold">Continuer avec Google</Text>
          </TouchableOpacity>

          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text className="text-gray-400 text-center text-sm">
                Pas de compte ?{" "}
                <Text className="text-dofus-green font-semibold">Créer un compte</Text>
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
