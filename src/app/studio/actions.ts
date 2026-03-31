"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearAdminAuthCookie, isAdminAuthenticated, setAdminAuthCookie } from "@/lib/admin-auth";
import { createAiRun, getAiRunById } from "@/lib/ai-runs";
import { createDraftVersion, createEditorMessage } from "@/lib/editor-session";
import { askEditorQuestion, hasXaiEnv, inferArticleMetadata, reviseDraftWithInstruction, runArticleAiWorkflow } from "@/lib/editor-ai";
import { getSupabaseAdmin, hasSupabaseAdminEnv } from "@/lib/supabase";
import type { AiIntensity, AiWorkflow, ArticleAiRun, ArticleDraftInput, ArticleStatus } from "@/lib/types";
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

  return {
    id: String(formData.get("id") ?? "").trim() || null,
    slug: providedSlug,
    title,
    subtitle: String(formData.get("subtitle") ?? "").trim() || null,
    excerpt: normalizeExcerpt(String(formData.get("excerpt") ?? ""), body_md),
    body_md,
    language: (String(formData.get("language") ?? "es") as "es" | "en") || "es",
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

async function enrichDraftMetadata(draft: ArticleDraftInput, intensity: AiIntensity = "default") {
  const inferred = await inferArticleMetadata(draft, intensity);
  const finalTitle = draft.title.trim() || inferred.title;

  return {
    ...draft,
    title: finalTitle,
    slug: draft.slug.trim() || slugify(finalTitle),
    subtitle: draft.subtitle ?? inferred.subtitle ?? null,
    excerpt: draft.excerpt.trim() || inferred.excerpt,
    language: draft.language || inferred.language,
    tags: draft.tags.length > 0 ? draft.tags : inferred.tags,
    seo_title: draft.seo_title ?? inferred.seo_title ?? finalTitle,
    seo_description: draft.seo_description ?? inferred.seo_description ?? inferred.excerpt,
  } satisfies ArticleDraftInput;
}

async function ensureDraftRecord(draft: ArticleDraftInput): Promise<ArticleDraftInput> {
  const supabase = requireSupabase();
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

  const { data, error } = await supabase.from("articles").upsert(payload, { onConflict: "slug" }).select("id, slug").single();
  if (error) throw new Error(error.message);

  return {
    ...draft,
    id: data.id as string,
    slug: data.slug as string,
  } satisfies ArticleDraftInput;
}

function ensureDraftCanBeSaved(draft: ArticleDraftInput) {
  if (!draft.title || !draft.slug || !draft.excerpt || !draft.body_md) {
    throw new Error("Falta suficiente texto para guardar el artículo correctamente.");
  }
}

function ensureDraftCanRunAi(draft: ArticleDraftInput) {
  if (!draft.body_md || draft.body_md.length < 60) {
    throw new Error("Pega un borrador con algo de sustancia antes de pedir feedback a la IA.");
  }
}

function buildStudioHref(params: {
  article?: string | null;
  version?: string | null;
  run?: string | null;
  apply?: string | null;
  message?: string | null;
  saved?: string | null;
  error?: string | null;
  detail?: string | null;
}) {
  const search = new URLSearchParams();
  if (params.article) search.set("article", params.article);
  if (params.version) search.set("version", params.version);
  if (params.run) search.set("run", params.run);
  if (params.apply) search.set("apply", params.apply);
  if (params.message) search.set("message", params.message);
  if (params.saved) search.set("saved", params.saved);
  if (params.error) search.set("error", params.error);
  if (params.detail) search.set("detail", params.detail.slice(0, 180));
  const query = search.toString();
  return query ? `/studio?${query}` : "/studio";
}

function summarizeRunContext(run: ArticleAiRun | null) {
  if (!run) return null;
  return JSON.stringify(
    {
      workflow: run.workflow,
      summary: run.output_payload.summary,
      preserve: run.output_payload.preserve,
      tensions: run.output_payload.tensions,
      action_items: run.output_payload.action_items,
      counterpoints: run.output_payload.counterpoints,
    },
    null,
    2,
  );
}

function applySuggestedFields(current: ArticleDraftInput, run: ArticleAiRun, selected: { title: boolean; excerpt: boolean; body: boolean; seo: boolean }) {
  const suggestion = run.output_payload.suggested_article;
  if (!suggestion) return current;

  return {
    ...current,
    title: selected.title ? suggestion.title ?? current.title : current.title,
    subtitle: selected.title ? suggestion.subtitle ?? current.subtitle : current.subtitle,
    excerpt: selected.excerpt ? suggestion.excerpt ?? current.excerpt : current.excerpt,
    body_md: selected.body ? suggestion.body_md ?? current.body_md : current.body_md,
    seo_title: selected.seo ? suggestion.seo_title ?? current.seo_title : current.seo_title,
    seo_description: selected.seo ? suggestion.seo_description ?? current.seo_description : current.seo_description,
  } satisfies ArticleDraftInput;
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
  const draft = await ensureDraftRecord(await enrichDraftMetadata(readDraftFromFormData(formData), "default"));
  ensureDraftCanBeSaved(draft);

  const versionId = await createDraftVersion({
    articleId: draft.id,
    label: draft.status === "published" ? "published snapshot" : "saved draft",
    snapshot: draft,
  });

  revalidatePath("/");
  revalidatePath("/articulos");
  revalidatePath(`/articulos/${draft.slug}`);
  revalidatePath("/studio");
  redirect(buildStudioHref({ article: draft.slug, version: versionId, saved: "article" }));
}

async function runAiAction(workflow: AiWorkflow, formData: FormData) {
  await requireAdmin();

  const intensity = (String(formData.get("ai_intensity") ?? "default") as AiIntensity) || "default";
  const selectedRunId = String(formData.get("selected_run_id") ?? "").trim() || null;

  if (!hasSupabaseAdminEnv()) {
    redirect(buildStudioHref({ error: "supabase-missing" }));
  }

  if (!hasXaiEnv()) {
    redirect(buildStudioHref({ error: "xai-missing" }));
  }

  const draft = await ensureDraftRecord(await enrichDraftMetadata(readDraftFromFormData(formData), intensity));
  ensureDraftCanRunAi(draft);

  const priorRun = selectedRunId ? await getAiRunById(selectedRunId) : null;
  const priorContext = summarizeRunContext(priorRun);

  try {
    const result = await runArticleAiWorkflow({ workflow, intensity, draft, priorContext });
    const runId = await createAiRun({
      articleId: draft.id,
      workflow,
      intensity,
      modelName: result.model_name,
      sourcePayload: draft,
      outputPayload: result.output,
    });

    revalidatePath("/studio");
    redirect(buildStudioHref({ article: draft.slug, run: runId, saved: workflow }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "ai-failed";
    const normalized = message.includes("borrador")
      ? "draft-too-thin"
      : message.includes("Supabase")
        ? "supabase-missing"
        : "ai-failed";

    redirect(buildStudioHref({ article: draft.slug, error: normalized, detail: message }));
  }
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

export async function applyRunAction(formData: FormData) {
  await requireAdmin();

  const intensity = (String(formData.get("ai_intensity") ?? "default") as AiIntensity) || "default";
  const runId = String(formData.get("selected_run_id") ?? "").trim();
  const instruction = String(formData.get("apply_instruction") ?? "").trim();

  if (!runId) redirect(buildStudioHref({ error: "ai-failed", detail: "No selected run to apply." }));

  const run = await getAiRunById(runId);
  if (!run) redirect(buildStudioHref({ error: "ai-failed", detail: "Selected run not found." }));

  let draft = await ensureDraftRecord(await enrichDraftMetadata(readDraftFromFormData(formData), intensity));
  draft = applySuggestedFields(draft, run, {
    title: formData.get("apply_title") === "on",
    excerpt: formData.get("apply_excerpt") === "on",
    body: formData.get("apply_body") === "on",
    seo: formData.get("apply_seo") === "on",
  });

  if (instruction) {
    const revision = await reviseDraftWithInstruction({ draft, run, instruction, intensity });
    draft = { ...draft, ...revision };
  }

  draft = await ensureDraftRecord(await enrichDraftMetadata(draft, intensity));
  const versionId = await createDraftVersion({
    articleId: draft.id,
    sourceRunId: run.id,
    label: `applied ${run.workflow}`,
    snapshot: draft,
  });

  revalidatePath("/");
  revalidatePath("/articulos");
  revalidatePath(`/articulos/${draft.slug}`);
  revalidatePath("/studio");
  redirect(buildStudioHref({ article: draft.slug, version: versionId, run: run.id, saved: "applied" }));
}

export async function restoreVersionAction(formData: FormData) {
  await requireAdmin();
  const article = String(formData.get("article") ?? "").trim() || null;
  const versionId = String(formData.get("version_id") ?? "").trim() || null;
  redirect(buildStudioHref({ article, version: versionId, saved: "restored" }));
}

export async function askEditorAction(formData: FormData) {
  await requireAdmin();

  const intensity = (String(formData.get("ai_intensity") ?? "default") as AiIntensity) || "default";
  const selectedRunId = String(formData.get("selected_run_id") ?? "").trim() || null;
  const question = String(formData.get("editor_question") ?? "").trim();

  if (!question) {
    redirect(buildStudioHref({ error: "ai-failed", detail: "Write a question for Grok first." }));
  }

  const draft = await ensureDraftRecord(await enrichDraftMetadata(readDraftFromFormData(formData), intensity));
  const run = selectedRunId ? await getAiRunById(selectedRunId) : null;

  try {
    await createEditorMessage({ articleId: draft.id, sourceRunId: run?.id, role: "user", content: question, draftSnapshot: draft });
    const answer = await askEditorQuestion({ draft, run, question, intensity });
    const revisedDraft = answer.optional_revision ? ({ ...draft, ...answer.optional_revision } satisfies ArticleDraftInput) : null;

    if (revisedDraft) {
      await createDraftVersion({
        articleId: draft.id,
        sourceRunId: run?.id,
        label: "chat revision",
        snapshot: await ensureDraftRecord(await enrichDraftMetadata(revisedDraft, intensity)),
      });
    }

    const messageId = await createEditorMessage({
      articleId: draft.id,
      sourceRunId: run?.id,
      role: "assistant",
      content: answer.answer,
      draftSnapshot: revisedDraft,
    });

    revalidatePath("/studio");
    redirect(buildStudioHref({ article: draft.slug, run: run?.id ?? null, message: messageId, saved: "chat" }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "ai-failed";
    redirect(buildStudioHref({ article: draft.slug, error: "ai-failed", detail: message }));
  }
}
