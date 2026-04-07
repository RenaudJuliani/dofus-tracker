# Plan 2a — Web App (Next.js 14) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the DofusTracker web app (Next.js 14 App Router) with Supabase Auth, Dofus progression tracking per character, cross-Dofus quest propagation, and a premium design system.

**Architecture:** Server Components for initial data fetching (dofus list, user auth), Client Components for interactivity (quest checkboxes, character selector, progress updates). Active character state stored in Zustand with localStorage persistence. Supabase SSR for session management in `middleware.ts`. Optimistic UI for quest toggles — local state updated immediately, rollback on error.

**Tech Stack:** Next.js 14 (App Router), Tailwind CSS 3.4, @supabase/ssr 0.5, @supabase/supabase-js 2.43, Zustand 4.5, Vitest 1.6, @testing-library/react 16, TypeScript 5.4

**Scope note:** `apps/mobile` is Plan 2b. Components live in `apps/web/components/` — extraction to `packages/ui` happens in Plan 2b when native sharing becomes real.

---

## File Map

```
apps/web/
  package.json
  tsconfig.json
  next.config.mjs
  tailwind.config.ts
  postcss.config.mjs
  vitest.config.ts
  vitest.setup.ts
  .env.local.example
  middleware.ts                          ← session refresh, auth guard
  app/
    layout.tsx                           ← root layout: fonts, Providers, Navbar
    page.tsx                             ← homepage: dofus grid (Server Component)
    globals.css                          ← design tokens, Tailwind directives, animations
    providers.tsx                        ← Supabase browser client context
    auth/
      login/page.tsx                     ← login/signup page
      callback/route.ts                  ← OAuth code exchange
      signout/route.ts                   ← POST → sign out + redirect
    dofus/
      [slug]/page.tsx                    ← dofus detail (Server Component shell)
    profile/
      page.tsx                           ← character management (Server Component shell)
  components/
    nav/
      Navbar.tsx                         ← top bar: logo, links, CharacterSelector, avatar/signout
      CharacterSelector.tsx              ← client: dropdown to pick active character
    home/
      DofusGrid.tsx                      ← client: reads active char, fetches progress, renders cards
      DofusCard.tsx                      ← pure display: egg image, name, progress bar, color
    dofus/
      DofusDetailClient.tsx              ← client: fetches quests+resources for active char
      DofusHeader.tsx                    ← egg, name, description, stats, progress bar, shared info
      QuestSection.tsx                   ← labeled section (Prérequis / Chaîne principale) + bulk button
      QuestItem.tsx                      ← single quest row: checkbox, name link, badges, group box
      ResourcePanel.tsx                  ← sticky sidebar: resources list + ResourceMultiplier
    auth/
      AuthForm.tsx                       ← client: email/password form + OAuth buttons
    profile/
      CharacterManager.tsx               ← client: list chars, add form, delete button
  lib/
    supabase/
      client.ts                          ← createBrowserClient (browser Supabase)
      server.ts                          ← createServerClient (server Supabase, uses cookies())
    stores/
      characterStore.ts                  ← Zustand: activeCharacterId + setActiveCharacterId
  __tests__/
    AuthForm.test.tsx
    DofusCard.test.tsx
    QuestItem.test.tsx
    CharacterSelector.test.tsx
    ResourcePanel.test.tsx
    CharacterManager.test.tsx
```

**Existing packages (read-only, already built):**
- `@dofus-tracker/types` — `Dofus`, `Quest`, `DofusQuestChain`, `QuestWithChain`, `Character`, `Resource`, `DofusProgress`, `QuestSection`, `QuestType`, etc.
- `@dofus-tracker/db` — `getDofusList`, `getDofusBySlug`, `getDofusProgressForCharacter`, `getQuestsForDofus`, `toggleQuestCompletion`, `bulkCompleteSection`, `getResourcesForDofus`, `getCharacters`, `createCharacter`, `deleteCharacter`, `createSupabaseClient`

---

## Task 1: Scaffold apps/web

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next.config.mjs`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/postcss.config.mjs`
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/vitest.setup.ts`
- Create: `apps/web/.env.local.example`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@dofus-tracker/web",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@dofus-tracker/db": "workspace:*",
    "@dofus-tracker/types": "workspace:*",
    "@supabase/ssr": "^0.5.2",
    "@supabase/supabase-js": "^2.43.4",
    "next": "^14.2.29",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zustand": "^4.5.4"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.6",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/node": "^20.14.0",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.19",
    "jsdom": "^24.1.1",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.4.5",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    },
    "baseUrl": "."
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create next.config.mjs**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@dofus-tracker/db", "@dofus-tracker/types"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "fmhfivaxlairclolwmby.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
```

