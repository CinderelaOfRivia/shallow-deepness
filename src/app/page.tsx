import Link from "next/link";
import { ArticleCard } from "@/components/article-card";
import { SectionHeading } from "@/components/section-heading";
import { getIdeas, getPublishedArticles } from "@/lib/articles";

export default async function HomePage() {
  const articles = await getPublishedArticles();
  const ideas = await getIdeas();
  const [featured, ...rest] = articles;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-20 px-6 py-16 sm:py-20">
      <section className="grid gap-10 rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-slate-950/20 backdrop-blur lg:grid-cols-[1.4fr_0.9fr] lg:p-12">
        <div className="space-y-6">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-300">Shallow Deepness</p>
          <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-6xl">
            Un journal anónimo para publicar ideas que merecen estructura, no biografía.
          </h1>
          <p className="max-w-3xl text-lg leading-8 text-slate-300 sm:text-xl">
            Aquí viven ensayos, intuiciones y argumentos todavía en pelea con sí mismos. La identidad del autor importa menos que la calidad de la idea cuando por fin logra sostenerse sola.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/articulos" className="rounded-full bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">
              Leer artículos
            </Link>
            <Link href="/articulos" className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
              Ver archivo
            </Link>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-cyan-400/20 bg-slate-950/70 p-6">
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Principio</p>
          <div className="mt-4 space-y-4 text-sm leading-7 text-slate-300">
            <p>La meta no es visibilidad. Es dejar pensamiento legible antes de que el ruido o la prisa lo deformen.</p>
            <p>Por eso el sitio gira alrededor de piezas largas, argumentos honestos y un banco de ideas todavía verdes.</p>
            <p>Cuando Supabase no está conectado, el sistema usa contenido local de ejemplo para no fingir que todo está listo. La honestidad operativa sigue siendo mejor que el teatro.</p>
          </div>
        </div>
      </section>

      {featured ? (
        <section className="space-y-8">
          <SectionHeading
            eyebrow="Destacado"
            title={featured.title}
            description={featured.excerpt}
          />
          <ArticleCard article={featured} />
        </section>
      ) : null}

      <section className="space-y-8">
        <SectionHeading
          eyebrow="Recientes"
          title="Pensamientos ya publicados"
          description="Ensayos y artículos listos para vivir en la web sin depender del nombre del autor para sostenerse."
        />
        <div className="grid gap-6 lg:grid-cols-2">
          {(rest.length ? rest : articles).map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      </section>

      <section className="grid gap-6 rounded-[2rem] border border-white/10 bg-white/5 p-8 lg:grid-cols-[0.8fr_1.2fr]">
        <SectionHeading
          eyebrow="Banco de ideas"
          title="Temas que merecen madurar"
          description="No todo merece publicarse hoy. Algunas ideas todavía necesitan quedarse un rato en el fuego bajo."
        />
        <div className="grid gap-4">
          {ideas.map((idea) => (
            <article key={idea.id} className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
              <div className="mb-3 flex items-center justify-between gap-4">
                <h3 className="text-lg font-semibold text-white">{idea.title}</h3>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
                  {idea.status}
                </span>
              </div>
              <p className="text-sm leading-7 text-slate-300">{idea.angle}</p>
              <p className="mt-3 text-sm leading-7 text-cyan-100/85">{idea.why_now}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
