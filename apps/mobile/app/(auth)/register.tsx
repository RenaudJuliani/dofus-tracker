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
import { supabase } from "@/lib/supabase";

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleRegister() {
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
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
          <Text className="text-3xl font-black text-white text-center mb-2">
            Créer un compte
          </Text>
          <Text className="text-gray-400 text-center mb-10">
            Via Discord ou Google ? Utilise le bouton sur la page de connexion.
          </Text>

          {success ? (
            <View className="bg-dofus-green/10 border border-dofus-green/30 rounded-xl px-4 py-6 items-center">
              <Text className="text-dofus-green font-semibold text-base mb-2">Compte créé !</Text>
              <Text className="text-gray-400 text-sm text-center">
                Vérifie ton email pour confirmer ton compte.
              </Text>
            </View>
          ) : (
            <>
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
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mb-3"
                placeholder="Mot de passe"
                placeholderTextColor="#6b7280"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <TextInput
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mb-6"
                placeholder="Confirmer le mot de passe"
                placeholderTextColor="#6b7280"
                secureTextEntry
                value={confirm}
                onChangeText={setConfirm}
              />

              <TouchableOpacity
                onPress={handleRegister}
                disabled={loading}
                className="bg-dofus-green rounded-xl py-3.5 items-center mb-6"
              >
                {loading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text className="text-black font-bold text-base">Créer le compte</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text className="text-gray-400 text-center text-sm">
                Déjà un compte ?{" "}
                <Text className="text-dofus-green font-semibold">Se connecter</Text>
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
