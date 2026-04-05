# Plan 2b — App Mobile Expo
**Date :** 2026-04-02  
**Statut :** Validé  
**Contexte :** Suite de Plan 2a (web Next.js 14 mergé sur main). App mobile React Native pour iOS et Android.

---

## 1. Objectif

Créer l'application mobile `apps/mobile` avec les mêmes fonctionnalités que le web, adaptées aux paradigmes React Native. Extraire la logique partagée dans un nouveau `packages/ui`. Cible initiale : Android (Google Play Internal Testing via EAS). iOS (TestFlight) reporté.

---

## 2. Stack technique

| Couche | Technologie |
|---|---|
| Framework | Expo SDK 51 |
| Navigation | Expo Router v3 (file-based) |
| Styles | NativeWind v4 + config Tailwind partagée |
| Glassmorphism | `expo-blur` (`BlurView`) |
| Animations | `react-native-reanimated` |
| Auth OAuth | `expo-auth-session` + deep link `dofustracker://` |
| Session storage | `@react-native-async-storage/async-storage` |
| Bottom sheet | `@gorhom/bottom-sheet` |
| State | Zustand (depuis `@dofus-tracker/ui`) |
| Tests | Vitest (sur `packages/ui` uniquement) |
| Build/Deploy | EAS Build → Google Play Internal Testing |

---

## 3. Nouveau package : `packages/ui`

Contient la logique partagée entre `apps/web` et `apps/mobile`. Pas de composants JSX — uniquement hooks, store, et constantes.

```
packages/ui/
  src/
    stores/
      characterStore.ts      ← migré depuis apps/web/lib/stores/
    hooks/
      useQuestToggle.ts      ← logique toggle optimistic + propagation cross-Dofus
      useResources.ts        ← calcul multiplicateur ×1→×5
    constants/
      dofusColors.ts         ← couleurs par Dofus (partagées web + mobile)
  package.json               ← name: "@dofus-tracker/ui"
  tsconfig.json
```

**Migration `apps/web` :** `lib/stores/characterStore.ts` remplacé par import `@dofus-tracker/ui`. Aucune autre modification du web.

---

## 4. Structure `apps/mobile`

```
apps/mobile/
  app/
    _layout.tsx              ← Root layout : providers + auth gate
    (auth)/
      _layout.tsx
      login.tsx              ← Email/password + boutons Google/Discord
      register.tsx           ← Email/password uniquement
    (tabs)/
      _layout.tsx            ← Tab bar bottom (3 onglets)
      index.tsx              ← "Mes Dofus" — grille de progression
      resources.tsx          ← "Ressources" — vue agrégée cross-Dofus
      profile.tsx            ← Profil + gestion personnages
    dofus/
      [slug].tsx             ← Détail d'un Dofus (hors tab bar)
  components/
    home/
      DofusCard.tsx          ← card : EggImage, barre progression, %
      DofusGrid.tsx          ← FlatList 2 colonnes
    dofus/
      DofusHeader.tsx        ← egg animé, stats, barre progression
      QuestSection.tsx       ← section Prérequis / Chaîne principale
      QuestItem.tsx          ← checkbox, badges, lien dofuspourlesnoobs
      ResourceSection.tsx    ← ressources en bas du ScrollView
    resources/
      ResourceBottomSheet.tsx ← multiplicateur via @gorhom/bottom-sheet
    shared/
      EggImage.tsx           ← image officielle + animation flottement (Reanimated)
      ProgressBar.tsx        ← barre shimmer + couleur par Dofus
      QuestTypeBadge.tsx     ← badges colorés par type
      QuestGroupBox.tsx      ← encadré orange "faire ensemble"
      CharacterSelector.tsx  ← dropdown dans le header de chaque tab
  lib/
    supabase.ts              ← client Supabase avec AsyncStorage
  eas.json
  app.json
  package.json
  tsconfig.json
```

---

## 5. Navigation

### Auth gate (Root `_layout.tsx`)
```
App launch
  └── vérifie session Supabase (onAuthStateChange)
        ├── Session valide → router.replace('/(tabs)')
        └── Pas de session → router.replace('/(auth)/login')
```

### Tab bar
| Tab | Icône | Écran |
|---|---|---|
| Mes Dofus | egg | `(tabs)/index.tsx` |
| Ressources | package | `(tabs)/resources.tsx` |
| Profil | user | `(tabs)/profile.tsx` |

### Sélecteur de personnage actif
Présent dans le header de chaque tab (via `expo-router` `<Stack.Screen options={{ headerRight }}>`). Dropdown natif au tap.

---

## 6. Auth flow

