import { cache } from "react";
import { getSupabaseAdmin, hasSupabaseAdminEnv } from "@/lib/supabase";
import type { ArticleAiRun, ArticleDraftInput, ArticleAiOutput, AiIntensity, AiWorkflow } from "@/lib/types";

export const getAiRunById = cache(async (id: string): Promise<ArticleAiRun | null> => {
  if (!id || !hasSupabaseAdminEnv()) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("article_ai_runs").select("*").eq("id", id).maybeSingle();

  if (error) throw new Error(error.message);
  return (data as ArticleAiRun | null) ?? null;
});

export const getRecentAiRuns = cache(async (articleId?: string | null, limit = 8): Promise<ArticleAiRun[]> => {
  if (!hasSupabaseAdminEnv()) {
    return [];
  }

  const supabase = getSupabaseAdmin();
  let query = supabase.from("article_ai_runs").select("*").order("created_at", { ascending: false }).limit(limit);

  if (articleId) {
    query = query.eq("article_id", articleId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data satisfies ArticleAiRun[];
});

export async function createAiRun(params: {
  articleId: string | null;
  workflow: AiWorkflow;
  intensity: AiIntensity;
  modelName: string;
  sourcePayload: ArticleDraftInput;
  outputPayload: ArticleAiOutput;
}) {
  if (!hasSupabaseAdminEnv()) {
    throw new Error("Supabase admin no está configurado.");
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("article_ai_runs")
    .insert({
      article_id: params.articleId,
      workflow: params.workflow,
      intensity: params.intensity,
      model_name: params.modelName,
      source_payload: params.sourcePayload,
      output_payload: params.outputPayload,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id as string;
}
