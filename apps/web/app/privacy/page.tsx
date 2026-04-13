import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialité – Dofus Tracker",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12 text-gray-300">
      <h1 className="text-3xl font-bold text-white mb-2">Politique de confidentialité</h1>
      <p className="text-sm text-gray-500 mb-8">Dernière mise à jour : avril 2026</p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-3">1. Données collectées</h2>
        <p className="mb-3">
          Dofus Tracker collecte uniquement les données nécessaires au fonctionnement de l'application :
        </p>
        <ul className="list-disc pl-6 space-y-1 text-gray-400">
          <li>Adresse e-mail et identifiant (via inscription ou connexion OAuth Discord / Google)</li>
          <li>Nom de vos personnages Dofus et classe choisie</li>
          <li>Progression de quêtes et de succès associée à chaque personnage</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-3">2. Utilisation des données</h2>
        <p className="text-gray-400">
          Ces données sont utilisées exclusivement pour afficher et sauvegarder votre progression dans
          l'application. Elles ne sont jamais vendues, partagées avec des tiers ou utilisées à des
          fins publicitaires.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-3">3. Stockage et sécurité</h2>
        <p className="text-gray-400">
          Les données sont stockées sur <strong className="text-gray-200">Supabase</strong> (hébergement
          UE). L'accès est protégé par authentification et les règles de sécurité (Row Level Security)
          garantissent que chaque utilisateur n'accède qu'à ses propres données.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-3">4. Services tiers</h2>
        <ul className="list-disc pl-6 space-y-1 text-gray-400">
          <li><strong className="text-gray-200">Supabase</strong> – base de données et authentification</li>
          <li><strong className="text-gray-200">Discord / Google OAuth</strong> – connexion optionnelle</li>
          <li><strong className="text-gray-200">Expo / EAS</strong> – distribution de l'application mobile</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-3">5. Vos droits</h2>
        <p className="text-gray-400">
          Vous pouvez à tout moment demander la suppression de votre compte et de toutes vos données
          en nous contactant à l'adresse ci-dessous. La suppression est effective sous 30 jours.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-3">6. Contact</h2>
        <p className="text-gray-400">
          Pour toute question relative à vos données personnelles :{" "}
          <a href="mailto:renaud1.juliani@epitech.eu" className="text-green-400 hover:underline">
            renaud1.juliani@epitech.eu
          </a>
        </p>
      </section>
    </div>
  );
}
