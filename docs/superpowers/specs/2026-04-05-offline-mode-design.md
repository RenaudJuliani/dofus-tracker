# Offline Mode & Error Handling — Mobile

**Date:** 2026-04-05
**Scope:** `apps/mobile` uniquement

## Objectif

Permettre à l'utilisateur de consulter ses Dofus et de cocher/décocher des quêtes sans connexion réseau. Les actions hors-ligne sont synchronisées automatiquement au retour du réseau. Les erreurs Supabase affichent un toast discret sans bloquer l'UI.

---

## Architecture

### Nouveaux fichiers

| Fichier | Rôle |
|---|---|
| `apps/mobile/lib/cache.ts` | Helpers read/write AsyncStorage (clés typées, sérialisation JSON) |
| `apps/mobile/lib/offlineQueue.ts` | Lecture/écriture de la queue de toggles + fonction `flushQueue` |
| `apps/mobile/lib/useNetworkStatus.ts` | Hook NetInfo — expose `isOnline`, déclenche flush au retour réseau |
| `apps/mobile/lib/useToast.ts` | State toast + timer 3s |
| `apps/mobile/components/shared/Toast.tsx` | Composant toast discret affiché dans `(tabs)/_layout.tsx` |

### Fichiers modifiés

- `apps/mobile/app/(tabs)/_layout.tsx` — monte le `<Toast>` global
- `apps/mobile/app/(tabs)/index.tsx` — try/catch loadData, fallback cache
- `apps/mobile/app/dofus/[slug].tsx` — try/catch loadData, fallback cache, pre-cache background
- `packages/ui/src/hooks/useQuestToggle.ts` — détection erreur réseau → queue au lieu de rollback

---

## Données cachées (AsyncStorage)

| Clé | Contenu | Mise à jour |
|---|---|---|
| `cache:dofus:list` | `Dofus[]` | À chaque fetch réussi, TTL 24h |
| `cache:dofus:quests:{slug}` | `QuestWithChain[]` | À chaque fetch réussi, pas de TTL |
| `cache:dofus:progress:{characterId}` | `DofusProgress[]` | À chaque fetch réussi + après flush queue |
| `offline:queue` | `ToggleAction[]` | Persisté jusqu'au flush complet |

### Type ToggleAction

```ts
interface ToggleAction {
  questId: string;
  characterId: string;
  dofusId: string;
  completed: boolean;
  timestamp: number;
}
```

Les quêtes n'ont pas de TTL car elles ne changent qu'à la sortie d'un nouveau Dofus (événement rare, sync manuelle). La liste des Dofus a un TTL de 24h pour détecter les ajouts éventuels.

---

## Flux cache

### Chargement d'un screen

1. Lancer le fetch Supabase
2. **Succès** → sauvegarder dans AsyncStorage → afficher
3. **Erreur réseau** → charger depuis AsyncStorage → afficher + toast "Mode hors-ligne — données locales"
4. **Pas de cache et erreur** → afficher message d'erreur avec bouton retry

### Pre-cache silencieux (grille Mes Dofus)

Après affichage de la grille, si `isOnline` :
- Itérer sur tous les slugs de `dofusList`
- Fetch `getQuestsForDofus` pour chaque slug non encore caché
- Stocker silencieusement sans bloquer l'UI (fire-and-forget)

---

## Flux toggle hors-ligne

`useQuestToggle` (`packages/ui`) n'est **pas modifié** — il reste générique. La gestion hors-ligne est dans `apps/mobile/app/dofus/[slug].tsx` :

1. Optimistic update via `useQuestToggle` (existant)
2. Si erreur réseau détectée (isOnline === false ou catch NetworkError) → appeler `addToQueue(action)` au lieu de laisser le rollback se produire
3. **Succès** → rien de nouveau
4. **Erreur réseau** → `addToQueue` + état optimiste conservé à l'écran
5. **Autre erreur** → rollback (comportement existant conservé)

`useQuestToggle` expose déjà le rollback via `setQuests`. La couche mobile intercèpte l'erreur avant le rollback en wrappant `handleToggle`.

`flushQueue` (dans `offlineQueue.ts`) :
1. Lire la queue depuis AsyncStorage
2. Pour chaque `ToggleAction` (ordre chronologique) :
   - Appeler `toggleQuestCompletion` vers Supabase
   - Supprimer l'action de la queue (succès ou erreur non-réseau)
   - En cas d'erreur réseau → stopper le flush (réessayer plus tard)
3. Si des actions ont été synchronisées → toast "X action(s) synchronisée(s)"

`useNetworkStatus` appelle `flushQueue` quand `isOnline` passe de `false` à `true`.

---

## Toast

- Affiché dans `(tabs)/_layout.tsx` via un state global minimal (Context ou prop drilling)
- Distribué via un `ToastContext` (React Context) monté dans `(tabs)/_layout.tsx`
- Les screens appellent `useToast().show(message)` sans prop drilling
- Position : bas d'écran, au-dessus de la tab bar
- Durée : 3 secondes, disparition automatique
- Messages :
  - `"Mode hors-ligne — données locales"` (réseau perdu)
  - `"Connexion rétablie · X action(s) synchronisée(s)"` (flush réussi)
  - `"Erreur de chargement"` (pas de cache + erreur)

---

## Dépendances

- `@react-native-community/netinfo` — déjà dans l'écosystème Expo, à ajouter dans `apps/mobile/package.json`
- `AsyncStorage` — déjà présent (utilisé par Supabase auth)

---

## Ce qui n'est PAS dans ce scope

- Sync en temps réel (pas de Supabase Realtime)
- Résolution de conflits (last-write-wins via timestamp)
- Mode offline sur la version web
