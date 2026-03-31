import Link from "next/link";
import type { Article } from "@/lib/types";
import { calculateReadingTime, formatDate } from "@/lib/utils";

export function ArticleCard({ article }: { article: Article }) {
  return (
    <article className="glass-panel group rounded-[2rem] p-6 transition duration-500 hover:-translate-y-1 hover:border-violet-300/20 hover:shadow-[0_30px_90px_rgba(91,33,182,0.22)] sm:p-7">
      <div className="mb-5 flex flex-wrap gap-2">
        <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-cyan-100">
          {article.language === "es" ? "Español" : "English"}
        </span>
        {article.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-300">
            #{tag}
          </span>
        ))}
      </div>

      <Link href={`/articulos/${article.slug}`} className="block space-y-4">
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight text-white transition group-hover:text-violet-100 sm:text-[2rem]">
            {article.title}
          </h2>
          {article.subtitle ? <p className="text-sm uppercase tracking-[0.2em] text-slate-400">{article.subtitle}</p> : null}
        </div>
        <p className="max-w-2xl text-base leading-8 text-slate-300">{article.excerpt}</p>
      </Link>

      <div className="mt-8 flex items-center justify-between gap-4 border-t border-white/8 pt-5 text-sm text-slate-400">
        <span>{formatDate(article.published_at ?? article.created_at)}</span>
        <span>{calculateReadingTime(article.body_md)} min de lectura</span>
      </div>
    </article>
  );
}
