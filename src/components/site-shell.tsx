import Link from "next/link";
import { siteConfig } from "@/lib/site-config";

const nav = [
  { href: "/", label: "Inicio" },
  { href: "/articulos", label: "Artículos" },
];

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1f2937_0%,#111827_28%,#020617_100%)] text-slate-100">
      <header className="border-b border-white/10 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="max-w-sm text-sm leading-6 text-slate-200">
            <span className="block text-base font-semibold tracking-tight text-white">{siteConfig.name}</span>
            <span className="text-slate-400">Ideas por encima del personaje.</span>
          </Link>

          <nav className="flex items-center gap-5 text-sm text-slate-300">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="transition hover:text-white">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-white/10 bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-8 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>{siteConfig.description}</p>
          <p>Hecho para preservar pensamiento, no para perseguir aplausos.</p>
        </div>
      </footer>
    </div>
  );
}
