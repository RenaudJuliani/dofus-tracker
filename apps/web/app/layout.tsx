import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Dofus Tracker",
  description: "Suivi de progression pour les Dofus",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={inter.variable}>
      <body>
        <Providers>
          {/* Navbar will be added in Task 7 */}
          <div className="min-h-screen">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
