# Landing Page Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer la landing page minimaliste de `/` par une page visuellement riche avec artwork Dofus, déplacer la DofusGrid vers `/dofus`, et ajouter un lien Dofus dans la Navbar connectée.

**Architecture:** La landing est désormais toujours rendue sur `/` (connecté ou non), avec un prop `isConnected` pour adapter le nav interne et les CTAs. La DofusGrid déménage sur `/dofus` dans un nouveau `app/dofus/page.tsx`. Le layout existant continue de gérer la Navbar connectée via `{user && <Navbar />}`.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, next/image, Vitest + React Testing Library, Supabase SSR

---

## File Map

| Action | Fichier | Rôle |
|--------|---------|------|
| Créer | `apps/web/public/images/landing/dofus-bar.jpg` | Artwork hero |
| Créer | `apps/web/public/images/landing/dofus-bonta-brakmar.jpg` | Artwork bannière |
| Créer | `apps/web/public/images/landing/dofus-ombres.jpg` | Artwork fond CTA |
| Créer | `apps/web/public/images/icons/menu_quests.png` | Icône quêtes |
| Créer | `apps/web/public/images/icons/menu_achievements.png` | Icône succès |
| Créer | `apps/web/public/images/icons/ressources.png` | Icône ressources |
| Créer | `apps/web/public/images/icons/menu_classe.png` | Icône personnage |
| Copier | `apps/web/public/images/icons/forgelave.png` | Icône lien Dofus (source: `apps/mobile/assets/images/dofus/dofus-Forgelave.png`) |
| Créer | `apps/web/app/dofus/page.tsx` | Page DofusGrid (ex-`/`) |
| Créer | `apps/web/components/landing/LandingPage.tsx` | Composant landing |
| Créer | `apps/web/__tests__/LandingPage.test.tsx` | Tests landing |
| Modifier | `apps/web/app/page.tsx` | Toujours render LandingPage |
| Modifier | `apps/web/app/auth/callback/route.ts` | Redirect vers `/dofus` |
| Modifier | `apps/web/components/nav/Navbar.tsx` | Lien Dofus + icône succès |

> **⚠️ Asset manquant :** `forgelave.png` (icône du lien Dofus dans la Navbar) — l'utilisateur doit le fournir. La Task 6 utilise un placeholder `🥚` en attendant.

---

## Task 1 : Copier les assets dans `public/`

**Files:**
- Créer : `apps/web/public/images/landing/` (dossier)
- Créer : `apps/web/public/images/icons/` (dossier)

- [ ] **Step 1 : Créer les dossiers et copier les assets**

```bash
mkdir -p apps/web/public/images/landing apps/web/public/images/icons

cp /Users/juliani/Downloads/dofus-bar.jpg apps/web/public/images/landing/dofus-bar.jpg
cp /Users/juliani/Downloads/dofus_bonta_vs_brakmar.jpg apps/web/public/images/landing/dofus-bonta-brakmar.jpg
cp /Users/juliani/Downloads/dofus-ombres.jpg apps/web/public/images/landing/dofus-ombres.jpg

cp /Users/juliani/Downloads/menu_quests.png apps/web/public/images/icons/menu_quests.png
cp /Users/juliani/Downloads/menu_achievements.png apps/web/public/images/icons/menu_achievements.png
cp /Users/juliani/Downloads/ressources.png apps/web/public/images/icons/ressources.png
cp /Users/juliani/Downloads/menu_classe.png apps/web/public/images/icons/menu_classe.png
cp apps/mobile/assets/images/dofus/dofus-Forgelave.png apps/web/public/images/icons/forgelave.png
```

- [ ] **Step 2 : Vérifier que les fichiers sont présents**

```bash
ls apps/web/public/images/landing/
ls apps/web/public/images/icons/
```

Attendu :
```
landing/ → dofus-bar.jpg  dofus-bonta-brakmar.jpg  dofus-ombres.jpg
icons/   → forgelave.png  menu_achievements.png  menu_classe.png  menu_quests.png  ressources.png
```

