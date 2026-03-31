import Link from "next/link";
import { siteConfig } from "@/lib/site-config";

const nav = [
  { href: "/", label: "Inicio" },
  { href: "/articulos", label: "Archivo" },
];

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="ambient-orb left-[-6rem] top-20 h-56 w-56 bg-violet-500/20" />
        <div className="ambient-orb right-[-4rem] top-[22rem] h-72 w-72 bg-cyan-400/15 [animation-delay:-3s]" />
        <div className="ambient-orb bottom-[-3rem] left-1/3 h-64 w-64 bg-rose-500/10 [animation-delay:-6s]" />
        <div className="depth-ring depth-ring--pulse left-1/2 top-32 h-[34rem] w-[34rem] -translate-x-1/2 opacity-40" />
        <div className="depth-ring right-[8%] top-[24rem] h-64 w-64 opacity-30" />
      </div>

      <header className="sticky top-0 z-30 border-b border-white/8 bg-black/20 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="max-w-sm text-sm leading-6 text-slate-200 transition hover:text-white">
            <span className="block text-lg font-semibold tracking-[0.18em] text-white/95 uppercase">{siteConfig.name}</span>
            <span className="text-xs uppercase tracking-[0.28em] text-slate-400">Ideas por encima del personaje</span>
          </Link>

          <nav className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1 text-sm text-slate-300 backdrop-blur-xl">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="relative z-10">{children}</main>

      <footer className="relative z-10 border-t border-white/8 bg-black/20 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-10 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>{siteConfig.description}</p>
          <p className="text-slate-500">Hecho para ideas que deberían sobrevivir a su propio autor.</p>
        </div>
      </footer>
    </div>
  );
}
