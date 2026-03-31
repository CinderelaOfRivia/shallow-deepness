import { cache } from "react";
import { getSupabaseAdmin, hasSupabaseAdminEnv } from "@/lib/supabase";
import type { ArticleDraftInput, ArticleDraftVersion, ArticleEditorMessage, EditorChatRole } from "@/lib/types";

export const getDraftVersionById = cache(async (id: string): Promise<ArticleDraftVersion | null> => {
  if (!id || !hasSupabaseAdminEnv()) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("article_draft_versions").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ArticleDraftVersion | null) ?? null;
});

export const getDraftVersions = cache(async (articleId?: string | null, limit = 12): Promise<ArticleDraftVersion[]> => {
  if (!hasSupabaseAdminEnv()) return [];

  const supabase = getSupabaseAdmin();
  let query = supabase.from("article_draft_versions").select("*").order("created_at", { ascending: false }).limit(limit);
  if (articleId) query = query.eq("article_id", articleId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data satisfies ArticleDraftVersion[];
});

export async function createDraftVersion(params: {
  articleId: string | null;
  sourceRunId?: string | null;
  label: string;
  snapshot: ArticleDraftInput;
}) {
  if (!hasSupabaseAdminEnv()) throw new Error("Supabase admin no está configurado.");

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("article_draft_versions")
    .insert({
      article_id: params.articleId,
      source_run_id: params.sourceRunId ?? null,
      label: params.label,
      snapshot: params.snapshot,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id as string;
}

export const getEditorMessages = cache(async (articleId?: string | null, limit = 20): Promise<ArticleEditorMessage[]> => {
  if (!hasSupabaseAdminEnv()) return [];

  const supabase = getSupabaseAdmin();
  let query = supabase.from("article_editor_messages").select("*").order("created_at", { ascending: true }).limit(limit);
  if (articleId) query = query.eq("article_id", articleId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data satisfies ArticleEditorMessage[];
});

export async function createEditorMessage(params: {
  articleId: string | null;
  sourceRunId?: string | null;
  role: EditorChatRole;
  content: string;
  draftSnapshot?: ArticleDraftInput | null;
}) {
  if (!hasSupabaseAdminEnv()) throw new Error("Supabase admin no está configurado.");

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("article_editor_messages")
    .insert({
      article_id: params.articleId,
      source_run_id: params.sourceRunId ?? null,
      role: params.role,
      content: params.content,
      draft_snapshot: params.draftSnapshot ?? null,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id as string;
}
