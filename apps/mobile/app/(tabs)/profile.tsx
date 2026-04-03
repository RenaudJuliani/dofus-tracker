import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Stack } from "expo-router";
import { BlurView } from "expo-blur";
import { createCharacter, deleteCharacter, getCharacters } from "@dofus-tracker/db";
import { DOFUS_CLASSES } from "@dofus-tracker/ui";
import { supabase } from "@/lib/supabase";
import { useCharacterStore } from "@/lib/stores/characterStore";
import type { Character } from "@dofus-tracker/types";

export default function ProfileScreen() {
  const activeCharacterId = useCharacterStore((s) => s.activeCharacterId);
  const setActiveCharacterId = useCharacterStore((s) => s.setActiveCharacterId);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [characterClass, setCharacterClass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      setEmail(user.email ?? null);
      getCharacters(supabase, user.id).then(setCharacters);
    });
  }, []);

  async function handleCreate() {
    if (!name.trim() || !characterClass.trim() || !userId) return;
    setLoading(true);
    setError(null);
    try {
      const newChar = await createCharacter(supabase, userId, name.trim(), characterClass.trim());
      setCharacters((prev) => [...prev, newChar]);
      if (characters.length === 0) setActiveCharacterId(newChar.id);
      setName("");
      setCharacterClass("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(charId: string) {
    try {
      await deleteCharacter(supabase, charId);
      setCharacters((prev) => prev.filter((c) => c.id !== charId));
      if (activeCharacterId === charId) {
        const remaining = characters.filter((c) => c.id !== charId);
        setActiveCharacterId(remaining[0]?.id ?? null);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <View className="flex-1 bg-dofus-dark">
      <Stack.Screen options={{ title: "Profil" }} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Account info */}
        <BlurView intensity={60} tint="dark" className="rounded-2xl overflow-hidden mb-4">
          <View className="p-4" style={{ backgroundColor: "rgba(8,16,10,0.55)" }}>
            <Text className="text-base font-bold text-white mb-1">Mon compte</Text>
            <Text className="text-sm text-gray-400">{email}</Text>
          </View>
        </BlurView>

        {/* Characters list */}
        <BlurView intensity={60} tint="dark" className="rounded-2xl overflow-hidden mb-4">
          <View style={{ backgroundColor: "rgba(8,16,10,0.55)" }}>
            <View className="px-4 py-3 border-b border-white/5">
              <Text className="text-base font-bold text-white">Mes personnages</Text>
            </View>
            {characters.length === 0 ? (
              <Text className="text-sm text-gray-400 text-center py-6">
                Aucun personnage — crée-en un ci-dessous.
              </Text>
            ) : (
              <FlatList
                data={characters}
                keyExtractor={(c) => c.id}
                scrollEnabled={false}
                renderItem={({ item: char }) => (
                  <View
                    className="flex-row items-center justify-between px-4 py-3 border-b border-white/5"
                    style={char.id === activeCharacterId ? { backgroundColor: "rgba(74,222,128,0.05)" } : {}}
                  >
                    <View className="flex-row items-center gap-2">
                      {char.id === activeCharacterId && (
                        <View className="w-1.5 h-1.5 rounded-full bg-dofus-green" />
                      )}
                      <View>
                        <Text className="text-sm font-semibold text-white">{char.name}</Text>
                        <Text className="text-xs text-gray-400">{char.character_class}</Text>
                      </View>
                    </View>
                    <View className="flex-row gap-2">
                      {char.id !== activeCharacterId && (
                        <TouchableOpacity
                          onPress={() => setActiveCharacterId(char.id)}
                          className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10"
                        >
                          <Text className="text-xs text-gray-300">Activer</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={() => handleDelete(char.id)}
                        className="px-2.5 py-1 rounded-lg"
                      >
                        <Text className="text-xs text-red-400">Supprimer</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        </BlurView>

        {/* Add character */}
        <BlurView intensity={60} tint="dark" className="rounded-2xl overflow-hidden mb-4">
          <View className="p-4" style={{ backgroundColor: "rgba(8,16,10,0.55)" }}>
            <Text className="text-base font-bold text-white mb-3">Ajouter un personnage</Text>
            {error && (
              <Text className="text-red-400 text-sm mb-3">{error}</Text>
            )}
            <TextInput
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mb-3"
              placeholder="Nom du personnage"
              placeholderTextColor="#6b7280"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mb-4"
              placeholder={`Classe (ex: ${DOFUS_CLASSES.slice(0, 3).join(", ")}...)`}
              placeholderTextColor="#6b7280"
              value={characterClass}
              onChangeText={setCharacterClass}
            />
            <TouchableOpacity
              onPress={handleCreate}
              disabled={loading}
              className="bg-dofus-green rounded-xl py-3 items-center"
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text className="text-black font-bold">Ajouter</Text>
              )}
            </TouchableOpacity>
          </View>
        </BlurView>

        {/* Sign out */}
        <TouchableOpacity
          onPress={handleSignOut}
          className="border border-red-500/30 rounded-xl py-3 items-center"
        >
          <Text className="text-red-400 font-semibold">Se déconnecter</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