- [ ] **Step 4: Create tailwind.config.ts**

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "dofus-green": "#4ade80",
        "dofus-green-dark": "#22c55e",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
      },
      backdropBlur: {
        glass: "16px",
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 5: Create postcss.config.mjs**

```js
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
```

- [ ] **Step 6: Create vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

- [ ] **Step 7: Create vitest.setup.ts**

```ts
import "@testing-library/jest-dom";
```

- [ ] **Step 8: Create .env.local.example**

```
NEXT_PUBLIC_SUPABASE_URL=https://fmhfivaxlairclolwmby.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 9: Install dependencies**

```bash
cd apps/web && pnpm install
```

Expected: dependencies installed with no errors.

- [ ] **Step 10: Verify typecheck passes on empty project**

Create a minimal `app/page.tsx` to unblock typecheck:

```tsx
export default function Page() {
  return <div />;
}
```

```bash
cd apps/web && pnpm typecheck
```

Expected: no errors (or only "Cannot find module 'next-env.d.ts'" which resolves after first build).

- [ ] **Step 11: Commit**

```bash
git add apps/web/package.json apps/web/tsconfig.json apps/web/next.config.mjs apps/web/tailwind.config.ts apps/web/postcss.config.mjs apps/web/vitest.config.ts apps/web/vitest.setup.ts apps/web/.env.local.example apps/web/app/page.tsx pnpm-lock.yaml
git commit -m "feat(web): scaffold Next.js 14 app with Tailwind, Vitest, Supabase SSR"
```

---

## Task 2: Global CSS + Design System

**Files:**
- Create: `apps/web/app/globals.css`

- [ ] **Step 1: Create globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ─── Google Fonts ─────────────────────────────────────────── */
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap");

/* ─── CSS Variables ─────────────────────────────────────────── */
:root {
  --color-accent: #4ade80;
  --color-accent-dark: #22c55e;
  --glass-bg: rgba(8, 16, 10, 0.64);
  --glass-border: rgba(255, 255, 255, 0.09);
}

/* ─── Base ──────────────────────────────────────────────────── */
html {
  scroll-behavior: smooth;
}

body {
  @apply bg-gray-950 text-white font-sans antialiased;
  background-image:
    radial-gradient(ellipse at 20% 50%, rgba(34, 197, 94, 0.06) 0%, transparent 60%),
    radial-gradient(ellipse at 80% 20%, rgba(16, 185, 129, 0.04) 0%, transparent 50%);
  min-height: 100vh;
}

/* ─── Glassmorphism Card ────────────────────────────────────── */
@layer components {
  .glass {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }

  .glass-hover {
    @apply glass transition-all duration-300 cursor-pointer;
  }
  .glass-hover:hover {
    transform: translateY(-5px) scale(1.015);
    border-color: rgba(74, 222, 128, 0.2);
    box-shadow: 0 8px 32px rgba(74, 222, 128, 0.08);
  }

  /* ─── Buttons ─────────────────────────────────────────────── */
  .btn-primary {
    @apply px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200;
    background: linear-gradient(135deg, #4ade80, #22c55e);
    color: #0a1a0d;
  }
  .btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(74, 222, 128, 0.35);
  }
  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .btn-secondary {
    @apply px-4 py-2 rounded-lg font-medium text-sm text-white transition-all duration-200;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
  }
  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.13);
    border-color: rgba(255, 255, 255, 0.2);
  }

  /* ─── Inputs ──────────────────────────────────────────────── */
  .input {
    @apply w-full px-4 py-2.5 rounded-lg text-sm text-white bg-transparent outline-none transition-colors;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
  }
  .input:focus {
    border-color: rgba(74, 222, 128, 0.5);
    box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.1);
  }
  .input::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }

  /* ─── Progress Bar ────────────────────────────────────────── */
  .progress-bar-track {
    @apply h-1.5 rounded-full overflow-hidden;
    background: rgba(255, 255, 255, 0.08);
  }

  .progress-bar-fill {
    @apply h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden;
  }

  .progress-bar-fill::after {
    content: "";
    @apply absolute inset-0;
    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%);
    animation: shimmer 2.5s infinite;
  }
}

/* ─── Animations ─────────────────────────────────────────────── */
@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  33% { transform: translateY(-8px) rotate(1deg); }
  66% { transform: translateY(-4px) rotate(-0.5deg); }
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}

@keyframes glow-pulse {
  0%, 100% { filter: drop-shadow(0 0 6px rgba(74, 222, 128, 0.5)); }
  50% { filter: drop-shadow(0 0 14px rgba(74, 222, 128, 0.8)); }
}

@keyframes fog-drift {
  0% { transform: translateX(-5%) scale(1.1); opacity: 0.03; }
  50% { transform: translateX(5%) scale(1.15); opacity: 0.05; }
  100% { transform: translateX(-5%) scale(1.1); opacity: 0.03; }
}

.animate-float {
  animation: float 4s ease-in-out infinite;
}

.animate-glow {
  animation: glow-pulse 3s ease-in-out infinite;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/globals.css
git commit -m "feat(web): add global CSS design system (glassmorphism, animations, tokens)"
```

---

## Task 3: Supabase Clients

**Files:**
- Create: `apps/web/lib/supabase/client.ts`
- Create: `apps/web/lib/supabase/server.ts`
- Test: `apps/web/__tests__/supabase-clients.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// apps/web/__tests__/supabase-clients.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: vi.fn(() => ({ auth: { getUser: vi.fn() } })),
  createServerClient: vi.fn(() => ({ auth: { getUser: vi.fn() } })),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      getAll: vi.fn(() => []),
      set: vi.fn(),
    })
  ),
}));

describe("Supabase clients", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
  });

  it("browser client is created with env vars", async () => {
    const { createBrowserClient } = await import("@supabase/ssr");
    const { createClient } = await import("@/lib/supabase/client");
    createClient();
    expect(createBrowserClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-key"
    );
  });

  it("server client is created with env vars", async () => {
    const { createServerClient } = await import("@supabase/ssr");
    const { createClient } = await import("@/lib/supabase/server");
    await createClient();
    expect(createServerClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-key",
      expect.any(Object)
    );
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd apps/web && pnpm test -- --reporter=verbose __tests__/supabase-clients.test.ts
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Create lib/supabase/client.ts**

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 4: Create lib/supabase/server.ts**

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — can't set cookies, ignore
          }
        },
      },
    }
  );
}
```

- [ ] **Step 5: Run test — verify it passes**

```bash
cd apps/web && pnpm test -- --reporter=verbose __tests__/supabase-clients.test.ts
```

Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/supabase/client.ts apps/web/lib/supabase/server.ts apps/web/__tests__/supabase-clients.test.ts
git commit -m "feat(web): add Supabase SSR browser and server clients"
```

---

## Task 4: Auth Middleware

**Files:**
- Create: `apps/web/middleware.ts`

No unit test for middleware (Next.js middleware requires integration test setup with `next-test-api-route-handler` — out of scope for Plan 2). Verify manually.

- [ ] **Step 1: Create middleware.ts**

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — IMPORTANT: getUser() is required to refresh the token
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = request.nextUrl.pathname.startsWith("/auth");

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/middleware.ts
git commit -m "feat(web): add auth middleware with session refresh and redirect guard"
```

---

## Task 5: Auth Pages

**Files:**
- Create: `apps/web/components/auth/AuthForm.tsx`
- Create: `apps/web/app/auth/login/page.tsx`
- Create: `apps/web/app/auth/callback/route.ts`
- Create: `apps/web/app/auth/signout/route.ts`
- Test: `apps/web/__tests__/AuthForm.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// apps/web/__tests__/AuthForm.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockSignInWithOAuth = vi.fn();
const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: mockSignIn,
      signUp: mockSignUp,
      signInWithOAuth: mockSignInWithOAuth,
    },
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

// Must import AFTER mocks
const { AuthForm } = await import("@/components/auth/AuthForm");

describe("AuthForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignIn.mockResolvedValue({ error: null });
    mockSignUp.mockResolvedValue({ error: null });
  });

  it("renders email and password inputs with submit button", () => {
    render(<AuthForm />);
    expect(screen.getByTestId("email-input")).toBeInTheDocument();
    expect(screen.getByTestId("password-input")).toBeInTheDocument();
    expect(screen.getByTestId("submit-btn")).toBeInTheDocument();
  });

  it("calls signInWithPassword on login submit", async () => {
    render(<AuthForm />);
    await userEvent.type(screen.getByTestId("email-input"), "test@test.com");
    await userEvent.type(screen.getByTestId("password-input"), "password123");
    fireEvent.click(screen.getByTestId("submit-btn"));
    await waitFor(() =>
      expect(mockSignIn).toHaveBeenCalledWith({
        email: "test@test.com",
        password: "password123",
      })
    );
  });

  it("shows error message on auth failure", async () => {
    mockSignIn.mockResolvedValue({ error: { message: "Invalid credentials" } });
    render(<AuthForm />);
    await userEvent.type(screen.getByTestId("email-input"), "test@test.com");
    await userEvent.type(screen.getByTestId("password-input"), "wrong");
    fireEvent.click(screen.getByTestId("submit-btn"));
    await waitFor(() =>
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument()
    );
  });

  it("redirects to homepage on successful login", async () => {
    render(<AuthForm />);
    await userEvent.type(screen.getByTestId("email-input"), "test@test.com");
    await userEvent.type(screen.getByTestId("password-input"), "password123");
    fireEvent.click(screen.getByTestId("submit-btn"));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/"));
  });

  it("switches to signup mode and calls signUp", async () => {
    render(<AuthForm />);
    fireEvent.click(screen.getByText(/S'inscrire/i));
    await userEvent.type(screen.getByTestId("email-input"), "new@test.com");
    await userEvent.type(screen.getByTestId("password-input"), "newpass123");
    fireEvent.click(screen.getByTestId("submit-btn"));
    await waitFor(() =>
      expect(mockSignUp).toHaveBeenCalledWith({
        email: "new@test.com",
        password: "newpass123",
      })
    );
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd apps/web && pnpm test -- --reporter=verbose __tests__/AuthForm.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create components/auth/AuthForm.tsx**

```tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function AuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  async function handleOAuth(provider: "google" | "discord") {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <div className="glass p-8 w-full max-w-md rounded-2xl">
      <h1 className="text-2xl font-bold text-white mb-6">
        {mode === "login" ? "Connexion" : "Créer un compte"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className="input"
          data-testid="email-input"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe"
          required
          className="input"
          data-testid="password-input"
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full"
          data-testid="submit-btn"
        >
          {loading ? "..." : mode === "login" ? "Se connecter" : "S'inscrire"}
        </button>
      </form>

      <div className="mt-4 space-y-2">
        <button
          onClick={() => handleOAuth("google")}
          className="btn-secondary w-full"
        >
          Continuer avec Google
        </button>
        <button
          onClick={() => handleOAuth("discord")}
          className="btn-secondary w-full"
        >
          Continuer avec Discord
        </button>
      </div>

      <button
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
        className="mt-4 text-sm text-gray-400 hover:text-white transition-colors"
      >
        {mode === "login"
          ? "Pas de compte ? S'inscrire"
          : "Déjà un compte ? Se connecter"}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Create app/auth/login/page.tsx**

```tsx
import { AuthForm } from "@/components/auth/AuthForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <AuthForm />
    </main>
  );
}
```

- [ ] **Step 5: Create app/auth/callback/route.ts**

```ts
import { createServerClient } from "@supabase/ssr";
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
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}/`);
}
```

- [ ] **Step 6: Create app/auth/signout/route.ts**

```ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const origin = new URL(request.url).origin;
  return NextResponse.redirect(`${origin}/auth/login`);
}
```

- [ ] **Step 7: Run test — verify it passes**

```bash
cd apps/web && pnpm test -- --reporter=verbose __tests__/AuthForm.test.tsx
```

Expected: PASS (5 tests).

- [ ] **Step 8: Commit**

```bash
git add apps/web/components/auth/AuthForm.tsx apps/web/app/auth/
git add apps/web/__tests__/AuthForm.test.tsx
git commit -m "feat(web): add auth pages, OAuth callbacks, signout route"
```

---

## Task 6: Root Layout + Providers

**Files:**
- Create: `apps/web/app/providers.tsx`
- Create: `apps/web/lib/stores/characterStore.ts`
- Create: `apps/web/app/layout.tsx`

No unit tests for layout/providers (integration-level concerns). Verify via dev server.

- [ ] **Step 1: Create lib/stores/characterStore.ts**

```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CharacterStore {
  activeCharacterId: string | null;
  setActiveCharacterId: (id: string | null) => void;
}

