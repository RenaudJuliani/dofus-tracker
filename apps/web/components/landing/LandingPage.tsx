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
            <Link href="/auth/login" className="btn-primary text-sm px-5 py-2">
              Se connecter
            </Link>
          </div>
        </nav>
      )}

      {/* Hero */}
      <section className="px-8 pt-20 pb-16">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
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
              <strong className="text-white/75">Dofus Primordial</strong> et Secondaire. Web et
              mobile, synchronisés.
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

          <div className="flex justify-center">
            <div className="relative w-full max-w-lg aspect-[16/10] rounded-2xl overflow-hidden border border-white/10 shadow-[0_24px_64px_rgba(0,0,0,0.5)]">
              <Image
                src="/images/landing/dofus-bar.jpg"
                alt="Univers Dofus"
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#22252f]/40 via-transparent to-[#22252f]/40 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#22252f]/55 pointer-events-none" />
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
                <div className="absolute left-0 top-0 w-0.5 h-full bg-gradient-to-b from-dofus-green to-transparent opacity-60" />
                <div className="shrink-0 w-13 h-13 flex items-center justify-center bg-white/5 border border-white/8 rounded-xl">
                  <Image src={f.icon} alt={f.alt} width={36} height={36} className="object-contain" />
                </div>
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
      <div className="px-8 pb-8 pt-10">
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
      <div className="px-8 pb-18 mb-10">
        <div className="max-w-7xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden border border-dofus-green/15 min-h-[320px] flex items-center justify-center">
            <Image
              src="/images/landing/dofus-ombres.jpg"
              alt=""
              fill
              className="object-cover brightness-[0.30] saturate-[0.85]"
            />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(74,222,128,0.07)_0%,transparent_55%)]" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#22252f]/45 via-transparent to-[#22252f]/65" />
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
      <footer className="border-t border-white/6 px-8 py-8">
        <div className="max-w-7xl mx-auto flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-white/25">
              Dofus <span className="text-dofus-green/45">Tracker</span>
            </span>
            <span className="text-xs text-white/18">Fan-made · Non affilié à Ankama</span>
          </div>
          <p className="text-xs text-white/18 leading-relaxed">
            Certaines illustrations et données sont la propriété d&apos;{" "}
            <span className="text-white/30">Ankama Games</span>. Données issues de{" "}
            <span className="text-white/30">DofusDB</span> et du spreadsheet communautaire de{" "}
            <span className="text-white/30">Tougli</span>.
          </p>
        </div>
      </footer>
    </div>
  );
}
