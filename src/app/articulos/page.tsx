import { ArticleCard } from "@/components/article-card";
import { SectionHeading } from "@/components/section-heading";
import { getPublishedArticles } from "@/lib/articles";

export const metadata = {
  title: "Artículos",
};

export default async function ArticlesPage() {
  const articles = await getPublishedArticles();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16 sm:py-20">
      <SectionHeading
        eyebrow="Biblioteca"
        title="Todos los artículos"
        description="Piezas publicadas, bilingües si hace falta, pero siempre con la misma idea: dejar pensamiento mejor estructurado que como nació."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </div>
  );
}
