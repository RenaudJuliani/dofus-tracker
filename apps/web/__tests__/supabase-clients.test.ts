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
    vi.resetModules();
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
