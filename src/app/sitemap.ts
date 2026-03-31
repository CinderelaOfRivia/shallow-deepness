import type { MetadataRoute } from "next";
import { getPublishedArticles } from "@/lib/articles";
import { siteConfig } from "@/lib/site-config";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await getPublishedArticles();

  return [
    {
      url: siteConfig.url,
      lastModified: new Date(),
    },
    {
      url: `${siteConfig.url}/articulos`,
      lastModified: new Date(),
    },
    ...articles.map((article) => ({
      url: `${siteConfig.url}/articulos/${article.slug}`,
      lastModified: new Date(article.updated_at),
    })),
  ];
}