- [ ] **Step 3 : Commit**

```bash
git add apps/web/public/images/
git commit -m "feat(web): add landing page and icon assets"
```

---

## Task 2 : Créer la page `/dofus` (déménagement de DofusGrid)

**Files:**
- Créer : `apps/web/app/dofus/page.tsx`

> Note : `apps/web/app/dofus/[slug]/page.tsx` existe déjà. Le nouveau `page.tsx` est le parent index `/dofus` — Next.js gère les deux sans conflit.

- [ ] **Step 1 : Créer `apps/web/app/dofus/page.tsx`**

```tsx
import { createClient } from "@/lib/supabase/server";
import { getDofusList, getCharacters } from "@dofus-tracker/db";
import { DofusGrid } from "@/components/home/DofusGrid";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mes Dofus — Dofus Tracker",
  description: "Suivez votre progression vers tous les Dofus Primordiaux et Secondaires.",
};

export default async function DofusPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const [dofusList, characters] = await Promise.all([
    getDofusList(supabase),
    getCharacters(supabase, user.id),
  ]);

  if (characters.length === 0) redirect("/profile");

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-white">
          Mes <span className="text-dofus-green">Dofus</span>
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          {dofusList.length} Dofus disponibles · Sélectionne un personnage pour voir ta progression
        </p>
      </header>
      <DofusGrid dofusList={dofusList} />
    </main>
  );
}
```

- [ ] **Step 2 : Vérifier la compilation TypeScript**

```bash
cd apps/web && npx tsc --noEmit
```