export const useCharacterStore = create<CharacterStore>()(
  persist(
    (set) => ({
      activeCharacterId: null,
      setActiveCharacterId: (id) => set({ activeCharacterId: id }),
    }),
    { name: "dofus-tracker-character" }
  )
);
```

- [ ] **Step 2: Create app/providers.tsx**

```tsx
"use client";

import { createContext, useContext, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

const SupabaseContext = createContext<SupabaseClient | null>(null);

export function useSupabase(): SupabaseClient {
  const ctx = useContext(SupabaseContext);
  if (!ctx) throw new Error("useSupabase must be used within <Providers>");
  return ctx;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createClient());
  return (
    <SupabaseContext.Provider value={supabase}>
      {children}
    </SupabaseContext.Provider>
  );
}
```

- [ ] **Step 3: Create app/layout.tsx**

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/nav/Navbar";
import { createClient } from "@/lib/supabase/server";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Dofus Tracker",
  description: "Suivi de progression pour les Dofus",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="fr" className={inter.variable}>
      <body>
        <Providers>
          {user && <Navbar userId={user.id} />}
          <div className="min-h-screen">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/providers.tsx apps/web/lib/stores/characterStore.ts apps/web/app/layout.tsx
git commit -m "feat(web): add Supabase context provider, character Zustand store, root layout"
```

---

## Task 7: Navbar + CharacterSelector

**Files:**
- Create: `apps/web/components/nav/CharacterSelector.tsx`
- Create: `apps/web/components/nav/Navbar.tsx`
- Test: `apps/web/__tests__/CharacterSelector.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// apps/web/__tests__/CharacterSelector.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Character } from "@dofus-tracker/types";

const mockSetActiveCharacterId = vi.fn();
let mockActiveId: string | null = null;

vi.mock("@/lib/stores/characterStore", () => ({
  useCharacterStore: (selector: (s: { activeCharacterId: string | null; setActiveCharacterId: (id: string | null) => void }) => unknown) =>
    selector({
      activeCharacterId: mockActiveId,
      setActiveCharacterId: mockSetActiveCharacterId,
    }),
}));

const characters: Character[] = [
  { id: "c1", user_id: "u1", name: "Tougli", character_class: "Cra", created_at: "2024-01-01" },
  { id: "c2", user_id: "u1", name: "MonIop", character_class: "Iop", created_at: "2024-01-02" },
];

const { CharacterSelector } = await import("@/components/nav/CharacterSelector");

describe("CharacterSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActiveId = "c1";
  });

  it("renders the active character name", () => {
    render(<CharacterSelector characters={characters} />);
    expect(screen.getByText("Tougli")).toBeInTheDocument();
  });

  it("opens dropdown on click and shows all characters", () => {
    render(<CharacterSelector characters={characters} />);
    fireEvent.click(screen.getByRole("button", { name: /Tougli/i }));
    expect(screen.getByText("MonIop")).toBeInTheDocument();
    expect(screen.getByText("Iop")).toBeInTheDocument();
  });

  it("calls setActiveCharacterId when another character is selected", () => {
    render(<CharacterSelector characters={characters} />);
    fireEvent.click(screen.getByRole("button", { name: /Tougli/i }));
    fireEvent.click(screen.getByText("MonIop"));
    expect(mockSetActiveCharacterId).toHaveBeenCalledWith("c2");
  });

  it("shows 'Aucun personnage' when list is empty", () => {
    render(<CharacterSelector characters={[]} />);
    expect(screen.getByText("Aucun personnage")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd apps/web && pnpm test -- --reporter=verbose __tests__/CharacterSelector.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Create components/nav/CharacterSelector.tsx**

```tsx
"use client";

