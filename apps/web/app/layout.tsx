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
  verification: {
    google: "zCGkjHC2SRTYZQGyApaKrmTodZPxapYsQnv7VNdrM2U",
  },
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
