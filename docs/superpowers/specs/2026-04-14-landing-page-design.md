# Landing Page — Design Spec
**Date:** 2026-04-14  
**Status:** Approved

## Contexte

La landing page actuelle (`/` non-connecté) est trop minimaliste : titre centré, 2 boutons, 3 cartes generiques. L'objectif est de la rendre plus impactante visuellement tout en restant cohérente avec la charte graphique existante du site.

---

## Charte graphique

Identique au reste du site :
- **Background :** `#22252f` + radial gradients verts (`rgba(74,222,128,0.10)` top-right, bleu subtil mid-left, vert clair bottom-right)
- **Accent :** `#4ade80` / `#22c55e` (gradient)
- **Cards :** glassmorphism — `rgba(52,58,72,0.82)` + `border: 1px solid rgba(255,255,255,0.13)` + `backdrop-filter: blur(16px)`
- **Bouton primary :** `linear-gradient(135deg, #4ade80, #22c55e)`, texte `#0a1a0d`
- **Bouton secondary :** `rgba(255,255,255,0.07)` + border `rgba(255,255,255,0.12)`
- **Layout :** `max-width: 1280px`, padding horizontal `32px` (équivalent `max-w-7xl px-8`)
- **Typographie :** Inter, titres en `font-black uppercase`, eyebrow en `10px letter-spacing: 3px`

---

## Structure de la page

### 1. Nav
- Logo "Dofus **Tracker**" (Tracker en vert)
- Bouton "Se connecter" (btn-primary) à droite
- Bordure bottom `rgba(255,255,255,0.06)`

### 2. Hero (split 50/50)
**Gauche — texte :**
- Eyebrow : `— Dofus Retro —` (vert, uppercase, letterspacing)
- Titre : `MAÎTRISEZ / VOTRE / PROGRESSION` (56px, font-black, uppercase, mot "PROGRESSION" en vert avec glow)
- Description : "Suivez vos quêtes, succès et ressources vers chaque **Dofus Primordial** et Secondaire. Web et mobile, synchronisés."
- CTAs : "Commencer — C'est gratuit" (primary) + "Créer un compte" (secondary)

**Droite — image :**
- `dofus-bar.jpg` (scene taverne Dofus) dans un conteneur `aspect-ratio: 16/10`, `border-radius: 20px`, border glass subtile
- Dégradé overlay sur les bords (fondu vers le fond sombre)
- Box-shadow : `0 24px 64px rgba(0,0,0,0.5)`

### 3. Stats bar (glassmorphism)
4 colonnes séparées par des dividers verticaux :
| Stat | Label |
|------|-------|
| 29 | Dofus référencés |
| 1112 | Quêtes indexées |
| Web | & Mobile |
| 100% | Gratuit |

Chiffres en `#4ade80` avec glow, labels en `rgba(255,255,255,0.28)` uppercase.

### 4. Features — "Tout ce qu'il vous faut"
Grille 2×2. Chaque card : glassmorphism + bordure verte à gauche (2px, gradient to bottom).

Layout de chaque card : icône à gauche (52×52 dans un carré glass) + texte à droite.

| Feature | Icône | Description |
|---------|-------|-------------|
| Suivi de quêtes | `menu_quests.png` | Toutes les quêtes filtrées par alignement et métier |
| Succès | `menu_achievements.png` | Validation automatique au cochage des quêtes |
| Ressources | `ressources.png` | Kamas et items nécessaires pour les quêtes restantes |
| Progression par personnage | `menu_classe.png` | Multi-personnages, progression indépendante par compte |

### 5. Bannière Bonta vs Brakmar
- Image `dofus_bonta_vs_brakmar.jpg` en fond, `height: 180px`, `border-radius: 16px`
- `filter: brightness(0.45)` + overlay dégradé latéral
- 3 stats superposées centrées : **29** Dofus à obtenir · **1112** Quêtes indexées · **∞** Aventures possibles

### 6. CTA final
- Image `dofus-ombres.jpg` en fond (`filter: brightness(0.30)`), `border-radius: 20px`
- Overlay radial vert centré + dégradé vertical
- Contenu centré : eyebrow + titre "PRÊT À TRAQUER / VOS **DOFUS** ?" + description + 2 boutons (même que hero)

### 7. Footer
- Logo à gauche + mention "Fan-made · Non affilié à Ankama" à droite
- Bordure top `rgba(255,255,255,0.06)`

---

## Assets

Tous les assets sont dans `/Users/juliani/Downloads/` et devront être placés dans `apps/web/public/images/landing/` :

| Fichier source | Usage |
|----------------|-------|
| `dofus-bar.jpg` | Hero — image droite |
| `dofus_bonta_vs_brakmar.jpg` | Bannière intermédiaire |
| `dofus-ombres.jpg` | CTA final — fond |
| `menu_quests.png` | Feature card Quêtes |
| `menu_achievements.png` | Feature card Succès |
| `ressources.png` | Feature card Ressources |
| `menu_classe.png` | Feature card Personnage |

> **Note :** Ces icônes officielles Dofus devront également remplacer les emojis dans le reste de l'application de façon cohérente (ex : page détail Dofus, navigation mobile).

---

## Navbar connectée — ajout lien Dofus

Le `Navbar.tsx` (affiché uniquement pour les utilisateurs connectés) doit recevoir un lien explicite vers la page Dofus (`/`), car actuellement seul le clic sur le logo y mène.

**Changement :**
- Ajouter un lien "Dofus" dans la nav connectée, à droite du logo / avant les autres liens
- Icône : `forgelave.png` (à fournir par l'utilisateur) — même style que les autres icônes Dofus (36×36 dans un wrapper)
- Également remplacer l'emoji 🏆 du lien Succès par `menu_achievements.png`

**Asset requis :** `forgelave.png` (icône forgelave Dofus, à placer dans `apps/web/public/images/icons/`)

---

## Routing

| Route | Comportement |
|-------|-------------|
| `/` | Landing page — toujours accessible (connecté ou non) |
| `/dofus` | DofusGrid — requiert auth, redirect `/auth/login` si déconnecté |
| `/auth/login` | Après login, redirect vers `/dofus` |

La `LandingPage` n'est plus conditionnelle — elle est toujours rendue sur `/`.  
La `DofusGrid` déménage sur `/dofus` (nouveau fichier `apps/web/app/dofus/page.tsx`).

---

## Implémentation

- La landing est dans `apps/web/app/page.tsx`, fonction `LandingPage()` (composant server, pas de client)
- Le composant `LandingPage` sera extrait dans `apps/web/components/landing/LandingPage.tsx`
- Les images sont servies via Next.js `<Image>` avec `priority` sur le hero
- La `DofusGrid` déménage de `apps/web/app/page.tsx` vers `apps/web/app/dofus/page.tsx`
- Responsive : le hero split passe en colonne sur mobile (image en dessous du texte), la grille features passe en 1 colonne
- `Navbar.tsx` : ajout lien Dofus (forgelave icon → `/dofus`) + remplacement emoji 🏆 par `menu_achievements.png`
- Les feature cards de la landing ne sont pas cliquables (purement informatives)

---

## Hors scope

- Animations / transitions (pas pour cette version)
- Internationalisation
- Page de démo / screenshot de l'app dans le hero
- Liens dans les feature cards
