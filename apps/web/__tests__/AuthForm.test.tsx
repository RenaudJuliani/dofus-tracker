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
    fireEvent.click(screen.getByText(/Pas de compte/i));
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
