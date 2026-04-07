# Dofus Tracker — Design Spec
**Date :** 2026-04-01  
**Statut :** Validé

---

## 1. Vision

Application web + mobile permettant à la communauté Dofus 3 (Unity) de tracker leur progression pour l'obtention de tous les Dofus existants. Transforme le Google Sheet de référence "Tougli - All Dofus" en expérience interactive, synchronisée entre appareils, avec un design premium inspiré de l'univers Dofus.

---

## 2. Audience et accès

- **Public cible :** Toute la communauté Dofus (usage personnel → guilde → public)
- **Authentification :** Compte obligatoire (email/mot de passe + OAuth Google/Discord)
- **Progression :** Sauvegardée par personnage, synchronisée en temps réel entre web et mobile
- **Multi-personnages :** Un compte peut avoir plusieurs personnages (nom + classe). La progression est strictement par personnage — un Cra à 100% sur le Dofus Émeraude n'influence pas la progression d'un Iop sur le même compte.

---

## 3. Architecture

### Stack

| Couche | Technologie | Hébergement |
|--------|------------|-------------|
| Web | Next.js 14 (App Router) | Vercel |
| Mobile | Expo (React Native) iOS + Android | App Stores |
| Backend / Auth | Supabase (PostgreSQL + Auth) | Supabase Cloud |
| Packages partagés | Turborepo monorepo | — |
| Sync données | Script TypeScript (Google Sheets API) | Déclenché manuellement |

### Monorepo Turborepo

```
dofus-tracker/
  apps/
    web/          ← Next.js
    mobile/       ← Expo
  packages/
    types/        ← interfaces TypeScript partagées (Quest, Dofus, Resource, UserProgress...)
    ui/           ← composants partagés (QuestCheckbox, ProgressBar, EggIcon...)
    db/           ← client Supabase partagé + helpers de requêtes
    sync/         ← script d'import Google Sheets → Supabase
```

---

## 4. Modèle de données (PostgreSQL / Supabase)

### Tables principales

**`dofus`**
```
id uuid PK
name text                    -- "Dofus Émeraude"
slug text UNIQUE             -- "emeraude"
type text                    -- "primordial" | "secondaire"
color text                   -- "#22c55e" (couleur propre à chaque Dofus)
description text
recommended_level integer
image_url text
created_at timestamptz
updated_at timestamptz
```

**`quests`**
```
id uuid PK
name text
slug text UNIQUE
dofuspourlesnoobs_url text   -- lien vers le guide de la quête
created_at timestamptz
```

**`dofus_quest_chains`** ← relation Dofus ↔ quête avec ordre et section
```
id uuid PK
dofus_id uuid FK → dofus
quest_id uuid FK → quests
section text                 -- "prerequisite" | "main"
order_index integer          -- ordre dans la chaîne
group_id uuid NULLABLE       -- UUID partagé entre quêtes d'un même groupe "à faire ensemble"
quest_types text[]           -- ["combat_solo", "combat_groupe", "donjon", "metier", "boss", "succes", "horaires"]
combat_count integer NULLABLE -- nombre de combats requis (x1, x2, x3...)
is_avoidable boolean DEFAULT false
```

**`resources`**
```
id uuid PK
name text
icon_emoji text              -- emoji de représentation temporaire
dofus_id uuid FK → dofus
quantity_per_character integer
is_kamas boolean DEFAULT false
```

**`user_profiles`**
```
id uuid FK → auth.users PK
username text
avatar_url text
created_at timestamptz
```

**`characters`** ← un compte peut avoir plusieurs personnages
```
id uuid PK
user_id uuid FK → auth.users
name text                    -- "Tougli", "MonCra"...
class text                   -- "Cra", "Iop", "Sacrieur"... (enum ou text libre)
created_at timestamptz
```

**`user_quest_completions`** ← cœur du système cross-Dofus, par personnage
```
id uuid PK
character_id uuid FK → characters   -- lié au personnage, PAS au compte
quest_id uuid FK → quests            -- lié à la quête, PAS au Dofus
completed_at timestamptz
UNIQUE(character_id, quest_id)
```
> Une quête cochée pour un personnage est automatiquement considérée complète pour **tous les Dofus** qui la requièrent, **pour ce personnage uniquement**. Deux personnages du même compte ont une progression totalement indépendante.

### Vues utiles (Supabase Views)