### Login (`(auth)/login.tsx`)
- Formulaire email + password → `supabase.auth.signInWithPassword()`
- Bouton "Continuer avec Google" → `expo-auth-session` → browser système → deep link retour
- Bouton "Continuer avec Discord" → même flow
- Lien vers Register

### Register (`(auth)/register.tsx`)
- Formulaire email + password + confirmation → `supabase.auth.signUp()`
- Pas de boutons OAuth (inutiles : le premier login OAuth crée le compte automatiquement)
- Lien vers Login

### OAuth deep link
- Scheme : `dofustracker://`
- Callback URL Supabase : `dofustracker://auth/callback`
- `expo-auth-session` + `makeRedirectUri({ scheme: 'dofustracker' })`

### Session persistance
- `AsyncStorage` comme storage Supabase (`createClient` avec `storage: AsyncStorage`)

---

## 7. Écrans détaillés

### `(tabs)/index.tsx` — Mes Dofus
- `FlatList` 2 colonnes, `numColumns={2}`
- `DofusCard` : image œuf (ou placeholder coloré), nom, barre de progression colorée, `X/Y quêtes`
- Pull-to-refresh (`RefreshControl`)
- Tap sur une card → `router.push('/dofus/[slug]')`
- Fond : `ImageBackground` avec artwork Dofus + overlay semi-transparent

### `dofus/[slug].tsx` — Détail Dofus
- `ScrollView` vertical (pas de sidebar)
- `DofusHeader` en haut : egg animé, nom, stats, barre progression
- `QuestSection` Prérequis puis Chaîne principale (même logique que web)
- `QuestItem` : checkbox, badges type, lien `Linking.openURL()` vers dofuspourlesnoobs
- Groupes "faire ensemble" : encadré orange (`QuestGroupBox`)
- Tag cross-Dofus : badge bleu
- `ResourceSection` en bas du scroll : liste ressources + bouton "Multiplicateur" ouvre bottom sheet

### `(tabs)/resources.tsx` — Ressources
- Vue agrégée : toutes les ressources de tous les Dofus
- `ResourceBottomSheet` : multiplicateur ×1→×5 via `@gorhom/bottom-sheet`
- Filtre par Dofus (optionnel, si temps disponible)

### `(tabs)/profile.tsx` — Profil
- Infos compte (email, avatar)
- Liste des personnages avec CRUD (même logique que web `/profile`)
- Sélecteur personnage actif
- Bouton déconnexion → `supabase.auth.signOut()` → redirect login

---

## 8. Design visuel

### Glassmorphism mobile
- `BlurView` d'`expo-blur` pour les cards (intensité 60-80)
- Fond semi-transparent `rgba(8,16,10,0.64)` sur les surfaces
- Bordures `rgba(255,255,255,0.09)`

### Animations
| Élément | Lib | Détail |
|---|---|---|
| EggImage flottement | Reanimated | `useSharedValue` + `withRepeat` + `withTiming` |
| ProgressBar shimmer | Reanimated + LinearGradient | Balayage lumineux |
| Card press | Reanimated | `withSpring` scale 0.97 |
| Bottom sheet | @gorhom/bottom-sheet | Snap points [40%, 90%] |

### Couleurs et typographie
- Même palette que le web (tokens dans `packages/ui/constants/dofusColors.ts`)
- Police Inter via `expo-font`
- NativeWind v4 pour les classes Tailwind

---

## 9. Tests (`packages/ui`)

Vitest, même configuration que `packages/sync`.

| Fichier | Ce qui est testé |
|---|---|
| `characterStore.test.ts` | Sélection personnage actif, CRUD, persistance |
| `useQuestToggle.test.ts` | Toggle optimistic, propagation cross-Dofus, décocher |
| `useResources.test.ts` | Calcul multiplicateur ×1 à ×5, total kamas |

---

## 10. EAS Build

### `app.json` (extrait clé)
```json
{
  "expo": {
    "name": "Dofus Tracker",
    "slug": "dofus-tracker",
    "scheme": "dofustracker",
    "android": {
      "package": "com.dofustracker.app"
    }
  }
}
```

### `eas.json`
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "android": { "buildType": "app-bundle" }
    }
  }
}
```

**Flow de test Android :**
1. `eas build --profile preview --platform android` → génère APK
2. Partage via lien EAS → installation directe sur device (sources inconnues activées)
3. Pas besoin de Google Play jusqu'à publication finale

---

## 11. Hors scope Plan 2b

- TestFlight / App Store iOS (reporté)
- Mode offline
- Notifications push
- Tests composants React Native (RNTL)
- Filtre ressources par Dofus (si manque de temps)
