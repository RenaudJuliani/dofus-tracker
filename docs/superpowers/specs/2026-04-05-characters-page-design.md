# Page Mes Personnages — Design Spec

**Date:** 2026-04-05
**Scope:** `apps/web` uniquement

## Objectif

Remplacer `/profile` par une page `/characters` dédiée à la gestion et à la visualisation multi-personnage. L'utilisateur voit en un coup d'œil la progression globale de chacun de ses personnages et peut gérer (créer, renommer, supprimer) ses personnages depuis la même page.

---

## Architecture

### Layout

Page en deux colonnes (layout "email client") :

- **Colonne gauche** (`~280px`) — liste des personnages avec stats globales
- **Colonne droite** (flex-1) — détail du personnage sélectionné

Sur mobile web : une seule colonne, sélecteur de perso en haut de page.

### Routing

- `app/characters/page.tsx` remplace `app/profile/page.tsx`
- `app/profile/page.tsx` → redirect vers `/characters`
- La navbar pointe vers `/characters` au lieu de `/profile`

### Nouveaux fichiers

| Fichier | Rôle |
|---|---|
| `app/characters/page.tsx` | Server Component — charge données initiales |
| `components/characters/CharactersClient.tsx` | Client Component principal, gère la sélection locale |
| `components/characters/CharacterList.tsx` | Colonne gauche — liste cliquable des persos |
| `components/characters/CharacterDetail.tsx` | Colonne droite — stats + grille Dofus + gestion |
| `components/characters/CharacterForm.tsx` | Formulaire création/renommage (extrait de CharacterManager) |

### Fichiers modifiés

- `components/nav/Navbar.tsx` — lien profile → `/characters`
- `packages/db/src/queries/dofus.ts` — ajout `getAllProgressForUser`
- `packages/db/src/index.ts` — export `getAllProgressForUser`
- `app/profile/page.tsx` → redirect `/characters`

### Fichiers supprimés

- `components/profile/CharacterManager.tsx` — remplacé par `CharacterForm` + `CharacterDetail`

---

## Data Flow

### Chargement initial (Server Component)

```ts
const [characters, dofusList, allProgress] = await Promise.all([
  getCharacters(supabase, userId),
  getDofusList(supabase),
  getAllProgressForUser(supabase, userId),
]);
```

Une seule requête pour toute la progression, au lieu de N requêtes parallèles par personnage.

### Nouvelle query DB

```ts
// packages/db/src/queries/dofus.ts
export async function getAllProgressForUser(
  client: SupabaseClient,
  userId: string
): Promise<DofusProgress[]>
```

Requête sur `v_dofus_progress` filtrée par `user_id` (via JOIN sur `characters`). Retourne toutes les lignes progress pour tous les personnages de l'utilisateur.

### Calcul côté client

Le `CharactersClient` reçoit `characters`, `dofusList`, `allProgress` et construit un `Map<characterId, DofusProgress[]>` pour alimenter les deux colonnes sans aucun fetch supplémentaire.

Le % global par perso = moyenne des `progress_pct` sur tous les Dofus.

### Mutations (créer / renommer / supprimer)

Appel Supabase client-side + `router.refresh()` pour recharger les données server-side. Pas d'optimistic update sur les mutations de personnages (opérations rares).

---

## Colonne gauche — CharacterList

Chaque ligne perso affiche :
- Nom + classe
- Barre de progression globale (% moyen)
- `X / Y Dofus complétés` (Dofus à 100%)
- Mise en évidence du perso actuellement sélectionné dans la page

Bouton "Nouveau personnage" en bas de liste → désélectionne le perso courant et affiche `CharacterForm` en mode création dans la colonne droite.

---

## Colonne droite — CharacterDetail

### Si aucun perso et aucun personnage existant
Affiche directement `CharacterForm` en mode création.

### Si perso sélectionné

**Section 1 — En-tête stats**
- Nom + classe
- % global de complétion
- Nombre total de quêtes complétées / total

**Section 2 — Grille Dofus**
- Réutilise `DofusCard` existant avec la progression du perso sélectionné
- Organisée en Primordiaux / Secondaires (même structure que la home)
- Clic sur une carte → navigue vers `/dofus/[slug]` et set `activeCharacterId` dans le store

**Section 3 — Gestion**
- Bouton "Renommer" → inline edit (le nom devient un `<input>` sur place, confirmé par Enter ou blur)
- Bouton "Supprimer" → confirmation avant suppression

---

## Sélection locale vs store global

La sélection dans `/characters` est un `useState` local dans `CharactersClient` — indépendant du `activeCharacterId` du store Zustand. Le store n'est mis à jour que lors d'un clic sur une carte Dofus (pour que la page détail charge la progression du bon perso).

---

## Tests

- `__tests__/CharacterList.test.tsx` — rendu, sélection, stats globales calculées correctement
- `__tests__/CharacterDetail.test.tsx` — rendu stats, grille Dofus, actions créer/supprimer
- Mise à jour de `__tests__/CharacterManager.test.tsx` → supprimé ou migré vers les nouveaux tests

---

## Ce qui n'est PAS dans ce scope

- Comparaison directe côte à côte de deux personnages sur un même Dofus
- Export/import de progression
- Avatars ou images de personnages