**`v_dofus_progress`** — progression par personnage et par Dofus, calculée à la volée :
```sql
SELECT
  c.id as character_id,
  c.user_id,
  c.name as character_name,
  d.id as dofus_id,
  d.name as dofus_name,
  COUNT(dqc.quest_id) as total_quests,
  COUNT(uqc.quest_id) as completed_quests,
  ROUND(COUNT(uqc.quest_id)::numeric / COUNT(dqc.quest_id) * 100) as progress_pct
FROM dofus d
JOIN dofus_quest_chains dqc ON dqc.dofus_id = d.id
CROSS JOIN characters c
LEFT JOIN user_quest_completions uqc
  ON uqc.quest_id = dqc.quest_id AND uqc.character_id = c.id
GROUP BY c.id, c.user_id, c.name, d.id, d.name
```

---

## 5. Pipeline de synchronisation Google Sheets

Le Google Sheet "Tougli - All Dofus" reste la source de vérité. Un script TypeScript (`packages/sync`) est déclenché manuellement par l'admin pour mettre à jour la base.

### Flux

1. Auth via Google Sheets API (clé de service)
2. Lecture de chaque onglet (un onglet = un Dofus)
3. Parsing des colonnes : nom quête, URL dofuspourlesnoobs, type de combat, groupe, ordre
4. Parsing du panel ressources (colonne droite)
5. Upsert dans Supabase (`dofus`, `quests`, `dofus_quest_chains`, `resources`)
6. Log de rapport : quêtes ajoutées / modifiées / supprimées

### Gestion des quêtes partagées

Lors du parsing, si une quête existe déjà en base (même `name` ou même URL dofuspourlesnoobs), elle est **réutilisée** plutôt que dupliquée. La relation est créée dans `dofus_quest_chains` avec le Dofus courant.

---

## 6. Fonctionnalités

### Gestion des personnages

- À la création du compte, l'utilisateur crée son premier personnage (nom + classe)
- Il peut en ajouter d'autres depuis son profil
- Un **sélecteur de personnage actif** est toujours visible en haut de l'interface (dropdown dans la nav ou tab bar)
- Toute la progression affichée (cases cochées, barres de progression) correspond au personnage actif
- Changer de personnage actif recharge la progression sans rechargement de page

### Page d'accueil — Vue tous les Dofus

- Sélecteur de personnage actif visible dans la nav
- Grille de cards (Primordiaux + Secondaires)
- Chaque card : image officielle de l'œuf avec animation de flottement, barre de progression colorée propre au Dofus, nombre de quêtes complétées **pour le personnage actif**
- Background : artwork illustré Dofus (paysage de prairies, univers Ankama)
- Navigation : logo, liens, sélecteur personnage, avatar utilisateur

### Page détail d'un Dofus

**Colonne gauche :**
1. Header : œuf animé, nom, description, stats (complétées / restantes / total), barre de progression
2. Ligne info (2 colonnes) :
   - **Quêtes partagées** : liste des Dofus avec quêtes communes + compteur
   - **Conseil d'optimisation** : rappel des groupes de quêtes
3. Légende des types de quêtes
4. Section **Prérequis** — liste ordonnée
5. Section **Chaîne principale** — liste ordonnée

**Colonne droite (sticky) :**
- **Ressources nécessaires** : liste avec icône, nom, quantité
- **Multiplicateur de personnages** : boutons +/− et présets ×1 à ×5, quantités recalculées dynamiquement
- Total récapitulatif (kamas + nb types de ressources)

### Système de quêtes

- **Ordre strict** : les quêtes sont affichées dans l'ordre `order_index`, les connecteurs visuels (ligne verticale) matérialisent la chaîne
- **Groupes** : les quêtes avec le même `group_id` sont affichées dans un encadré orange avec mention "faire ensemble"
- **Types** : badges colorés (rouge combat solo, orange groupe, violet donjon, jaune métier, rouge boss)
- **Liens** : chaque nom de quête est un lien vers la page dofuspourlesnoobs.com correspondante (ouvre dans un nouvel onglet)
- **Tag cross-Dofus** : badge bleu affiché sur la quête si elle est requise par d'autres Dofus

### Système de complétion cross-Dofus (par personnage)

