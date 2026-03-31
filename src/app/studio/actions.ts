"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearAdminAuthCookie, isAdminAuthenticated, setAdminAuthCookie } from "@/lib/admin-auth";
import { createAiRun } from "@/lib/ai-runs";
import { hasXaiEnv, runArticleAiWorkflow } from "@/lib/editor-ai";
import { getSupabaseAdmin, hasSupabaseAdminEnv } from "@/lib/supabase";
import type { AiIntensity, AiWorkflow, ArticleDraftInput, ArticleLanguage, ArticleStatus } from "@/lib/types";
import { slugify } from "@/lib/utils";

function requireSupabase() {
  if (!hasSupabaseAdminEnv()) {
    throw new Error("Supabase no está configurado todavía. Usa .env.example y ejecuta supabase/schema.sql.");
  }

  return getSupabaseAdmin();
}

async function requireAdmin() {
  const ok = await isAdminAuthenticated();
  if (!ok) {
    redirect("/studio/login");
  }
}

function normalizeExcerpt(rawExcerpt: string, body: string) {
  if (rawExcerpt.trim()) return rawExcerpt.trim();
  return body.replace(/[#>*_`-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 240);
}

function readDraftFromFormData(formData: FormData): ArticleDraftInput {
  const title = String(formData.get("title") ?? "").trim();
  const providedSlug = String(formData.get("slug") ?? "").trim();
  const body_md = String(formData.get("body_md") ?? "").trim();
  const excerpt = normalizeExcerpt(String(formData.get("excerpt") ?? ""), body_md);

  return {
    id: String(formData.get("id") ?? "").trim() || null,
    slug: slugify(providedSlug || title || "untitled-draft"),
    title,
    subtitle: String(formData.get("subtitle") ?? "").trim() || null,
    excerpt,
    body_md,
    language: (String(formData.get("language") ?? "es") as ArticleLanguage) || "es",
    status: (String(formData.get("status") ?? "draft") as ArticleStatus) || "draft",
    cover_image_url: String(formData.get("cover_image_url") ?? "").trim() || null,
    tags: String(formData.get("tags") ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    featured: formData.get("featured") === "on",
    published_at: String(formData.get("published_at") ?? "").trim() || null,
    seo_title: String(formData.get("seo_title") ?? "").trim() || null,
    seo_description: String(formData.get("seo_description") ?? "").trim() || null,
    voice_notes: String(formData.get("voice_notes") ?? "").trim() || null,
  };
}

function ensureDraftCanBeSaved(draft: ArticleDraftInput) {
  if (!draft.title || !draft.slug || !draft.excerpt || !draft.body_md) {
    throw new Error("Título, slug, extracto y cuerpo son obligatorios.");
  }
}

function ensureDraftCanRunAi(draft: ArticleDraftInput) {
  if (!draft.body_md || draft.body_md.length < 60) {
    throw new Error("Pega un borrador con algo de sustancia antes de pedir feedback a la IA.");
  }
}

function buildStudioHref(params: {
  article?: string | null;
  saved?: string | null;
  run?: string | null;
  apply?: string | null;
  error?: string | null;
}) {
  const search = new URLSearchParams();

  if (params.article) search.set("article", params.article);
  if (params.saved) search.set("saved", params.saved);
  if (params.run) search.set("run", params.run);
  if (params.apply) search.set("apply", params.apply);
  if (params.error) search.set("error", params.error);

  const query = search.toString();
  return query ? `/studio?${query}` : "/studio";
}

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");

  if (!process.env.BLOG_ADMIN_PASSWORD) {
    throw new Error("Falta BLOG_ADMIN_PASSWORD en el entorno.");
  }

  if (password !== process.env.BLOG_ADMIN_PASSWORD) {
    redirect("/studio/login?error=1");
  }

  await setAdminAuthCookie();
  redirect("/studio");
}

export async function logoutAction() {
  await clearAdminAuthCookie();
  redirect("/");
}

export async function upsertArticleAction(formData: FormData) {
  await requireAdmin();
  const supabase = requireSupabase();
  const draft = readDraftFromFormData(formData);
  ensureDraftCanBeSaved(draft);

  const payload = {
    id: draft.id ?? undefined,
    slug: draft.slug,
    title: draft.title,
    subtitle: draft.subtitle,
    excerpt: draft.excerpt,
    body_md: draft.body_md,
    language: draft.language,
    status: draft.status,
    cover_image_url: draft.cover_image_url,
    tags: draft.tags,
    featured: draft.featured,
    published_at: draft.status === "published" ? draft.published_at || new Date().toISOString() : null,
    seo_title: draft.seo_title,
    seo_description: draft.seo_description,
  };

  const { error } = await supabase.from("articles").upsert(payload, { onConflict: "slug" });
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/articulos");
  revalidatePath(`/articulos/${draft.slug}`);
  revalidatePath("/studio");
  redirect(buildStudioHref({ article: draft.slug, saved: "article" }));
}

async function runAiAction(workflow: AiWorkflow, formData: FormData) {
  await requireAdmin();

  const draft = readDraftFromFormData(formData);
  const intensity = (String(formData.get("ai_intensity") ?? "default") as AiIntensity) || "default";

  if (!hasSupabaseAdminEnv()) {
    redirect(buildStudioHref({ article: draft.id ? draft.slug : null, error: "supabase-missing" }));
  }

  if (!hasXaiEnv()) {
    redirect(buildStudioHref({ article: draft.id ? draft.slug : null, error: "xai-missing" }));
  }

  ensureDraftCanRunAi(draft);

  let runId: string;
  try {
    const result = await runArticleAiWorkflow({ workflow, intensity, draft });
    runId = await createAiRun({
      articleId: draft.id,
      workflow,
      intensity,
      modelName: result.model_name,
      sourcePayload: draft,
      outputPayload: result.output,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ai-failed";
    const normalized = message.includes("borrador")
      ? "draft-too-thin"
      : message.includes("Supabase")
        ? "supabase-missing"
        : "ai-failed";

    redirect(buildStudioHref({ article: draft.id ? draft.slug : null, error: normalized }));
  }

  revalidatePath("/studio");
  redirect(buildStudioHref({ article: draft.id ? draft.slug : null, run: runId, saved: workflow }));
}

export async function runFeedbackAction(formData: FormData) {
  return runAiAction("feedback", formData);
}

export async function runSteelmanAction(formData: FormData) {
  return runAiAction("steelman", formData);
}

export async function runEditorialAction(formData: FormData) {
  return runAiAction("editorial", formData);
}

export async function createIdeaAction(formData: FormData) {
  await requireAdmin();
  const supabase = requireSupabase();

  const title = String(formData.get("title") ?? "").trim();
  const angle = String(formData.get("angle") ?? "").trim();
  const why_now = String(formData.get("why_now") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "seed");
  const source_article_slug = String(formData.get("source_article_slug") ?? "").trim() || null;

  if (!title || !angle || !why_now) {
    throw new Error("Título, ángulo y por qué ahora son obligatorios.");
  }

  const { error } = await supabase.from("idea_bank").insert({
    title,
    angle,
    why_now,
    notes,
    status,
    source_article_slug,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/studio");
  redirect("/studio?saved=idea");
}
