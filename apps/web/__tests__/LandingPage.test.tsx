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
    expect(screen.getAllByText("29").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1112").length).toBeGreaterThan(0);
  });

  it("les CTAs pointent vers /dofus quand connecté", () => {
    render(<LandingPage isConnected={true} />);
    const links = screen.getAllByRole("link");
    const dofusLinks = links.filter((l) => l.getAttribute("href") === "/dofus");
    expect(dofusLinks.length).toBeGreaterThan(0);
  });
});