import { useState } from "react";
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
    return <span className="text-sm text-gray-400">Aucun personnage</span>;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 btn-secondary text-sm px-3 py-1.5"
        aria-label={active?.name ?? "Sélectionner un personnage"}
      >
        <span className="text-dofus-green">⚔</span>
        <span>{active?.name ?? "Choisir"}</span>
        <span className="text-gray-400 text-xs">{active?.character_class}</span>
        <span className="text-gray-500 ml-1">▾</span>
      </button>

      {open && (
        <div className="absolute top-full mt-1 right-0 glass rounded-xl overflow-hidden z-50 min-w-[160px]">
          {characters.map((char) => (
            <button
              key={char.id}
              onClick={() => {
                setActiveCharacterId(char.id);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 transition-colors flex items-center justify-between gap-3 ${
                char.id === active?.id ? "text-dofus-green" : "text-white"
              }`}
            >
              <span>{char.name}</span>
              <span className="text-xs text-gray-400">{char.character_class}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create components/nav/Navbar.tsx**

```tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCharacters } from "@dofus-tracker/db";
import { CharacterSelector } from "./CharacterSelector";

interface Props {
  userId: string;
}

export async function Navbar({ userId }: Props) {
  const supabase = await createClient();
  const characters = await getCharacters(supabase, userId);

  return (
    <nav className="glass border-b border-white/5 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 animate-glow">
          <span className="text-xl">🥚</span>
          <span className="font-bold text-dofus-green tracking-wide">Dofus Tracker</span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <CharacterSelector characters={characters} />

          <Link href="/profile" className="text-sm text-gray-400 hover:text-white transition-colors">
            Profil
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

- [ ] **Step 5: Run test — verify it passes**

```bash
cd apps/web && pnpm test -- --reporter=verbose __tests__/CharacterSelector.test.tsx
```

Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/nav/ apps/web/__tests__/CharacterSelector.test.tsx
git commit -m "feat(web): add Navbar with CharacterSelector dropdown"
```

---

## Task 8: Homepage — DofusGrid + DofusCard

**Files:**
- Create: `apps/web/components/home/DofusCard.tsx`
- Create: `apps/web/components/home/DofusGrid.tsx`
- Modify: `apps/web/app/page.tsx`
- Test: `apps/web/__tests__/DofusCard.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// apps/web/__tests__/DofusCard.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Dofus, DofusProgress } from "@dofus-tracker/types";

const dofus: Dofus = {
  id: "d1",
  name: "Dofus Émeraude",
  slug: "emeraude",
  type: "primordial",
  color: "#22c55e",
  description: "Le plus précieux des Dofus.",
  recommended_level: 200,
  image_url: null,
  created_at: "2024-01-01",
  updated_at: "2024-01-01",
};

const progress: DofusProgress = {
  character_id: "c1",
  user_id: "u1",
  character_name: "Tougli",
  dofus_id: "d1",
  dofus_name: "Dofus Émeraude",
  total_quests: 50,
  completed_quests: 25,
  progress_pct: 50,
};

const { DofusCard } = await import("@/components/home/DofusCard");

describe("DofusCard", () => {
  it("renders the dofus name", () => {
    render(<DofusCard dofus={dofus} progress={progress} />);
    expect(screen.getByText("Dofus Émeraude")).toBeInTheDocument();
  });

  it("renders progress percentage", () => {
    render(<DofusCard dofus={dofus} progress={progress} />);
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("renders quest counts", () => {
    render(<DofusCard dofus={dofus} progress={progress} />);
    expect(screen.getByText("25 / 50 quêtes")).toBeInTheDocument();
  });

  it("renders 0% when no progress provided", () => {
    render(<DofusCard dofus={dofus} progress={null} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("links to the dofus detail page", () => {
    render(<DofusCard dofus={dofus} progress={progress} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/dofus/emeraude");
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd apps/web && pnpm test -- --reporter=verbose __tests__/DofusCard.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Create components/home/DofusCard.tsx**

```tsx
import Link from "next/link";
import Image from "next/image";
import type { Dofus, DofusProgress } from "@dofus-tracker/types";

interface Props {
  dofus: Dofus;
  progress: DofusProgress | null;
}

export function DofusCard({ dofus, progress }: Props) {
  const pct = progress?.progress_pct ?? 0;
  const completed = progress?.completed_quests ?? 0;
  const total = progress?.total_quests ?? 0;

  return (
    <Link href={`/dofus/${dofus.slug}`} className="block">
      <div className="glass-hover rounded-2xl p-5 flex flex-col gap-4 h-full">
        {/* Egg image */}
        <div className="flex justify-center">
          <div
            className="w-20 h-20 animate-float relative"
            style={{ animationDelay: `${Math.random() * 2}s` }}
          >
            {dofus.image_url ? (
              <Image
                src={dofus.image_url}
                alt={dofus.name}
                fill
                className="object-contain"
              />
            ) : (
              // Colored placeholder egg when no image uploaded yet
              <div
                className="w-full h-full rounded-full opacity-70"
                style={{
                  background: `radial-gradient(circle at 35% 35%, ${dofus.color}dd, ${dofus.color}44)`,
                  boxShadow: `0 0 20px ${dofus.color}44`,
                }}
              />
            )}
          </div>
        </div>

        {/* Name + type */}
        <div>
          <h3 className="font-bold text-white text-center leading-tight">{dofus.name}</h3>
          <p className="text-xs text-gray-400 text-center capitalize mt-0.5">{dofus.type}</p>
        </div>

        {/* Progress */}
        <div className="mt-auto">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-gray-400">{completed} / {total} quêtes</span>
            <span className="text-sm font-bold" style={{ color: dofus.color }}>
              {pct}%
            </span>
          </div>
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill"
              style={{
                width: `${pct}%`,
                background: `linear-gradient(90deg, ${dofus.color}aa, ${dofus.color})`,
              }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 4: Create components/home/DofusGrid.tsx**

```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useCharacterStore } from "@/lib/stores/characterStore";
import { useSupabase } from "@/app/providers";
import { getDofusProgressForCharacter } from "@dofus-tracker/db";
import { DofusCard } from "./DofusCard";
import type { Dofus, DofusProgress } from "@dofus-tracker/types";

interface Props {
  dofusList: Dofus[];
}

export function DofusGrid({ dofusList }: Props) {
  const supabase = useSupabase();
  const activeCharacterId = useCharacterStore((s) => s.activeCharacterId);
  const [progressMap, setProgressMap] = useState<Map<string, DofusProgress>>(new Map());
  const [loading, setLoading] = useState(false);

  const loadProgress = useCallback(async () => {
    if (!activeCharacterId) {
      setProgressMap(new Map());
      return;
    }
    setLoading(true);
    try {
      const rows = await getDofusProgressForCharacter(supabase, activeCharacterId);
      setProgressMap(new Map(rows.map((r) => [r.dofus_id, r])));
    } finally {
      setLoading(false);
    }
  }, [supabase, activeCharacterId]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const primordial = dofusList.filter((d) => d.type === "primordial");
  const secondaire = dofusList.filter((d) => d.type === "secondaire");

  return (
    <div className="space-y-10">
      {loading && (
        <p className="text-center text-gray-400 text-sm animate-pulse">
          Chargement de la progression…
        </p>
      )}

      {[
        { label: "Primordiaux", list: primordial },
        { label: "Secondaires", list: secondaire },
      ].map(({ label, list }) =>
        list.length > 0 ? (
          <section key={label}>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-dofus-green inline-block" />
              {label}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {list.map((dofus) => (
                <DofusCard
                  key={dofus.id}
                  dofus={dofus}
                  progress={progressMap.get(dofus.id) ?? null}
                />
              ))}
            </div>
          </section>
        ) : null
      )}
    </div>
  );
}
```

- [ ] **Step 5: Update app/page.tsx**

```tsx
import { createClient } from "@/lib/supabase/server";
import { getDofusList, getCharacters } from "@dofus-tracker/db";
import { DofusGrid } from "@/components/home/DofusGrid";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const [dofusList, characters] = await Promise.all([
    getDofusList(supabase),
    getCharacters(supabase, user.id),
  ]);

  // If the user has no characters, redirect to profile to create one
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

- [ ] **Step 6: Run test — verify it passes**

```bash
cd apps/web && pnpm test -- --reporter=verbose __tests__/DofusCard.test.tsx
```

Expected: PASS (5 tests).

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/home/ apps/web/app/page.tsx apps/web/__tests__/DofusCard.test.tsx
git commit -m "feat(web): homepage with DofusGrid, DofusCard, and per-character progress"
```

---

## Task 9: Dofus Detail Page — Server Shell

**Files:**
- Create: `apps/web/app/dofus/[slug]/page.tsx`
- Create: `apps/web/components/dofus/DofusDetailClient.tsx`

No new tests here — the interactive parts are tested in Tasks 10–13.

- [ ] **Step 1: Create app/dofus/[slug]/page.tsx**

```tsx
import { createClient } from "@/lib/supabase/server";
import { getDofusBySlug, getDofusList } from "@dofus-tracker/db";
import { DofusDetailClient } from "@/components/dofus/DofusDetailClient";
import { notFound, redirect } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function DofusDetailPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [dofus, allDofus] = await Promise.all([
    getDofusBySlug(supabase, slug),
    getDofusList(supabase),
  ]);

  if (!dofus) notFound();

  return (
    <DofusDetailClient
      dofus={dofus}
      allDofus={allDofus}
      userId={user.id}
    />
  );
}
```

- [ ] **Step 2: Create components/dofus/DofusDetailClient.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useCharacterStore } from "@/lib/stores/characterStore";
import { useSupabase } from "@/app/providers";
import {
  getQuestsForDofus,
  getResourcesForDofus,
  getCharacters,
  toggleQuestCompletion,
  bulkCompleteSection,
} from "@dofus-tracker/db";
import { DofusHeader } from "./DofusHeader";
import { QuestSection } from "./QuestSection";
import { ResourcePanel } from "./ResourcePanel";
import type { Dofus, QuestWithChain, Resource } from "@dofus-tracker/types";

interface Props {
  dofus: Dofus;
  allDofus: Dofus[];
  userId: string;
}

export function DofusDetailClient({ dofus, allDofus, userId }: Props) {
  const supabase = useSupabase();
  const activeCharacterId = useCharacterStore((s) => s.activeCharacterId);

  const [quests, setQuests] = useState<QuestWithChain[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeCharacterId) {
      setQuests([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      getQuestsForDofus(supabase, dofus.id, activeCharacterId),
      getResourcesForDofus(supabase, dofus.id),
    ])
      .then(([q, r]) => {
        setQuests(q);
        setResources(r);
      })
      .finally(() => setLoading(false));
  }, [supabase, dofus.id, activeCharacterId]);

  async function handleToggle(questId: string, completed: boolean) {
    if (!activeCharacterId) return;
    // Optimistic update
    setQuests((prev) =>
      prev.map((q) =>
        q.id === questId ? { ...q, is_completed: completed } : q
      )
    );
    try {
      await toggleQuestCompletion(supabase, activeCharacterId, questId, completed);
    } catch {
      // Rollback on error
      setQuests((prev) =>
        prev.map((q) =>
          q.id === questId ? { ...q, is_completed: !completed } : q
        )
      );
    }
  }

  async function handleBulkComplete(section: "prerequisite" | "main") {
    if (!activeCharacterId) return;
    setQuests((prev) =>
      prev.map((q) =>
        q.chain.section === section ? { ...q, is_completed: true } : q
      )
    );
    try {
      await bulkCompleteSection(supabase, activeCharacterId, dofus.id, section);
    } catch {
      // Reload quests from server on failure
      const fresh = await getQuestsForDofus(supabase, dofus.id, activeCharacterId);
      setQuests(fresh);
    }
  }

  const prerequisites = quests.filter((q) => q.chain.section === "prerequisite");
  const mainQuests = quests.filter((q) => q.chain.section === "main");
  const completedCount = quests.filter((q) => q.is_completed).length;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left column */}
        <div className="flex-1 min-w-0 space-y-6">
          <DofusHeader
            dofus={dofus}
            allDofus={allDofus}
            quests={quests}
            completedCount={completedCount}
          />

          {loading ? (
            <p className="text-gray-400 text-sm animate-pulse">Chargement des quêtes…</p>
          ) : (
            <>
              {prerequisites.length > 0 && (
                <QuestSection
                  title="Prérequis"
                  quests={prerequisites}
                  dofusColor={dofus.color}
                  onToggle={handleToggle}
                  onBulkComplete={() => handleBulkComplete("prerequisite")}
                />
              )}
              {mainQuests.length > 0 && (
                <QuestSection
                  title="Chaîne principale"
                  quests={mainQuests}
                  dofusColor={dofus.color}
                  onToggle={handleToggle}
                  onBulkComplete={() => handleBulkComplete("main")}
                />
              )}
            </>
          )}
        </div>

        {/* Right column — sticky resource panel */}
        <div className="lg:w-80 lg:shrink-0">
          <div className="lg:sticky lg:top-20">
            <ResourcePanel resources={resources} dofusColor={dofus.color} />
          </div>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/dofus/ apps/web/components/dofus/DofusDetailClient.tsx
git commit -m "feat(web): dofus detail page server shell + DofusDetailClient with optimistic quest toggle"
```

---

## Task 10: DofusHeader Component

**Files:**
- Create: `apps/web/components/dofus/DofusHeader.tsx`

- [ ] **Step 1: Create components/dofus/DofusHeader.tsx**

```tsx
import Image from "next/image";
import Link from "next/link";
import type { Dofus, QuestWithChain } from "@dofus-tracker/types";

interface Props {
  dofus: Dofus;
  allDofus: Dofus[];
  quests: QuestWithChain[];
  completedCount: number;
}

export function DofusHeader({ dofus, allDofus, quests, completedCount }: Props) {
  const total = quests.length;
  const remaining = total - completedCount;
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  // Compute which other Dofus share quests with this one
  const sharedDofusIds = new Set(quests.flatMap((q) => q.shared_dofus_ids));
  const sharedDofus = allDofus.filter(
    (d) => sharedDofusIds.has(d.id) && d.id !== dofus.id
  );

  // Count shared quests per Dofus
  const sharedCountPerDofus = new Map<string, number>();
  for (const quest of quests) {
    for (const did of quest.shared_dofus_ids) {
      sharedCountPerDofus.set(did, (sharedCountPerDofus.get(did) ?? 0) + 1);
    }
  }

  return (
    <div className="glass rounded-2xl p-6 space-y-5">
      {/* Egg + title row */}
      <div className="flex items-start gap-5">
        <div className="w-24 h-24 shrink-0 animate-float relative">
          {dofus.image_url ? (
            <Image
              src={dofus.image_url}
              alt={dofus.name}
              fill
              className="object-contain"
              priority
            />
          ) : (
            <div
              className="w-full h-full rounded-full opacity-80"
              style={{
                background: `radial-gradient(circle at 35% 35%, ${dofus.color}dd, ${dofus.color}44)`,
                boxShadow: `0 0 30px ${dofus.color}44`,
              }}
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-extrabold text-white leading-tight">{dofus.name}</h1>
          <p className="text-sm text-gray-400 capitalize mt-0.5">{dofus.type}</p>
          {dofus.description && (
            <p className="text-sm text-gray-300 mt-2 leading-relaxed">{dofus.description}</p>
          )}
          {dofus.recommended_level > 0 && (
            <p className="text-xs text-gray-500 mt-1">Niveau recommandé : {dofus.recommended_level}</p>
          )}
        </div>
      </div>

      {/* Progress stats */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <div className="flex gap-4 text-sm">
            <span className="text-dofus-green font-semibold">{completedCount} complétées</span>
            <span className="text-gray-400">{remaining} restantes</span>
            <span className="text-gray-500">{total} total</span>
          </div>
          <span className="text-xl font-extrabold" style={{ color: dofus.color }}>
            {pct}%
          </span>
        </div>
        <div className="progress-bar-track">
          <div
            className="progress-bar-fill"
            style={{
              width: `${pct}%`,
              background: `linear-gradient(90deg, ${dofus.color}99, ${dofus.color})`,
            }}
          />
        </div>
      </div>

      {/* Shared quests info */}
      {sharedDofus.length > 0 && (
        <div className="border-t border-white/5 pt-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Quêtes partagées avec
          </h3>
          <div className="flex flex-wrap gap-2">
            {sharedDofus.map((d) => (
              <Link
                key={d.id}
                href={`/dofus/${d.slug}`}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
                style={{
                  background: `${d.color}22`,
                  border: `1px solid ${d.color}44`,
                  color: d.color,
                }}
              >
                <span>{d.name}</span>
                <span className="opacity-60">×{sharedCountPerDofus.get(d.id)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/dofus/DofusHeader.tsx
git commit -m "feat(web): DofusHeader with egg, progress stats, and shared quests info"
```

---

## Task 11: QuestSection + QuestItem

**Files:**
- Create: `apps/web/components/dofus/QuestSection.tsx`
- Create: `apps/web/components/dofus/QuestItem.tsx`
- Test: `apps/web/__tests__/QuestItem.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// apps/web/__tests__/QuestItem.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { QuestWithChain } from "@dofus-tracker/types";

const questBase: QuestWithChain = {
  id: "q1",
  name: "La Quête du Dofus",
  slug: "la-quete-du-dofus",
  dofuspourlesnoobs_url: "https://dofuspourlesnoobs.com/quete-du-dofus",
  created_at: "2024-01-01",
  chain: {
    id: "c1",
    dofus_id: "d1",
    quest_id: "q1",
    section: "main",
    order_index: 1,
    group_id: null,
    quest_types: ["combat_solo"],
    combat_count: 1,
    is_avoidable: false,
  },
  is_completed: false,
  shared_dofus_ids: [],
};

const { QuestItem } = await import("@/components/dofus/QuestItem");

describe("QuestItem", () => {
  it("renders quest name as a link to dofuspourlesnoobs", () => {
    render(
      <QuestItem quest={questBase} dofusColor="#22c55e" onToggle={vi.fn()} />
    );
    const link = screen.getByRole("link", { name: /La Quête du Dofus/i });
    expect(link).toHaveAttribute("href", "https://dofuspourlesnoobs.com/quete-du-dofus");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("calls onToggle with true when unchecked checkbox is clicked", () => {
    const onToggle = vi.fn();
    render(
      <QuestItem quest={questBase} dofusColor="#22c55e" onToggle={onToggle} />
    );
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onToggle).toHaveBeenCalledWith("q1", true);
  });

  it("calls onToggle with false when checked checkbox is clicked", () => {
    const onToggle = vi.fn();
    render(
      <QuestItem
        quest={{ ...questBase, is_completed: true }}
        dofusColor="#22c55e"
        onToggle={onToggle}
      />
    );
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onToggle).toHaveBeenCalledWith("q1", false);
  });

  it("shows cross-dofus badge when shared_dofus_ids is non-empty", () => {
    render(
      <QuestItem
        quest={{ ...questBase, shared_dofus_ids: ["d2", "d3"] }}
        dofusColor="#22c55e"
        onToggle={vi.fn()}
      />
    );
    expect(screen.getByTitle(/requise par 2 autre/i)).toBeInTheDocument();
  });

  it("shows combat_solo badge", () => {
    render(
      <QuestItem quest={questBase} dofusColor="#22c55e" onToggle={vi.fn()} />
    );
    expect(screen.getByText("Combat solo")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd apps/web && pnpm test -- --reporter=verbose __tests__/QuestItem.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Create components/dofus/QuestItem.tsx**

```tsx
"use client";

import type { QuestWithChain, QuestType } from "@dofus-tracker/types";

const BADGE_CONFIG: Record<QuestType, { label: string; color: string }> = {
  combat_solo: { label: "Combat solo", color: "#ef4444" },
  combat_groupe: { label: "Groupe", color: "#f97316" },
  donjon: { label: "Donjon", color: "#a855f7" },
  metier: { label: "Métier", color: "#eab308" },
  boss: { label: "Boss", color: "#dc2626" },
  succes: { label: "Succès", color: "#06b6d4" },
  horaires: { label: "Horaires", color: "#64748b" },
};

interface Props {
  quest: QuestWithChain;
  dofusColor: string;
  onToggle: (questId: string, completed: boolean) => void;
}

export function QuestItem({ quest, dofusColor, onToggle }: Props) {
  const { chain, is_completed, shared_dofus_ids } = quest;

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-xl transition-colors ${
        is_completed ? "opacity-60" : ""
      }`}
      style={{
        background: is_completed
          ? "rgba(255,255,255,0.02)"
          : "rgba(255,255,255,0.04)",
      }}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={is_completed}
        onChange={(e) => onToggle(quest.id, e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#4ade80] rounded"
        aria-label={quest.name}
      />

      {/* Quest info */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quest name link */}
          <a
            href={quest.dofuspourlesnoobs_url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-sm font-medium hover:underline transition-colors ${
              is_completed ? "line-through text-gray-500" : "text-white"
            }`}
          >
            {quest.name}
          </a>

          {/* Cross-dofus badge */}
          {shared_dofus_ids.length > 0 && (
            <span
              title={`Requise par ${shared_dofus_ids.length} autre${shared_dofus_ids.length > 1 ? "s" : ""} Dofus`}
              className="text-xs px-1.5 py-0.5 rounded-md font-medium"
              style={{ background: "#3b82f622", color: "#60a5fa", border: "1px solid #3b82f644" }}
            >
              ×{shared_dofus_ids.length + 1}
            </span>
          )}
        </div>

        {/* Badges row */}
        <div className="flex items-center flex-wrap gap-1.5">
          {chain.quest_types.map((type) => {
            const badge = BADGE_CONFIG[type];
            return (
              <span
                key={type}
                className="text-xs px-2 py-0.5 rounded-md font-medium"
                style={{
                  background: `${badge.color}22`,
                  color: badge.color,
                  border: `1px solid ${badge.color}44`,
                }}
              >
                {badge.label}
                {type === "combat_solo" && chain.combat_count && chain.combat_count > 1
                  ? ` ×${chain.combat_count}`
                  : ""}
              </span>
            );
          })}

          {chain.is_avoidable && (
            <span className="text-xs px-2 py-0.5 rounded-md font-medium text-gray-400 border border-gray-700">
              Évitable
            </span>
          )}
        </div>
      </div>

      {/* Order index */}
      <span className="text-xs text-gray-600 shrink-0 mt-0.5">#{chain.order_index}</span>
    </div>
  );
}
```

- [ ] **Step 4: Create components/dofus/QuestSection.tsx**

```tsx
"use client";

import type { QuestWithChain } from "@dofus-tracker/types";
import { QuestItem } from "./QuestItem";

interface Props {
  title: string;
  quests: QuestWithChain[];
  dofusColor: string;
  onToggle: (questId: string, completed: boolean) => void;
  onBulkComplete: () => void;
}

// Groups consecutive quests with the same group_id into arrays
function groupQuests(quests: QuestWithChain[]): Array<QuestWithChain | QuestWithChain[]> {
  const result: Array<QuestWithChain | QuestWithChain[]> = [];
  const seen = new Map<string, QuestWithChain[]>();

  for (const quest of quests) {
    if (!quest.chain.group_id) {
      result.push(quest);
    } else {
      const existing = seen.get(quest.chain.group_id);
      if (existing) {
        existing.push(quest);
      } else {
        const group: QuestWithChain[] = [quest];
        seen.set(quest.chain.group_id, group);
        result.push(group);
      }
    }
  }
  return result;
}

export function QuestSection({ title, quests, dofusColor, onToggle, onBulkComplete }: Props) {
  const completedCount = quests.filter((q) => q.is_completed).length;
  const grouped = groupQuests(quests);

  return (
    <section className="glass rounded-2xl overflow-hidden">
      {/* Section header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <h2 className="font-bold text-white">{title}</h2>
          <span className="text-sm text-gray-400">
            {completedCount}/{quests.length}
          </span>
        </div>
        <button
          onClick={onBulkComplete}
          className="text-xs btn-secondary px-3 py-1"
          disabled={completedCount === quests.length}
        >
          Tout cocher
        </button>
      </div>

      {/* Quest list */}
      <div className="divide-y divide-white/[0.04] p-2 space-y-0.5">
        {grouped.map((item, idx) => {
          if (Array.isArray(item)) {
            // Group box
            return (
              <div
                key={item[0].chain.group_id ?? idx}
                className="rounded-xl overflow-hidden border"
                style={{ borderColor: "#f9731644", background: "#f9731608" }}
              >
                <div className="px-3 py-1.5 text-xs font-semibold text-orange-400 border-b border-orange-400/20">
                  ⚠ Faire ensemble
                </div>
                {item.map((quest) => (
                  <QuestItem
                    key={quest.id}
                    quest={quest}
                    dofusColor={dofusColor}
                    onToggle={onToggle}
                  />
                ))}
              </div>
            );
          }
          return (
            <QuestItem
              key={item.id}
              quest={item}
              dofusColor={dofusColor}
              onToggle={onToggle}
            />
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Run test — verify it passes**

```bash
cd apps/web && pnpm test -- --reporter=verbose __tests__/QuestItem.test.tsx
```

Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/dofus/QuestItem.tsx apps/web/components/dofus/QuestSection.tsx
git add apps/web/__tests__/QuestItem.test.tsx
git commit -m "feat(web): QuestItem and QuestSection with checkboxes, badges, group boxes"
```

---

## Task 12: ResourcePanel + ResourceMultiplier

**Files:**
- Create: `apps/web/components/dofus/ResourcePanel.tsx`
- Test: `apps/web/__tests__/ResourcePanel.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// apps/web/__tests__/ResourcePanel.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Resource } from "@dofus-tracker/types";

const resources: Resource[] = [
  { id: "r1", name: "Pierre précieuse", icon_emoji: "💎", dofus_id: "d1", quantity_per_character: 10, is_kamas: false },
  { id: "r2", name: "Kamas", icon_emoji: "💰", dofus_id: "d1", quantity_per_character: 50000, is_kamas: true },
];

const { ResourcePanel } = await import("@/components/dofus/ResourcePanel");

describe("ResourcePanel", () => {
  it("renders all resource names and base quantities", () => {
    render(<ResourcePanel resources={resources} dofusColor="#22c55e" />);
    expect(screen.getByText("Pierre précieuse")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("Kamas")).toBeInTheDocument();
    expect(screen.getByText("50 000")).toBeInTheDocument();
  });

  it("multiplies quantities when multiplier is 3", () => {
    render(<ResourcePanel resources={resources} dofusColor="#22c55e" />);
    fireEvent.click(screen.getByText("×3"));
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByText("150 000")).toBeInTheDocument();
  });

  it("renders resource emoji icons", () => {
    render(<ResourcePanel resources={resources} dofusColor="#22c55e" />);
    expect(screen.getByText("💎")).toBeInTheDocument();
    expect(screen.getByText("💰")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd apps/web && pnpm test -- --reporter=verbose __tests__/ResourcePanel.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Create components/dofus/ResourcePanel.tsx**

```tsx
"use client";

import { useState } from "react";
import type { Resource } from "@dofus-tracker/types";

const PRESETS = [1, 2, 3, 4, 5];

interface Props {
  resources: Resource[];
  dofusColor: string;
}

export function ResourcePanel({ resources, dofusColor }: Props) {
  const [multiplier, setMultiplier] = useState(1);

  const formatNumber = (n: number) =>
    n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });

  const kamas = resources.filter((r) => r.is_kamas);
  const items = resources.filter((r) => !r.is_kamas);

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Header */}
      <div
        className="px-5 py-3.5 border-b border-white/5"
        style={{ borderTopColor: `${dofusColor}44`, borderTop: `2px solid ${dofusColor}44` }}
      >
        <h2 className="font-bold text-white">Ressources nécessaires</h2>
      </div>

      {/* Multiplier selector */}
      <div className="px-5 py-3 border-b border-white/5">
        <p className="text-xs text-gray-400 mb-2">Personnages</p>
        <div className="flex gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setMultiplier(p)}
              className={`flex-1 py-1 text-sm font-semibold rounded-lg transition-all ${
                multiplier === p
                  ? "text-black"
                  : "btn-secondary"
              }`}
              style={
                multiplier === p
                  ? { background: `linear-gradient(135deg, ${dofusColor}, ${dofusColor}cc)` }
                  : {}
              }
            >
              ×{p}
            </button>
          ))}
        </div>
      </div>

      {/* Resources list */}
      <div className="divide-y divide-white/[0.04] max-h-[60vh] overflow-y-auto">
        {items.map((resource) => (
          <div key={resource.id} className="flex items-center gap-3 px-5 py-2.5">
            <span className="text-xl w-7 text-center shrink-0">{resource.icon_emoji}</span>
            <span className="text-sm text-white flex-1 min-w-0 truncate">{resource.name}</span>
            <span className="text-sm font-bold shrink-0" style={{ color: dofusColor }}>
              {formatNumber(resource.quantity_per_character * multiplier)}
            </span>
          </div>
        ))}
      </div>

      {/* Kamas total */}
      {kamas.length > 0 && (
        <div className="border-t border-white/5 px-5 py-3 bg-yellow-500/5">
          {kamas.map((k) => (
            <div key={k.id} className="flex items-center gap-3">
              <span className="text-xl w-7 text-center shrink-0">{k.icon_emoji}</span>
              <span className="text-sm text-white flex-1">{k.name}</span>
              <span className="text-sm font-bold text-yellow-400">
                {formatNumber(k.quantity_per_character * multiplier)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="px-5 py-3 border-t border-white/5">
        <p className="text-xs text-gray-500 text-center">
          {items.length} type{items.length > 1 ? "s" : ""} de ressources
          {multiplier > 1 ? ` · ×${multiplier} personnages` : ""}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
cd apps/web && pnpm test -- --reporter=verbose __tests__/ResourcePanel.test.tsx
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/dofus/ResourcePanel.tsx apps/web/__tests__/ResourcePanel.test.tsx
git commit -m "feat(web): ResourcePanel with multiplier presets and kamas display"
```

---

## Task 13: Profile Page — Character Management

**Files:**
- Create: `apps/web/components/profile/CharacterManager.tsx`
- Create: `apps/web/app/profile/page.tsx`
- Test: `apps/web/__tests__/CharacterManager.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// apps/web/__tests__/CharacterManager.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Character } from "@dofus-tracker/types";

const mockCreateCharacter = vi.fn();
const mockDeleteCharacter = vi.fn();

vi.mock("@dofus-tracker/db", () => ({
  createCharacter: mockCreateCharacter,
  deleteCharacter: mockDeleteCharacter,
}));

const mockSetActiveCharacterId = vi.fn();
vi.mock("@/lib/stores/characterStore", () => ({
  useCharacterStore: (selector: (s: { activeCharacterId: string | null; setActiveCharacterId: (id: string | null) => void }) => unknown) =>
    selector({ activeCharacterId: "c1", setActiveCharacterId: mockSetActiveCharacterId }),
}));

vi.mock("@/app/providers", () => ({
  useSupabase: () => ({}),
}));

const initialCharacters: Character[] = [
  { id: "c1", user_id: "u1", name: "Tougli", character_class: "Cra", created_at: "2024-01-01" },
];

const { CharacterManager } = await import("@/components/profile/CharacterManager");

describe("CharacterManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateCharacter.mockResolvedValue({
      id: "c2", user_id: "u1", name: "MonIop", character_class: "Iop", created_at: "2024-01-02",
    });
    mockDeleteCharacter.mockResolvedValue(undefined);
  });

  it("renders existing characters", () => {
    render(<CharacterManager characters={initialCharacters} userId="u1" />);
    expect(screen.getByText("Tougli")).toBeInTheDocument();
    expect(screen.getByText("Cra")).toBeInTheDocument();
  });

  it("adds a new character on form submit", async () => {
    render(<CharacterManager characters={initialCharacters} userId="u1" />);
    await userEvent.type(screen.getByPlaceholderText("Nom du personnage"), "MonIop");
    await userEvent.type(screen.getByPlaceholderText("Classe (ex: Cra, Iop)"), "Iop");
    fireEvent.click(screen.getByRole("button", { name: /Ajouter/i }));
    await waitFor(() =>
      expect(mockCreateCharacter).toHaveBeenCalledWith(
        expect.any(Object),
        "u1",
        "MonIop",
        "Iop"
      )
    );
  });

  it("deletes a character on delete button click", async () => {
    render(<CharacterManager characters={initialCharacters} userId="u1" />);
    fireEvent.click(screen.getByRole("button", { name: /supprimer/i }));
    await waitFor(() =>
      expect(mockDeleteCharacter).toHaveBeenCalledWith(expect.any(Object), "c1")
    );
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd apps/web && pnpm test -- --reporter=verbose __tests__/CharacterManager.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Create components/profile/CharacterManager.tsx**

```tsx
"use client";

import { useState } from "react";
import { useSupabase } from "@/app/providers";
import { useCharacterStore } from "@/lib/stores/characterStore";
import { createCharacter, deleteCharacter } from "@dofus-tracker/db";
import type { Character } from "@dofus-tracker/types";

const CLASSES = [
  "Cra", "Ecaflip", "Eniripsa", "Enutrof", "Feca",
  "Iop", "Masqueraider", "Osamodas", "Pandawa", "Roublard",
  "Sacrieur", "Sadida", "Sram", "Steamer", "Xelor", "Zobal",
  "Eliotrope", "Huppermage", "Ouginak", "Forgelance",
];

interface Props {
  characters: Character[];
  userId: string;
}

export function CharacterManager({ characters: initial, userId }: Props) {
  const supabase = useSupabase();
  const activeCharacterId = useCharacterStore((s) => s.activeCharacterId);
  const setActiveCharacterId = useCharacterStore((s) => s.setActiveCharacterId);

  const [characters, setCharacters] = useState(initial);
  const [name, setName] = useState("");
  const [characterClass, setCharacterClass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !characterClass.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const newChar = await createCharacter(supabase, userId, name.trim(), characterClass.trim());
      setCharacters((prev) => [...prev, newChar]);
      // Auto-select if it's the first character
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

  return (
    <div className="space-y-6">
      {/* Existing characters */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/5">
          <h2 className="font-bold text-white">Mes personnages</h2>
        </div>
        {characters.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-400 text-center">
            Aucun personnage — crée-en un ci-dessous.
          </p>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {characters.map((char) => (
              <div
                key={char.id}
                className={`flex items-center justify-between px-5 py-3 ${
                  char.id === activeCharacterId ? "bg-dofus-green/5" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  {char.id === activeCharacterId && (
                    <span className="w-1.5 h-1.5 rounded-full bg-dofus-green shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-white">{char.name}</p>
                    <p className="text-xs text-gray-400">{char.character_class}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {char.id !== activeCharacterId && (
                    <button
                      onClick={() => setActiveCharacterId(char.id)}
                      className="text-xs btn-secondary px-2.5 py-1"
                    >
                      Activer
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(char.id)}
                    aria-label="supprimer"
                    className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add character form */}
      <div className="glass rounded-2xl p-5">
        <h2 className="font-bold text-white mb-4">Ajouter un personnage</h2>
        <form onSubmit={handleCreate} className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom du personnage"
            required
            className="input"
          />
          <input
            type="text"
            value={characterClass}
            onChange={(e) => setCharacterClass(e.target.value)}
            placeholder="Classe (ex: Cra, Iop)"
            list="classes-list"
            required
            className="input"
          />
          <datalist id="classes-list">
            {CLASSES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? "..." : "Ajouter"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create app/profile/page.tsx**

```tsx
import { createClient } from "@/lib/supabase/server";
import { getCharacters } from "@dofus-tracker/db";
import { CharacterManager } from "@/components/profile/CharacterManager";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const characters = await getCharacters(supabase, user.id);

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-white">
          Mon <span className="text-dofus-green">Profil</span>
        </h1>
        <p className="text-gray-400 mt-1 text-sm">{user.email}</p>
      </header>

      <CharacterManager characters={characters} userId={user.id} />
    </main>
  );
}
```

- [ ] **Step 5: Run test — verify it passes**

```bash
cd apps/web && pnpm test -- --reporter=verbose __tests__/CharacterManager.test.tsx
```

Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/profile/CharacterManager.tsx apps/web/app/profile/page.tsx
git add apps/web/__tests__/CharacterManager.test.tsx
git commit -m "feat(web): profile page with character CRUD and active character selection"
```

---

## Task 14: Full Test Suite + Typecheck

Verify all tests pass and TypeScript is clean before Vercel config.

- [ ] **Step 1: Run all tests**

```bash
cd apps/web && pnpm test
```

Expected: all tests PASS (AuthForm: 5, supabase-clients: 2, CharacterSelector: 4, DofusCard: 5, QuestItem: 5, ResourcePanel: 3, CharacterManager: 3 = 27 total).

- [ ] **Step 2: Run typecheck**

```bash
cd apps/web && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Run dev server and smoke-test manually**

```bash
cp apps/web/.env.local.example apps/web/.env.local
# Edit .env.local with real Supabase anon key
cd apps/web && pnpm dev
```

Manually verify:
- `/auth/login` renders the AuthForm
- Signing in with an existing account redirects to `/`
- Homepage shows the Dofus grid
- Selecting a character loads progress
- `/dofus/emeraude` (or any slug) shows the detail page
- Quest checkboxes update optimistically
- `/profile` shows character manager

- [ ] **Step 4: Commit (if any fixes needed during smoke test)**

```bash
git add -p  # stage only meaningful fixes
git commit -m "fix(web): smoke test fixes"
```

---

## Task 15: Turbo Integration + Vercel Config

**Files:**
- Modify: `turbo.json`
- Create: `apps/web/vercel.json`
- Create: `.gitignore` additions

- [ ] **Step 1: Verify turbo.json has lint task (add if missing)**

Current `turbo.json` already has `build`, `dev`, `test`, `typecheck`. Apps/web scripts match — no change needed.

Verify with:
```bash
cd /repo-root && pnpm turbo run typecheck
```

Expected: both `@dofus-tracker/types`, `@dofus-tracker/db`, and `@dofus-tracker/web` typecheck.

- [ ] **Step 2: Add apps/web to .gitignore (if not already covered)**

Check root `.gitignore` already covers `.next/` and `node_modules/`. If not, add:

```
# Next.js
apps/web/.next/
apps/web/.env.local
```

- [ ] **Step 3: Create apps/web/vercel.json**

```json
{
  "buildCommand": "cd ../.. && pnpm turbo run build --filter=@dofus-tracker/web",
  "installCommand": "cd ../.. && pnpm install",
  "outputDirectory": "apps/web/.next"
}
```

- [ ] **Step 4: Set Vercel environment variables**

In Vercel dashboard, add:
- `NEXT_PUBLIC_SUPABASE_URL` = `https://fmhfivaxlairclolwmby.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `<legacy anon JWT>`
- `NEXT_PUBLIC_APP_URL` = `https://<your-vercel-domain>.vercel.app`

In Supabase Auth dashboard, add Vercel URL to **Allowed Redirect URLs**:
- `https://<your-vercel-domain>.vercel.app/auth/callback`
- `http://localhost:3000/auth/callback`

- [ ] **Step 5: Final commit**

```bash
git add apps/web/vercel.json .gitignore
git commit -m "feat(web): Vercel deployment config for Turborepo monorepo"
```

---

## Self-Review Checklist

**Spec coverage:**

| Spec requirement | Task |
|---|---|
| Next.js 14 App Router on Vercel | Task 1, 15 |
| Supabase Auth (email + OAuth Google/Discord) | Task 5 |
| Session refresh middleware | Task 4 |
| Multi-characters, progression par personnage | Tasks 6, 7, 13 |
| Sélecteur de personnage actif dans la nav | Task 7 |
| Homepage — grille de cards avec progression | Task 8 |
| Images officielles avec animation flottement | Tasks 8, 10 |
| Barre de progression colorée par Dofus | Tasks 8, 10 |
| Page détail — header œuf animé + stats | Task 10 |
| Page détail — quêtes partagées info | Task 10 |
| Section prérequis + chaîne principale | Task 11 |
| Ordre strict `order_index` | Task 11 (QuestSection renders in order) |
| Groupes "faire ensemble" encadré orange | Task 11 (QuestSection groupQuests) |
| Badges colorés par type de quête | Task 11 |
| Liens vers dofuspourlesnoobs.com | Task 11 |
| Tag cross-Dofus badge bleu | Task 11 |
| Cocher/décocher quête (cross-Dofus propagation) | Task 9 (DofusDetailClient) |
| Bouton "Tout cocher" par section | Task 11 (QuestSection) |
| Optimistic UI + rollback | Task 9 (DofusDetailClient) |
| Ressources nécessaires — liste avec quantités | Task 12 |
| Multiplicateur ×1 à ×5 avec présets | Task 12 |
| Glassmorphism design system | Task 2 |
| Animations (float, shimmer, glow) | Task 2 |
| Déploiement Vercel gratuit | Task 15 |
| RLS — utilisateur ne voit que ses données | Handled by Supabase (existing migrations) |

**Known gap:** No `not-found.tsx` page (404) — out of scope for Plan 2, add as polish.

**Type consistency check:**
- `QuestWithChain.chain.section` typed as `QuestSection` = `"prerequisite" | "main"` ✓
- `bulkCompleteSection` takes `QuestSection` — matches DofusDetailClient calls ✓
- `Character.character_class` (not `class`) — used correctly throughout ✓
- `DofusProgress.progress_pct` is `number` after db cast — used as number in components ✓

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-02-plan-2a-web-app.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks

**2. Inline Execution** — execute tasks in this session using executing-plans

**Which approach?**
