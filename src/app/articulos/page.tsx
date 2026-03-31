import { ArticleCard } from "@/components/article-card";
import { SectionHeading } from "@/components/section-heading";
import { getPublishedArticles } from "@/lib/articles";

export const metadata = {
  title: "Artículos",
};

export default async function ArticlesPage() {
  const articles = await getPublishedArticles();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-16 sm:py-24">
      <section className="glass-panel rounded-[2rem] px-7 py-10 sm:px-10 sm:py-12">
        <SectionHeading
          eyebrow="Biblioteca"
          title="Todos los artículos"
          description="Piezas publicadas, bilingües si hace falta, pero siempre con la misma ambición: dejar pensamiento más preciso, más inquietante y más vivo que cuando apareció por primera vez."
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </div>
  );
}
