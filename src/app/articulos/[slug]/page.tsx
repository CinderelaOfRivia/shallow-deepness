import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { getArticleBySlug, getPublishedArticles } from "@/lib/articles";
import { siteConfig } from "@/lib/site-config";
import { calculateReadingTime, formatDate } from "@/lib/utils";

export async function generateStaticParams() {
  const articles = await getPublishedArticles();
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    return { title: "Artículo no encontrado" };
  }

  const title = article.seo_title ?? article.title;
  const description = article.seo_description ?? article.excerpt;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${siteConfig.url}/articulos/${article.slug}`,
      type: "article",
      publishedTime: article.published_at ?? undefined,
    },
  };
}

export default async function ArticleDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article || article.status !== "published") {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
      <article className="glass-panel grain-overlay rounded-[2.25rem] p-8 sm:p-12 lg:p-14">
        <header className="relative mb-12 overflow-hidden rounded-[1.8rem] border border-white/8 bg-black/20 px-6 py-8 sm:px-8 sm:py-10">
          <div className="ambient-orb -right-10 top-0 h-28 w-28 bg-violet-400/20" />
          <div className="ambient-orb right-20 top-12 h-16 w-16 bg-cyan-300/20 [animation-delay:-2s]" />

          <div className="relative z-10 space-y-5">
            <Link href="/articulos" className="section-eyebrow transition hover:text-white">
              Volver al archivo
            </Link>

            <div className="flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-slate-300">
                  #{tag}
                </span>
              ))}
            </div>

            <h1 className="text-glow max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              {article.title}
            </h1>
            {article.subtitle ? <p className="max-w-3xl text-lg leading-8 text-slate-300">{article.subtitle}</p> : null}
            <div className="flex flex-wrap gap-4 text-sm uppercase tracking-[0.18em] text-slate-400">
              <span>{formatDate(article.published_at ?? article.created_at)}</span>
              <span>{calculateReadingTime(article.body_md)} min de lectura</span>
              <span>{article.language === "es" ? "Español" : "English"}</span>
            </div>
          </div>
        </header>

        <Markdown source={article.body_md} />
      </article>
    </div>
  );
}
