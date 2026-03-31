export type ArticleLanguage = "es" | "en";
export type ArticleStatus = "draft" | "published";
export type IdeaStatus = "seed" | "exploring" | "drafting" | "published" | "paused";

export interface Article {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string;
  body_md: string;
  language: ArticleLanguage;
  status: ArticleStatus;
  cover_image_url: string | null;
  tags: string[];
  featured: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  seo_title: string | null;
  seo_description: string | null;
}

export interface Idea {
  id: string;
  title: string;
  angle: string;
  why_now: string;
  status: IdeaStatus;
  notes: string | null;
  source_article_slug: string | null;
  created_at: string;
  updated_at: string;
}
