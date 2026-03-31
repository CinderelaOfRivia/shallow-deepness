import Link from "next/link";
import type { Article } from "@/lib/types";
import { calculateReadingTime, formatDate } from "@/lib/utils";

export function ArticleCard({ article }: { article: Article }) {
  return (
    <article className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/20 backdrop-blur">
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
          {article.language === "es" ? "Español" : "English"}
        </span>
        {article.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
            #{tag}
          </span>
        ))}
      </div>

      <Link href={`/articulos/${article.slug}`} className="group block space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight text-white transition group-hover:text-cyan-200">
          {article.title}
        </h2>
        {article.subtitle ? <p className="text-sm text-slate-400">{article.subtitle}</p> : null}
        <p className="text-base leading-7 text-slate-300">{article.excerpt}</p>
      </Link>

      <div className="mt-6 flex items-center justify-between text-sm text-slate-400">
        <span>{formatDate(article.published_at ?? article.created_at)}</span>
        <span>{calculateReadingTime(article.body_md)} min de lectura</span>
      </div>
    </article>
  );
}
