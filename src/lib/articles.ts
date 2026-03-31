import { cache } from "react";
import { fallbackArticles, fallbackIdeas } from "@/lib/fallback-content";
import { getSupabaseAdmin, getSupabasePublic, hasSupabaseAdminEnv, hasSupabasePublicEnv } from "@/lib/supabase";
import type { Article, Idea } from "@/lib/types";

function sortArticles(items: Article[]) {
  return [...items].sort((a, b) => {
    const aDate = a.published_at ?? a.created_at;
    const bDate = b.published_at ?? b.created_at;
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });
}

export const getPublishedArticles = cache(async (): Promise<Article[]> => {
  if (!hasSupabasePublicEnv()) {
    return sortArticles(fallbackArticles.filter((article) => article.status === "published"));
  }

  const supabase = getSupabasePublic();
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("status", "published")
    .order("featured", { ascending: false })
    .order("published_at", { ascending: false, nullsFirst: false });

  if (error) throw new Error(error.message);
  return data satisfies Article[];
});

export const getAllArticles = cache(async (): Promise<Article[]> => {
  if (!hasSupabaseAdminEnv()) {
    return sortArticles(fallbackArticles);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("articles").select("*").order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data satisfies Article[];
});

export const getArticleBySlug = cache(async (slug: string): Promise<Article | null> => {
  if (!hasSupabasePublicEnv()) {
    return fallbackArticles.find((article) => article.slug === slug) ?? null;
  }

  const supabase = getSupabasePublic();
  const { data, error } = await supabase.from("articles").select("*").eq("slug", slug).maybeSingle();

  if (error) throw new Error(error.message);
  return (data as Article | null) ?? null;
});

export const getIdeas = cache(async (): Promise<Idea[]> => {
  if (!hasSupabasePublicEnv()) {
    return fallbackIdeas;
  }

  const supabase = getSupabasePublic();
  const { data, error } = await supabase.from("idea_bank").select("*").order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data satisfies Idea[];
});

export const getAllIdeas = cache(async (): Promise<Idea[]> => {
  if (!hasSupabaseAdminEnv()) {
    return fallbackIdeas;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("idea_bank").select("*").order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data satisfies Idea[];
});
