export type ArticleLanguage = "es" | "en";
export type ArticleStatus = "draft" | "published";
export type AiIntensity = "default" | "heavy";
export type AiWorkflow = "feedback" | "steelman" | "editorial";
export type EditorChatRole = "user" | "assistant";

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

export interface ArticleDraftInput {
  id: string | null;
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
  seo_title: string | null;
  seo_description: string | null;
  voice_notes: string | null;
}

export interface ArticleAiSuggestion {
  title: string;
  subtitle: string | null;
  excerpt: string;
  body_md: string;
  seo_title: string | null;
  seo_description: string | null;
}

export interface ArticleAiOutput {
  headline: string;
  summary: string;
  preserve: string[];
  strengths: string[];
  tensions: string[];
  action_items: string[];
  counterpoints: string[];
  confidence_note: string | null;
  suggested_article: Partial<ArticleAiSuggestion> | null;
}

export interface ArticleAiRun {
  id: string;
  article_id: string | null;
  workflow: AiWorkflow;
  intensity: AiIntensity;
  model_name: string;
  source_payload: ArticleDraftInput;
  output_payload: ArticleAiOutput;
  created_at: string;
}

export interface InferredArticleMetadata {
  title: string;
  subtitle: string | null;
  excerpt: string;
  language: ArticleLanguage;
  tags: string[];
  seo_title: string | null;
  seo_description: string | null;
}

export interface ArticleDraftVersion {
  id: string;
  article_id: string | null;
  source_run_id: string | null;
  label: string;
  snapshot: ArticleDraftInput;
  created_at: string;
}

export interface ArticleEditorMessage {
  id: string;
  article_id: string | null;
  source_run_id: string | null;
  role: EditorChatRole;
  content: string;
  draft_snapshot: ArticleDraftInput | null;
  created_at: string;
}

export interface EditorChatAnswer {
  answer: string;
  suggested_changes: string[];
  optional_revision: Partial<ArticleAiSuggestion> | null;
}
