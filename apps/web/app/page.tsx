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