Attendu : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add apps/web/app/dofus/page.tsx
git commit -m "feat(web): add /dofus route for DofusGrid"
```

---

## Task 3 : Mettre à jour `app/page.tsx` (root `/`)

**Files:**
- Modifier : `apps/web/app/page.tsx`

La page root ne fait plus de logique DofusGrid. Elle vérifie l'auth uniquement pour passer `isConnected` à `LandingPage`.

- [ ] **Step 1 : Réécrire `apps/web/app/page.tsx`**

```tsx
import { createClient } from "@/lib/supabase/server";
import { LandingPage } from "@/components/landing/LandingPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dofus Tracker – Suivi de progression Dofus Retro",
  description:
    "Suivez votre progression vers tous les Dofus Primordiaux et Secondaires sur Dofus Retro. Gérez vos quêtes, succès et ressources par personnage.",
  keywords: ["Dofus", "Dofus Retro", "tracker", "progression", "quêtes", "succès", "Dofus Emeraude", "Dofus Ocre"],
  openGraph: {
    title: "Dofus Tracker",
    description: "Suivez votre progression vers tous les Dofus sur Dofus Retro.",
    url: "https://dofus-tracker-ten.vercel.app",
    siteName: "Dofus Tracker",
    locale: "fr_FR",
    type: "website",
  },
};

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <LandingPage isConnected={!!user} />;
}
```

- [ ] **Step 2 : Vérifier la compilation TypeScript**

```bash
cd apps/web && npx tsc --noEmit
```

Attendu : erreur sur `LandingPage` (pas encore créé) — c'est normal, on continue.

- [ ] **Step 3 : Commit**

```bash
git add apps/web/app/page.tsx
git commit -m "feat(web): landing page always shown on /, DofusGrid moved to /dofus"
```

---

## Task 4 : Construire le composant `LandingPage`

**Files:**
- Créer : `apps/web/components/landing/LandingPage.tsx`
- Créer : `apps/web/__tests__/LandingPage.test.tsx`

- [ ] **Step 1 : Écrire le test en premier**

```tsx
// apps/web/__tests__/LandingPage.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LandingPage } from "@/components/landing/LandingPage";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("LandingPage", () => {
  it("affiche le titre principal", () => {
    render(<LandingPage isConnected={false} />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("affiche le bouton Se connecter quand non connecté", () => {
    render(<LandingPage isConnected={false} />);
    const links = screen.getAllByRole("link");
    const loginLinks = links.filter((l) => l.getAttribute("href") === "/auth/login");
    expect(loginLinks.length).toBeGreaterThan(0);
  });

  it("n'affiche pas le nav interne quand connecté", () => {
    render(<LandingPage isConnected={true} />);
    expect(screen.queryByText("Se connecter")).not.toBeInTheDocument();
  });

  it("affiche les 4 features", () => {
    render(<LandingPage isConnected={false} />);
    expect(screen.getByText("Suivi de quêtes")).toBeInTheDocument();
    expect(screen.getByText("Succès")).toBeInTheDocument();
    expect(screen.getByText("Ressources")).toBeInTheDocument();
    expect(screen.getByText("Progression par personnage")).toBeInTheDocument();
  });

  it("affiche les stats correctes", () => {
    render(<LandingPage isConnected={false} />);
    expect(screen.getByText("29")).toBeInTheDocument();
    expect(screen.getByText("1112")).toBeInTheDocument();
  });

  it("les CTAs pointent vers /dofus quand connecté", () => {
    render(<LandingPage isConnected={true} />);
    const links = screen.getAllByRole("link");
    const dofusLinks = links.filter((l) => l.getAttribute("href") === "/dofus");
    expect(dofusLinks.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2 : Lancer les tests — vérifier qu'ils échouent**

```bash
cd apps/web && npx vitest run __tests__/LandingPage.test.tsx
```

Attendu : FAIL — `LandingPage` not found.

- [ ] **Step 3 : Créer `apps/web/components/landing/LandingPage.tsx`**

```tsx
import Image from "next/image";
import Link from "next/link";

interface Props {
  isConnected: boolean;
}

const FEATURES = [
  {
    icon: "/images/icons/menu_quests.png",
    alt: "Quêtes",
    title: "Suivi de quêtes",
    desc: "Toutes les quêtes nécessaires à chaque Dofus, filtrées selon votre alignement et votre métier.",
  },
  {
    icon: "/images/icons/menu_achievements.png",
    alt: "Succès",
    title: "Succès",
    desc: "Progressez dans les succès liés aux quêtes. Validation automatique dès qu'une quête est cochée.",
  },
  {
    icon: "/images/icons/ressources.png",
    alt: "Ressources",
    title: "Ressources",
    desc: "Visualisez les ressources et kamas nécessaires pour les quêtes qu'il vous reste à accomplir.",
  },
  {
    icon: "/images/icons/menu_classe.png",
    alt: "Personnage",
    title: "Progression par personnage",
    desc: "Gérez plusieurs personnages indépendamment. Chaque compte a sa propre progression sauvegardée.",
  },
];

export function LandingPage({ isConnected }: Props) {
  const primaryHref = isConnected ? "/dofus" : "/auth/login";
  const primaryLabel = isConnected ? "Accéder à mes Dofus" : "Commencer — C'est gratuit";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#22252f" }}>
      {/* Nav interne — uniquement pour les visiteurs non connectés */}
      {!isConnected && (
        <nav className="border-b border-white/5 px-8 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <span className="text-lg font-black text-white">
              Dofus <span className="text-dofus-green">Tracker</span>
            </span>
            <Link
              href="/auth/login"
              className="btn-primary text-sm px-5 py-2"
            >
              Se connecter
            </Link>
          </div>
        </nav>
      )}

      {/* Hero */}
      <section className="px-8 pt-20 pb-16">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Texte */}
          <div>
            <p className="text-xs tracking-[3px] text-dofus-green uppercase opacity-80 mb-5 flex items-center gap-3">
              <span className="inline-block w-5 h-px bg-dofus-green" />
              Dofus Retro
            </p>
            <h1 className="text-5xl lg:text-6xl font-black uppercase leading-none tracking-tighter text-white mb-6">
              Maîtrisez
              <br />
              votre
              <br />
              <span className="text-dofus-green drop-shadow-[0_0_20px_rgba(74,222,128,0.4)]">
                progression
              </span>
            </h1>
            <p className="text-base text-white/45 leading-relaxed mb-9 max-w-md">
              Suivez vos quêtes, succès et ressources vers chaque{" "}
              <strong className="text-white/75">Dofus Primordial</strong> et
              Secondaire. Web et mobile, synchronisés.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href={primaryHref} className="btn-primary text-sm px-8 py-3">
                {primaryLabel}
              </Link>
              {!isConnected && (
                <Link href="/auth/login" className="btn-secondary text-sm px-6 py-3">
                  Créer un compte
                </Link>
              )}
            </div>
          </div>

          {/* Image hero */}
          <div className="flex justify-center">
            <div className="relative w-full max-w-lg aspect-[16/10] rounded-2xl overflow-hidden border border-white/10 shadow-[0_24px_64px_rgba(0,0,0,0.5)]">
              <Image
                src="/images/landing/dofus-bar.jpg"
                alt="Univers Dofus"
                fill
                className="object-cover"
                priority
              />
              {/* Fondu sur les bords */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#22252f]/40 via-transparent to-[#22252f]/40" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#22252f]/55" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="px-8 pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="glass rounded-2xl py-7 grid grid-cols-2 lg:grid-cols-4">
            {[
              { number: "29", label: "Dofus référencés" },
              { number: "1112", label: "Quêtes indexées" },
              { number: "Web", label: "& Mobile" },
              { number: "100%", label: "Gratuit" },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className={`text-center px-4 ${i > 0 ? "border-l border-white/8" : ""}`}
              >
                <p className="text-3xl font-black text-dofus-green drop-shadow-[0_0_16px_rgba(74,222,128,0.3)]">
                  {stat.number}
                </p>
                <p className="text-[10px] text-white/28 uppercase tracking-[1.5px] mt-1.5">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <section className="px-8 pb-18">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs tracking-[3px] text-dofus-green uppercase opacity-80 mb-3 flex items-center gap-3">
            <span className="inline-block w-5 h-px bg-dofus-green" />
            Fonctionnalités
          </p>
          <h2 className="text-3xl font-black uppercase tracking-tight text-white mb-9">
            Tout ce qu&apos;il vous <span className="text-dofus-green">faut</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="glass rounded-2xl p-7 pl-8 flex gap-5 items-start relative overflow-hidden"
              >
                {/* Bordure verte gauche */}
                <div className="absolute left-0 top-0 w-0.5 h-full bg-gradient-to-b from-dofus-green to-transparent opacity-60" />
                {/* Icône */}
                <div className="shrink-0 w-13 h-13 flex items-center justify-center bg-white/5 border border-white/8 rounded-xl">
                  <Image src={f.icon} alt={f.alt} width={36} height={36} className="object-contain" />
                </div>
                {/* Texte */}
                <div>
                  <p className="text-sm font-bold text-white uppercase tracking-wide mb-2">
                    {f.title}
                  </p>
                  <p className="text-xs text-white/35 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bannière Bonta vs Brakmar */}
      <div className="px-8 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="relative h-44 rounded-2xl overflow-hidden border border-white/8">
            <Image
              src="/images/landing/dofus-bonta-brakmar.jpg"
              alt="Bonta vs Brakmar"
              fill
              className="object-cover object-[center_20%] brightness-[0.45] saturate-110"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#22252f]/70 via-transparent to-[#22252f]/70 flex items-center justify-center gap-14">
              {[
                { n: "29", l: "Dofus à obtenir" },
                { n: "1112", l: "Quêtes indexées" },
                { n: "∞", l: "Aventures possibles" },
              ].map((s, i) => (
                <div key={s.l} className="flex items-center gap-14">
                  {i > 0 && <div className="w-px h-12 bg-white/10" />}
                  <div className="text-center">
                    <p className="text-4xl font-black text-dofus-green drop-shadow-[0_0_16px_rgba(74,222,128,0.4)]">
                      {s.n}
                    </p>
                    <p className="text-[10px] text-white/40 uppercase tracking-[2px] mt-1.5">{s.l}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CTA Final */}
      <div className="px-8 pb-18">
        <div className="max-w-7xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden border border-dofus-green/15 min-h-[320px] flex items-center justify-center">
            {/* Image fond */}
            <Image
              src="/images/landing/dofus-ombres.jpg"
              alt=""
              fill
              className="object-cover brightness-[0.30] saturate-[0.85]"
            />
            {/* Overlays */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(74,222,128,0.07)_0%,transparent_55%)]" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#22252f]/45 via-transparent to-[#22252f]/65" />
            {/* Contenu */}
            <div className="relative z-10 text-center px-12 py-16">
              <p className="text-xs tracking-[3px] text-dofus-green uppercase opacity-80 mb-5">
                Rejoignez la quête
              </p>
              <h2 className="text-4xl font-black uppercase tracking-tight text-white leading-tight mb-4 drop-shadow-[0_2px_20px_rgba(0,0,0,0.6)]">
                Prêt à traquer
                <br />
                vos{" "}
                <span className="text-dofus-green drop-shadow-[0_0_24px_rgba(74,222,128,0.5)]">
                  Dofus
                </span>{" "}
                ?
              </h2>
              <p className="text-sm text-white/45 mb-9">
                Gratuit. Disponible sur web et sur mobile (Android).
              </p>
              <div className="flex gap-4 justify-center flex-wrap">
                <Link href={primaryHref} className="btn-primary text-sm px-8 py-3">
                  {primaryLabel}
                </Link>
                {!isConnected && (
                  <Link href="/auth/login" className="btn-secondary text-sm px-6 py-3">
                    Créer un compte
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/6 px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="text-sm font-bold text-white/25">
            Dofus <span className="text-dofus-green/45">Tracker</span>
          </span>
          <span className="text-xs text-white/18">Fan-made · Non affilié à Ankama</span>
        </div>
      </footer>
    </div>
  );
}
```

- [ ] **Step 4 : Lancer les tests — vérifier qu'ils passent**

```bash
cd apps/web && npx vitest run __tests__/LandingPage.test.tsx
```

Attendu : 6 tests PASS.

- [ ] **Step 5 : Lancer tous les tests pour vérifier l'absence de régression**

```bash
cd apps/web && npx vitest run
```

Attendu : tous les tests existants passent.

- [ ] **Step 6 : Vérifier la compilation TypeScript**

```bash
cd apps/web && npx tsc --noEmit
```

Attendu : aucune erreur.

- [ ] **Step 7 : Commit**

```bash
git add apps/web/components/landing/LandingPage.tsx apps/web/__tests__/LandingPage.test.tsx
git commit -m "feat(web): build LandingPage component with artwork and Dofus icons"
```

---

## Task 5 : Mettre à jour le redirect auth callback

**Files:**
- Modifier : `apps/web/app/auth/callback/route.ts`

Après login, l'utilisateur doit être redirigé vers `/dofus` (la feature principale) et non `/`.

- [ ] **Step 1 : Modifier `apps/web/app/auth/callback/route.ts`**

Ligne 30, changer `${origin}/` en `${origin}/dofus` :

```ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}/dofus`);
}
```

- [ ] **Step 2 : Vérifier la compilation TypeScript**

```bash
cd apps/web && npx tsc --noEmit
```

Attendu : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add apps/web/app/auth/callback/route.ts
git commit -m "feat(web): redirect to /dofus after login"
```

---

## Task 6 : Mettre à jour la Navbar connectée

**Files:**
- Modifier : `apps/web/components/nav/Navbar.tsx`

Ajouter un lien "Dofus" vers `/dofus` et remplacer l'emoji 🏆 par l'icône `menu_achievements.png`.

> **Forgelave icon :** disponible dans `apps/mobile/assets/images/dofus/dofus-Forgelave.png`, copié dans `apps/web/public/images/icons/forgelave.png` à la Task 1.

- [ ] **Step 1 : Modifier `apps/web/components/nav/Navbar.tsx`**

```tsx
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getCharacters } from "@dofus-tracker/db";
import { CharacterSelector } from "./CharacterSelector";

interface Props {
  userId: string;
}

export async function Navbar({ userId }: Props) {
  const supabase = await createClient();
  const [characters, { data: emeraude }] = await Promise.all([
    getCharacters(supabase, userId),
    supabase.from("dofus").select("image_url").eq("slug", "dofus-emeraude").maybeSingle(),
  ]);

  return (
    <nav className="glass border-b border-white/5 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Logo → landing */}
        <Link href="/" className="flex items-center gap-2 animate-glow">
          {emeraude?.image_url ? (
            <Image src={emeraude.image_url} alt="Dofus Émeraude" width={28} height={28} className="object-contain" />
          ) : (
            <span className="text-xl">🥚</span>
          )}
          <span className="font-bold text-dofus-green tracking-wide">Dofus Tracker</span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <CharacterSelector characters={characters} />

          {/* Lien Dofus — icône forgelave */}
          <Link href="/dofus" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
            <Image
              src="/images/icons/forgelave.png"
              alt="Dofus"
              width={18}
              height={18}
              className="object-contain"
            />
            Dofus
          </Link>

          {/* Succès avec icône officielle */}
          <Link href="/achievements" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
            <Image
              src="/images/icons/menu_achievements.png"
              alt="Succès"
              width={18}
              height={18}
              className="object-contain"
            />
            Succès
          </Link>

          <Link href="/characters" className="text-sm text-gray-400 hover:text-white transition-colors">
            Personnages
          </Link>

          <form action="/auth/signout" method="post">
            <button type="submit" className="text-sm text-gray-400 hover:text-red-400 transition-colors">
              Déconnexion
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2 : Vérifier la compilation TypeScript**

```bash
cd apps/web && npx tsc --noEmit
```

Attendu : aucune erreur.

- [ ] **Step 3 : Lancer tous les tests**

```bash
cd apps/web && npx vitest run
```

Attendu : tous les tests passent.

- [ ] **Step 4 : Commit**

```bash
git add apps/web/components/nav/Navbar.tsx
git commit -m "feat(web): add Dofus nav link and achievements icon in Navbar"
```

---

## Task 7 : Test navigateur — vérification visuelle

- [ ] **Step 1 : Démarrer le serveur de dev**

```bash
cd apps/web && pnpm dev
```

- [ ] **Step 2 : Tester les scénarios suivants**

| Scénario | URL | Attendu |
|----------|-----|---------|
| Visiteur non connecté | `http://localhost:3000/` | Landing page avec nav interne + "Se connecter" |
| Visiteur non connecté | `http://localhost:3000/dofus` | Redirect vers `/auth/login` |
| Après login | redirect | Arrive sur `/dofus` (DofusGrid) |
| Connecté visite `/` | `http://localhost:3000/` | Landing sans nav interne, Navbar du layout visible, CTAs → `/dofus` |
| Connecté clique "Dofus" dans nav | — | Arrive sur `/dofus` |
| Connecté clique logo | — | Arrive sur `/` (landing) |
| Images hero | Landing | `dofus-bar.jpg` visible dans le hero |
| Bannière | Landing | `dofus-bonta-brakmar.jpg` visible |
| CTA fond | Landing | `dofus-ombres.jpg` visible |
| Icônes features | Landing | 4 icônes officielles Dofus visibles |
| Icône Succès dans nav | Nav connecté | `menu_achievements.png` visible |
| Mobile | Landing (< 640px) | Hero en colonne, features en 1 colonne |

- [ ] **Step 3 : Commit final si des ajustements visuels mineurs ont été faits**

```bash
git add -p
git commit -m "fix(web): landing page visual adjustments"
```

