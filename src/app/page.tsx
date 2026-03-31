import Link from "next/link";
import { ArticleCard } from "@/components/article-card";
import { SectionHeading } from "@/components/section-heading";
import { getIdeas, getPublishedArticles } from "@/lib/articles";

export default async function HomePage() {
  const articles = await getPublishedArticles();
  const ideas = await getIdeas();
  const [featured, ...rest] = articles;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-20 px-6 py-16 sm:py-24">
      <section className="glass-panel grain-overlay relative overflow-hidden rounded-[2.25rem] px-7 py-10 sm:px-10 sm:py-14 lg:px-14 lg:py-16">
        <div className="absolute inset-y-0 right-0 hidden w-[42%] lg:block">
          <div className="absolute right-12 top-12 h-64 w-64 rounded-full border border-white/10 bg-white/[0.02] shadow-[inset_0_0_80px_rgba(255,255,255,0.04)]" />
          <div className="depth-ring depth-ring--pulse absolute right-6 top-6 h-80 w-80 opacity-50" />
          <div className="ambient-orb right-20 top-28 h-36 w-36 bg-violet-400/20" />
          <div className="ambient-orb right-40 top-44 h-24 w-24 bg-cyan-300/20 [animation-delay:-4s]" />
        </div>

        <div className="relative z-10 grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div className="space-y-7">
            <p className="section-eyebrow">Shallow Deepness</p>
            <div className="space-y-5">
              <h1 className="text-glow max-w-4xl text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
                Un archivo para ideas que todavía no deciden si son filosofía, herida o mapa.
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-slate-300 sm:text-xl">
                No biografía. No marca personal. Solo pensamiento en proceso, suficientemente claro para sobrevivir al día siguiente y suficientemente extraño para merecer haber sido escrito.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                href="/articulos"
                className="rounded-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-300 px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_10px_35px_rgba(139,92,246,0.35)] transition hover:scale-[1.02]"
              >
                Entrar al archivo
              </Link>
              <Link
                href="/articulos"
                className="rounded-full border border-white/12 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
              >
                Leer lo último
              </Link>
            </div>
          </div>

          <div className="glass-panel rounded-[1.75rem] p-6 sm:p-7">
            <p className="section-eyebrow">Principio</p>
            <div className="mt-5 space-y-4 text-sm leading-7 text-slate-300 sm:text-base">
              <p>La meta no es verse inteligente. Es dejar una idea lo bastante nítida como para que no se pudra en borrador eterno.</p>
              <p>Por eso el sitio se mueve despacio, respira raro y evita parecer una plantilla corporativa que leyó dos citas de Nietzsche y pidió un rebrand.</p>
              <p>Si Supabase no está conectado, el sistema usa contenido local de ejemplo. Mejor honestidad atmosférica que infraestructura mitómana.</p>
            </div>
          </div>
        </div>
      </section>

      {featured ? (
        <section className="space-y-8">
          <SectionHeading
            eyebrow="Pieza central"
            title={featured.title}
            description={featured.excerpt}
          />
          <ArticleCard article={featured} />
        </section>
      ) : null}

      <section className="space-y-8">
        <SectionHeading
          eyebrow="Archivo"
          title="Pensamientos ya publicados"
          description="Piezas que ya aguantaron el fuego inicial y pueden vivir solas, sin apoyarse en el nombre del autor para parecer importantes."
        />
        {rest.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {rest.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <div className="glass-panel rounded-[1.8rem] px-6 py-7 text-sm leading-7 text-slate-300 sm:px-8">
            Por ahora hay una sola pieza publicada. Lo cual suena pequeño, pero también evita el pecado viejo de inflar archivo con aire. La siguiente debería aparecer cuando merezca existir.
          </div>
        )}
      </section>

      <section className="glass-panel rounded-[2rem] p-8 sm:p-10">
        <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr]">
          <SectionHeading
            eyebrow="Banco de ideas"
            title="Temas que todavía están mutando"
            description="No todo debería publicarse hoy. Algunas ideas necesitan quedarse un rato en el sótano, tomando forma rara antes de pedir luz." 
          />
          <div className="grid gap-4">
            {ideas.map((idea, index) => (
              <article
                key={idea.id}
                className="rounded-[1.6rem] border border-white/8 bg-black/20 p-5 transition hover:border-violet-300/20 hover:bg-white/[0.04]"
              >
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="mb-2 text-[11px] uppercase tracking-[0.32em] text-slate-500">Seed {String(index + 1).padStart(2, "0")}</p>
                    <h3 className="text-xl font-semibold text-white">{idea.title}</h3>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-slate-300">
                    {idea.status}
                  </span>
                </div>
                <p className="text-sm leading-7 text-slate-300">{idea.angle}</p>
                <p className="mt-3 text-sm leading-7 text-violet-100/85">{idea.why_now}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
