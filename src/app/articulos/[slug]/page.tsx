import type { Metadata } from "next";
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
    <div className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
      <article className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-slate-950/20 backdrop-blur sm:p-12">
        <header className="mb-10 space-y-5 border-b border-white/10 pb-8">
          <div className="flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <span key={tag} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                #{tag}
              </span>
            ))}
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">{article.title}</h1>
          {article.subtitle ? <p className="text-lg leading-8 text-slate-300">{article.subtitle}</p> : null}
          <div className="flex flex-wrap gap-4 text-sm text-slate-400">
            <span>{formatDate(article.published_at ?? article.created_at)}</span>
            <span>{calculateReadingTime(article.body_md)} min de lectura</span>
            <span>{article.language === "es" ? "Español" : "English"}</span>
          </div>
        </header>

        <Markdown source={article.body_md} />
      </article>
    </div>
  );
}