- Cocher une quête crée une entrée dans `user_quest_completions(character_id, quest_id)`
- Pour le personnage actif, toutes les vues de tous les Dofus requérant cette quête la reflètent immédiatement comme complète
- Décocher supprime l'entrée et propage la décoche partout, pour ce personnage uniquement
- Bouton "Tout cocher" par section (prérequis / chaîne principale)
- La progression d'un personnage n'affecte jamais celle d'un autre, même sur le même compte

---

## 7. Design system

### Identité visuelle

- **Fond** : artwork illustré Dofus (paysages de prairies, falaises, univers Ankama) en `background-attachment: fixed`
- **Overlay** : dégradé vertical semi-transparent pour la lisibilité, vignette sur les bords
- **Cartes** : glassmorphism — `backdrop-filter: blur(16px)`, fond `rgba(8,16,10,0.64)`, bordure `rgba(255,255,255,0.09)`
- **Accent principal** : vert `#4ade80` / `#22c55e`
- **Couleurs par Dofus** : chaque Dofus a une couleur propre (émeraude = vert, ocre = or, pourpre = violet, turquoise = cyan, ivoire = gris, ébène = noir...)
- **Typographie** : Inter (Google Fonts), poids 400/500/600/700/800/900

### Images des Dofus

Les œufs sont représentés par les **images officielles du jeu** (artwork Ankama), pas par des éléments CSS générés. Par exemple, le Dofus Émeraude utilise son image d'œuf vert translucide officielle.

- Les images sont stockées dans **Supabase Storage** (bucket public `dofus-images`)
- Le champ `dofus.image_url` pointe vers l'URL Supabase Storage de l'image
- Le script de sync ne gère pas les images — elles sont uploadées manuellement par l'admin
- Les images sont affichées avec des animations CSS appliquées par-dessus (`float`, `hover rotate`) via des wrappers, sans altérer l'image source
- Format recommandé : PNG avec transparence, taille ~200×200px

### Animations

- Images d'œufs officielles avec animation CSS de flottement (décalé par carte), rotation au hover
- Shimmer sur les barres de progression
- Hover sur les cartes : `translateY(-5px) scale(1.015)` avec `cubic-bezier(.34,1.56,.64,1)`
- Shimmer au hover sur les cards (balayage lumineux)
- Logo pulsé (glow vert)
- Fog animé en arrière-plan (dérive lente)

### Composants clés partagés (packages/ui)

- `QuestCheckbox` — checkbox animée avec état done/todo/propagation cross-personnage
- `EggImage` — image officielle du Dofus avec animation de flottement et hover paramétrables
- `ProgressBar` — barre avec shimmer et couleur par Dofus
- `QuestGroupBox` — encadré orange "faire ensemble"
- `QuestTypeBadge` — badge coloré par type (combat, groupe, donjon...)
- `ResourceMultiplier` — contrôle +/− avec présets
- `CharacterSelector` — sélecteur de personnage actif (dropdown ou tab bar)

---

## 8. Application mobile (Expo)

- Même fonctionnalités que le web, adaptées mobile
- Navigation : tab bar en bas (Mes Dofus / Ressources / Profil)
- La vue détail d'un Dofus utilise un ScrollView avec la section ressources en bas (pas de sidebar)
- Le multiplicateur de personnages est accessible via un bottom sheet
- Artwork Dofus en fond avec le même système d'overlay
- ~70% du code métier partagé via `packages/types`, `packages/db`, `packages/ui`

---

## 9. Auth et comptes

- Supabase Auth : email/mot de passe + OAuth Google + OAuth Discord
- Row Level Security (RLS) sur `user_quest_completions` : un utilisateur ne voit et ne modifie que ses propres données
- Pas de rôles complexes en V1 — un seul rôle "utilisateur"
- L'admin (toi) déclenche le script de sync manuellement via CLI

---

## 10. Déploiement

| Service | Plan de démarrage | Coût |
|---------|------------------|------|
| Vercel (web) | Hobby (gratuit) | 0€ |
| Supabase | Free tier | 0€ |
| Expo (mobile) | Free tier | 0€ |
| App Stores | Apple ($99/an) + Google ($25 one-time) | ~120€/an |

Migration vers plans payants quand nécessaire — aucune réécriture de code requise.

---

## 11. Hors scope V1

- Système de commentaires ou forum communautaire
- Notifications push (quête nouvelle, mise à jour)
- Import automatique du Sheet (webhook) — déclenché manuellement en V1
- Statistiques globales de la communauté
- Mode offline complet (mobile)
- Internationalisation (français uniquement en V1)
