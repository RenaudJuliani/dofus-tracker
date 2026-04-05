import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
} from "react-native";
import { useCharacterStore } from "@/lib/stores/characterStore";
import type { Character } from "@dofus-tracker/types";

interface Props {
  characters: Character[];
}

export function CharacterSelector({ characters }: Props) {
  const [open, setOpen] = useState(false);
  const activeCharacterId = useCharacterStore((s) => s.activeCharacterId);
  const setActiveCharacterId = useCharacterStore((s) => s.setActiveCharacterId);

  const active = characters.find((c) => c.id === activeCharacterId) ?? characters[0] ?? null;

  if (characters.length === 0) {
    return <Text className="text-sm text-gray-400">Aucun personnage</Text>;
  }

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        className="flex-row items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5"
      >
        <Text className="text-dofus-green">⚔</Text>
        <Text className="text-white text-sm">{active?.name ?? "Choisir"}</Text>
        <Text className="text-gray-400 text-xs">{active?.character_class}</Text>
        <Text className="text-gray-500 text-xs">▾</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity
          className="flex-1 bg-black/60 justify-center items-center px-8"
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View className="bg-[#0d1f12] border border-white/10 rounded-2xl overflow-hidden w-full max-w-sm">
            <Text className="px-4 py-3 text-sm font-semibold text-gray-400 border-b border-white/5">
              Personnage actif
            </Text>
            <FlatList
              data={characters}
              keyExtractor={(c) => c.id}
              renderItem={({ item: char }) => (
                <TouchableOpacity
                  onPress={() => { setActiveCharacterId(char.id); setOpen(false); }}
                  className="flex-row items-center justify-between px-4 py-3 border-b border-white/5"
                >
                  <View className="flex-row items-center gap-2">
                    {char.id === active?.id && (
                      <View className="w-1.5 h-1.5 rounded-full bg-dofus-green" />
                    )}
                    <Text className={char.id === active?.id ? "text-dofus-green font-semibold" : "text-white"}>
                      {char.name}
                    </Text>
                  </View>
                  <Text className="text-xs text-gray-400">{char.character_class}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
