import Link from "next/link";
import { redirect } from "next/navigation";
import { applyRunAction, askEditorAction, logoutAction, restoreVersionAction, runEditorialAction, runFeedbackAction, runSteelmanAction, upsertArticleAction } from "@/app/studio/actions";
import { getAiRunById, getRecentAiRuns } from "@/lib/ai-runs";
import { getAllArticles } from "@/lib/articles";
import { getDraftVersionById, getDraftVersions, getEditorMessages } from "@/lib/editor-session";
import { hasXaiEnv, resolveXaiModel } from "@/lib/editor-ai";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { hasSupabaseAdminEnv } from "@/lib/supabase";
import type { Article, ArticleAiRun, ArticleDraftInput, ArticleDraftVersion, ArticleEditorMessage } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { StudioActionBar } from "@/components/studio-action-bar";

export const metadata = {
  title: "Studio",
};

function TextArea({
  label,
  name,
  defaultValue,
  rows = 6,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm text-slate-300">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue ?? undefined}
        rows={rows}
        placeholder={placeholder}
        className="w-full rounded-3xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none placeholder:text-slate-500"
      />
    </label>
  );
}

function StudioNotice({ kind, children }: { kind: "success" | "warning" | "info"; children: React.ReactNode }) {
  const styles = {
    success: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
    warning: "border-amber-400/20 bg-amber-400/10 text-amber-100",
    info: "border-cyan-400/20 bg-cyan-400/10 text-cyan-100",
  } as const;

  return <div className={`rounded-2xl border p-4 text-sm leading-7 ${styles[kind]}`}>{children}</div>;
}

function emptyDraft(): ArticleDraftInput {
  return {
    id: null,
    slug: "",
    title: "",
    subtitle: null,
    excerpt: "",
    body_md: "",
    language: "es",
    status: "draft",
    cover_image_url: null,
    tags: [],
    featured: false,
    published_at: null,
    seo_title: null,
    seo_description: null,
    voice_notes: null,
  };
}

function articleToDraft(article: Article): ArticleDraftInput {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    subtitle: article.subtitle,
    excerpt: article.excerpt,
    body_md: article.body_md,
    language: article.language,
    status: article.status,
    cover_image_url: article.cover_image_url,
    tags: article.tags,
    featured: article.featured,
    published_at: article.published_at,
    seo_title: article.seo_title,
    seo_description: article.seo_description,
    voice_notes: null,
  };
}

function mergeDraftWithSuggestion(base: ArticleDraftInput, run: ArticleAiRun | null, applySuggestion: boolean) {
  if (!run) return base;
  const draft = { ...base, ...run.source_payload };
  if (!applySuggestion || !run.output_payload.suggested_article) return draft;

  return {
    ...draft,
    ...run.output_payload.suggested_article,
    title: run.output_payload.suggested_article.title ?? draft.title,
    subtitle: run.output_payload.suggested_article.subtitle ?? draft.subtitle,
    excerpt: run.output_payload.suggested_article.excerpt ?? draft.excerpt,
    body_md: run.output_payload.suggested_article.body_md ?? draft.body_md,
    seo_title: run.output_payload.suggested_article.seo_title ?? draft.seo_title,
    seo_description: run.output_payload.suggested_article.seo_description ?? draft.seo_description,
  };
}

function buildStudioHref(params: { article?: string | null; version?: string | null; run?: string | null; apply?: string | null; message?: string | null }) {
  const search = new URLSearchParams();
  if (params.article) search.set("article", params.article);
  if (params.version) search.set("version", params.version);
  if (params.run) search.set("run", params.run);
  if (params.apply) search.set("apply", params.apply);
  if (params.message) search.set("message", params.message);
  return `/studio${search.toString() ? `?${search.toString()}` : ""}`;
}

function ErrorNotice({ code }: { code?: string }) {
  if (!code) return null;

  const messages: Record<string, string> = {
    "xai-missing": "Falta XAI_API_KEY en producción. Sin esa llave, el laboratorio editorial no puede correr.",
    "supabase-missing": "Falta configuración admin de Supabase. El studio necesita persistencia real para guardar artículos y corridas IA.",
    "draft-too-thin": "El borrador está demasiado vacío o corto. Pega algo con más sustancia antes de pedir feedback a la IA.",
    "ai-failed": "La corrida con xAI falló. Revisa la API key, el modelo configurado y vuelve a intentar.",
  };

  const message = messages[code];
  if (!message) return null;

  return <StudioNotice kind="warning">{message}</StudioNotice>;
}

function HiddenDraftFields({
  draft,
  selectedRunId,
  includeEditable = true,
}: {
  draft: ArticleDraftInput;
  selectedRunId?: string | null;
  includeEditable?: boolean;
}) {
  return (
    <>
      <input type="hidden" name="id" defaultValue={draft.id ?? undefined} />
      <input type="hidden" name="slug" defaultValue={draft.slug || undefined} />
      <input type="hidden" name="subtitle" defaultValue={draft.subtitle ?? undefined} />
      <input type="hidden" name="excerpt" defaultValue={draft.excerpt || undefined} />
      <input type="hidden" name="language" defaultValue={draft.language} />
      <input type="hidden" name="cover_image_url" defaultValue={draft.cover_image_url ?? undefined} />
      <input type="hidden" name="tags" defaultValue={draft.tags.join(", ") || undefined} />
      <input type="hidden" name="featured" defaultValue={draft.featured ? "on" : ""} />
      <input type="hidden" name="published_at" defaultValue={draft.published_at ?? undefined} />
      <input type="hidden" name="seo_title" defaultValue={draft.seo_title ?? undefined} />
      <input type="hidden" name="seo_description" defaultValue={draft.seo_description ?? undefined} />
      <input type="hidden" name="title" defaultValue={draft.title || undefined} />
      {includeEditable ? <input type="hidden" name="body_md" defaultValue={draft.body_md || undefined} /> : null}
      {includeEditable ? <input type="hidden" name="voice_notes" defaultValue={draft.voice_notes ?? undefined} /> : null}
      {includeEditable ? <input type="hidden" name="status" defaultValue={draft.status} /> : null}
      <input type="hidden" name="selected_run_id" defaultValue={selectedRunId ?? undefined} />
    </>
  );
}

function AnalysisCard({ title, items, tone = "neutral" }: { title: string; items: string[]; tone?: "neutral" | "danger" | "accent" }) {
  const tones = {
    neutral: "border-white/10 bg-black/20",
    danger: "border-rose-300/15 bg-rose-300/5",
    accent: "border-cyan-300/15 bg-cyan-300/5",
  } as const;

  if (items.length === 0) return null;

  return (
    <div className={`rounded-[1.4rem] border p-4 ${tones[tone]}`}>
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{title}</p>
      <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-200">
        {items.map((item) => (
          <li key={item} className="list-inside list-disc">{item}</li>
        ))}
      </ul>
    </div>
  );
}

function SuggestedDiff({ draft, run }: { draft: ArticleDraftInput; run: ArticleAiRun | null }) {
  const suggestion = run?.output_payload.suggested_article;
  if (!suggestion) return null;

  const rows = [
    {
      label: "Título",
      current: draft.title || "(inferido al guardar)",
      next: suggestion.title ?? draft.title ?? "(sin cambio)",
    },
    {
      label: "Extracto",
      current: draft.excerpt || "(inferido al guardar)",
      next: suggestion.excerpt ?? draft.excerpt ?? "(sin cambio)",
    },
    {
      label: "Cuerpo",
      current: draft.body_md.slice(0, 700),
      next: (suggestion.body_md ?? draft.body_md).slice(0, 700),
    },
  ].filter((row) => row.current !== row.next);

  if (rows.length === 0) return null;

  return (
    <div className="rounded-[1.6rem] border border-white/10 bg-black/20 p-5">
      <div className="space-y-2">
        <p className="section-eyebrow">Cambios propuestos</p>
        <h3 className="text-xl font-semibold text-white">Antes vs propuesta</h3>
      </div>
      <div className="mt-5 space-y-4">
        {rows.map((row) => (
          <div key={row.label} className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Actual · {row.label}</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300">{row.current}</p>
            </div>
            <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/5 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-200/80">Propuesta · {row.label}</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-cyan-50">{row.next}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ApplyRunPanel({ draft, run }: { draft: ArticleDraftInput; run: ArticleAiRun | null }) {
  if (!run?.output_payload.suggested_article) return null;

  return (
    <div className="rounded-[1.6rem] border border-cyan-300/15 bg-cyan-300/5 p-5 text-sm leading-7 text-cyan-50">
      <div className="space-y-2">
        <p className="section-eyebrow">Aplicar propuesta</p>
        <h3 className="text-xl font-semibold text-white">Control fino antes de tocar el draft</h3>
      </div>

      <form action={applyRunAction} className="mt-5 space-y-4">
        <HiddenDraftFields draft={draft} selectedRunId={run.id} />

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-200">
            <input type="checkbox" name="apply_title" defaultChecked className="size-4" />
            Aplicar título y subtítulo
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-200">
            <input type="checkbox" name="apply_excerpt" defaultChecked className="size-4" />
            Aplicar extracto
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-200">
            <input type="checkbox" name="apply_body" defaultChecked className="size-4" />
            Aplicar cuerpo principal
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-200">
            <input type="checkbox" name="apply_seo" defaultChecked className="size-4" />
            Aplicar SEO/meta
          </label>
        </div>

        <TextArea
          label="Instrucción extra antes de aplicar (opcional)"
          name="apply_instruction"
          rows={4}
          placeholder="Ej: aplica el feedback pero conserva este párrafo casi intacto / hazlo más directo / quita el tono conspiratorial aquí."
        />

        <button className="rounded-full bg-cyan-300 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200">
          Aplicar al draft y crear versión
        </button>
      </form>
    </div>
  );
}

function AiRunDetails({ selectedRun, selectedArticleSlug, draft }: { selectedRun: ArticleAiRun | null; selectedArticleSlug?: string | null; draft: ArticleDraftInput }) {
  if (!selectedRun) {
    return (
      <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm leading-7 text-slate-400">
        Corre feedback, steelman o editorial sobre el draft actual. Luego podrás comparar propuesta, aplicarla con control fino o preguntarle a Grok cosas más quirúrgicas.
      </div>
    );
  }

  const plainHref = buildStudioHref({ article: selectedArticleSlug, run: selectedRun.id });

  return (
    <div className="space-y-5">
      <div className="rounded-[1.6rem] border border-white/10 bg-black/25 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-violet-200/80">{selectedRun.workflow}</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">{selectedRun.output_payload.headline}</h3>
          </div>
          <div className="text-right text-xs uppercase tracking-[0.18em] text-slate-400">
            <p>{selectedRun.intensity}</p>
            <p className="mt-1">{selectedRun.model_name}</p>
            <p className="mt-1">{formatDate(selectedRun.created_at)}</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-7 text-slate-300">{selectedRun.output_payload.summary}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href={plainHref} className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">
            Refrescar vista de esta corrida
          </Link>
        </div>
      </div>

      <SuggestedDiff draft={draft} run={selectedRun} />
      <ApplyRunPanel draft={draft} run={selectedRun} />

      <div className="grid gap-4 xl:grid-cols-2">
        <AnalysisCard title="Preservar" items={selectedRun.output_payload.preserve} />
        <AnalysisCard title="Fortalezas" items={selectedRun.output_payload.strengths} tone="accent" />
        <AnalysisCard title="Tensiones" items={selectedRun.output_payload.tensions} />
        <AnalysisCard title="Siguiente paso" items={selectedRun.output_payload.action_items} tone="accent" />
      </div>

      {selectedRun.output_payload.counterpoints.length > 0 ? (
        <details className="rounded-[1.4rem] border border-rose-300/15 bg-rose-300/5 p-4" open>
          <summary className="cursor-pointer list-none text-xs uppercase tracking-[0.24em] text-rose-200/80">
            Presión crítica
          </summary>
          <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-200">
            {selectedRun.output_payload.counterpoints.map((item) => (
              <li key={item} className="list-inside list-disc">{item}</li>
            ))}
          </ul>
          {selectedRun.output_payload.confidence_note ? (
            <p className="mt-4 text-sm italic text-rose-100/80">{selectedRun.output_payload.confidence_note}</p>
          ) : null}
        </details>
      ) : null}
    </div>
  );
}

function DraftPreview({ draft }: { draft: ArticleDraftInput }) {
  const heading = draft.title || "Título inferido al guardar/publicar";
  const paragraphs = draft.body_md
    .split(/\n\s*\n/)
    .map((part) => part.replace(/^#+\s*/g, "").trim())
    .filter(Boolean);

  return (
    <div className="glass-panel rounded-[2rem] p-8">
      <div className="space-y-2">
        <p className="section-eyebrow">Vista actual del draft</p>
        <h2 className="text-2xl font-semibold text-white">Estructura previa a publicar</h2>
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-black/20 p-6 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Preview vivo</p>
            <h3 className="mt-3 text-3xl font-semibold tracking-tight text-white lg:text-4xl">{heading}</h3>
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
            {draft.status}
          </span>
        </div>

        {draft.voice_notes ? <p className="mt-4 text-sm italic leading-7 text-violet-100/75">Notas de voz: {draft.voice_notes}</p> : null}

        <div className="mt-6 max-h-[72vh] space-y-5 overflow-y-auto pr-2 text-base leading-8 text-slate-300 lg:text-[1.05rem]">
          {paragraphs.length > 0 ? (
            paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
          ) : (
            <p className="text-slate-500">Pega un draft y aquí verás la estructura viva del texto mientras lo afilas.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function VersionTimeline({ versions, articleSlug, currentVersionId }: { versions: ArticleDraftVersion[]; articleSlug?: string | null; currentVersionId?: string | null }) {
  if (versions.length === 0) {
    return <p className="text-sm leading-7 text-slate-400">Todavía no hay versiones guardadas del draft.</p>;
  }

  return (
    <div className="space-y-3">
      {versions.map((version) => (
        <div key={version.id} className={`rounded-2xl border p-4 ${currentVersionId === version.id ? "border-cyan-300/30 bg-cyan-300/10" : "border-white/10 bg-slate-950/70"}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-white">{version.label}</p>
              <p className="mt-1 text-sm text-slate-400">{formatDate(version.created_at)}</p>
            </div>
            {currentVersionId === version.id ? (
              <span className="rounded-full border border-cyan-300/30 px-3 py-1 text-xs uppercase tracking-[0.2em] text-cyan-100">activa</span>
            ) : null}
          </div>
          <form action={restoreVersionAction} className="mt-4">
            <input type="hidden" name="version_id" value={version.id} />
            <input type="hidden" name="article" value={articleSlug ?? ""} />
            <button className="text-sm font-semibold text-cyan-200 transition hover:text-cyan-100">Usar esta versión</button>
          </form>
        </div>
      ))}
    </div>
  );
}

function EditorChatPanel({ draft, selectedRun, messages }: { draft: ArticleDraftInput; selectedRun: ArticleAiRun | null; messages: ArticleEditorMessage[] }) {
  return (
    <div className="glass-panel rounded-[2rem] p-8">
      <div className="space-y-2">
        <p className="section-eyebrow">Hablar con Grok</p>
        <h2 className="text-2xl font-semibold text-white">Edición conversacional</h2>
        <p className="text-sm leading-7 text-slate-400">
          Pregunta cosas puntuales: “haz este párrafo más directo”, “esto suena demasiado panfletario”, “¿será mejor metáfora o frase corta?”.
        </p>
      </div>

      <div className="mt-6 max-h-[34rem] space-y-4 overflow-y-auto pr-2">
        {messages.length > 0 ? (
          messages.map((message) => (
            <div key={message.id} className={`rounded-[1.4rem] border p-4 ${message.role === "assistant" ? "border-cyan-300/15 bg-cyan-300/5" : "border-white/10 bg-black/20"}`}>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{message.role === "assistant" ? "Grok" : "Tú"}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-200">{message.content}</p>
              {message.role === "assistant" && message.draft_snapshot ? (
                <p className="mt-3 text-xs leading-6 text-cyan-100/80">Si esta respuesta propuso un cambio concreto, ya quedó guardado como versión en la línea de tiempo.</p>
              ) : null}
            </div>
          ))
        ) : (
          <p className="text-sm leading-7 text-slate-400">Todavía no hay conversación editorial para este draft.</p>
        )}
      </div>

      <form action={askEditorAction} className="mt-6 space-y-4">
        <HiddenDraftFields draft={draft} selectedRunId={selectedRun?.id} />
        <TextArea
          label="Pregunta puntual para Grok"
          name="editor_question"
          rows={4}
          placeholder="Ej: este segundo párrafo está demasiado abstracto, ¿cómo lo harías más directo sin perder el tono?"
        />
        <button className="rounded-full border border-violet-300/20 bg-violet-300/10 px-4 py-2 text-sm font-semibold text-violet-100 transition hover:bg-violet-300/20">
          Preguntarle a Grok
        </button>
      </form>
    </div>
  );
}

function DraftControls({ activeDraft, selectedRun }: { activeDraft: ArticleDraftInput; selectedRun: ArticleAiRun | null }) {
  return (
    <details className="glass-panel rounded-[2rem] p-6" open={false}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
        <div>
          <p className="section-eyebrow">Primer draft</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Input mínimo</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-400">
            Pega el draft, define límites de voz si hace falta y dispara corridas. Este bloque debería esconderse cuando ya estés comparando texto y feedback.
          </p>
        </div>
        <span className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white">Mostrar / ocultar input</span>
      </summary>

      <div className="mt-6 border-t border-white/10 pt-6">
        <form action={upsertArticleAction} className="space-y-5">
          <HiddenDraftFields draft={activeDraft} selectedRunId={selectedRun?.id} includeEditable={false} />

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <TextArea label="Borrador" name="body_md" defaultValue={activeDraft.body_md} rows={10} placeholder="Pega aquí el primer draft crudo. Sin ceremonias." />

            <div className="space-y-5">
              <TextArea
                label="Notas de voz / límites (opcional)"
                name="voice_notes"
                defaultValue={activeDraft.voice_notes}
                rows={6}
                placeholder="Ej: no me limpies demasiado, conserva mis tangentes si sostienen el argumento, no suenes corporate."
              />

              <label className="block space-y-2">
                <span className="text-sm text-slate-300">Estado</span>
                <select name="status" defaultValue={activeDraft.status} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </label>
            </div>
          </div>

          <StudioActionBar
            feedbackAction={runFeedbackAction}
            steelmanAction={runSteelmanAction}
            editorialAction={runEditorialAction}
            saveAction={upsertArticleAction}
            defaultModel={resolveXaiModel("default")}
            heavyModel={resolveXaiModel("heavy")}
          />
        </form>
      </div>
    </details>
  );
}

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{ article?: string; version?: string; run?: string; apply?: string; message?: string; saved?: string; error?: string; detail?: string }>;
}) {
  const isAdmin = await isAdminAuthenticated();
  if (!isAdmin) redirect("/studio/login");

  const params = await searchParams;
  const [articles, selectedRun, selectedVersion] = await Promise.all([
    getAllArticles(),
    params.run ? getAiRunById(params.run) : Promise.resolve(null),
    params.version ? getDraftVersionById(params.version) : Promise.resolve(null),
  ]);

  const selectedArticle = articles.find((article) => article.slug === params.article) ?? null;
  const latestDraft = articles.find((article) => article.status === "draft") ?? null;
  const baseDraft = selectedVersion?.snapshot ?? (selectedArticle ? articleToDraft(selectedArticle) : latestDraft ? articleToDraft(latestDraft) : emptyDraft());
  const activeDraft = mergeDraftWithSuggestion(baseDraft, selectedRun, params.apply === "1");

  const [versions, messages, runs] = await Promise.all([
    getDraftVersions(activeDraft.id, 12),
    getEditorMessages(activeDraft.id, 20),
    getRecentAiRuns(activeDraft.id, 10),
  ]);

  const supabaseReady = hasSupabaseAdminEnv();
  const xaiReady = hasXaiEnv();

  return (
    <div className="mx-auto flex max-w-[96vw] flex-col gap-8 px-4 py-10 sm:px-6 sm:py-16 2xl:max-w-[1800px]">
      <section className="glass-panel flex flex-wrap items-start justify-between gap-4 rounded-[2rem] p-8">
        <div className="space-y-3">
          <p className="section-eyebrow">Panel editorial</p>
          <h1 className="text-4xl font-semibold tracking-tight text-white">Studio de Shallow Deepness</h1>
          <p className="max-w-4xl text-sm leading-7 text-slate-300">
            Este dashboard ahora funciona como pipeline real: draft vivo, corridas IA, control fino para aplicar cambios, versiones para volver atrás y conversación editorial con Grok para correcciones quirúrgicas.
          </p>
        </div>
        <form action={logoutAction}>
          <button className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
            Cerrar sesión
          </button>
        </form>
      </section>

      <DraftControls activeDraft={activeDraft} selectedRun={selectedRun} />

      {!supabaseReady ? <StudioNotice kind="warning">Supabase admin no está configurado todavía.</StudioNotice> : null}
      {!xaiReady ? <StudioNotice kind="warning">XAI_API_KEY todavía no existe en el entorno. El lab editorial sigue apagado hasta que pongas la llave.</StudioNotice> : null}

      {params.saved === "article" ? <StudioNotice kind="success">Artículo guardado. Metadata, slug y snapshot quedaron resueltos.</StudioNotice> : null}
      {params.saved === "feedback" ? <StudioNotice kind="success">Feedback corrido y guardado.</StudioNotice> : null}
      {params.saved === "steelman" ? <StudioNotice kind="success">Steelman corrido y guardado.</StudioNotice> : null}
      {params.saved === "editorial" ? <StudioNotice kind="success">Editorial corrido y guardado.</StudioNotice> : null}
      {params.saved === "applied" ? <StudioNotice kind="success">La propuesta se aplicó al draft y quedó versionada para poder volver atrás.</StudioNotice> : null}
      {params.saved === "restored" ? <StudioNotice kind="success">Restauraste una versión previa del draft.</StudioNotice> : null}
      {params.saved === "chat" ? <StudioNotice kind="success">Grok respondió. Si propuso una reescritura puntual, quedó guardada como versión.</StudioNotice> : null}

      <ErrorNotice code={params.error} />
      {params.detail ? <StudioNotice kind="warning">Detalle técnico: {params.detail}</StudioNotice> : null}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.3fr)_minmax(460px,0.95fr)] 2xl:grid-cols-[minmax(0,1.38fr)_minmax(500px,0.92fr)]">
        <div className="space-y-8">
          <DraftPreview draft={activeDraft} />
          <EditorChatPanel draft={activeDraft} selectedRun={selectedRun} messages={messages} />
        </div>

        <div className="space-y-8">
          <div className="glass-panel rounded-[2rem] p-8 xl:sticky xl:top-24">
            <div className="space-y-2">
              <p className="section-eyebrow">Corrida seleccionada</p>
              <h2 className="text-2xl font-semibold text-white">Resultado editorial</h2>
            </div>
            <div className="mt-6 max-h-[72vh] overflow-y-auto pr-2">
              <AiRunDetails selectedRun={selectedRun} selectedArticleSlug={selectedArticle?.slug ?? activeDraft.slug} draft={activeDraft} />
            </div>
          </div>

          <div className="glass-panel rounded-[2rem] p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="section-eyebrow">Pases guardados</p>
                <h2 className="text-2xl font-semibold text-white">Feedback / steelman / editorial</h2>
              </div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{runs.length} total</p>
            </div>
            <div className="mt-6 space-y-3">
              {runs.length > 0 ? (
                runs.map((run) => (
                  <Link
                    key={run.id}
                    href={buildStudioHref({ article: selectedArticle?.slug ?? activeDraft.slug, version: params.version ?? null, run: run.id })}
                    className={`block rounded-[1.4rem] border p-4 transition ${selectedRun?.id === run.id ? "border-cyan-300/30 bg-cyan-300/10" : "border-white/10 bg-black/20 hover:border-violet-300/20 hover:bg-white/[0.04]"}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{run.workflow}</p>
                        <p className="mt-2 font-medium text-white">{run.output_payload.headline}</p>
                        <p className="mt-2 line-clamp-2 text-sm leading-7 text-slate-400">{run.output_payload.summary}</p>
                      </div>
                      <div className="text-right text-xs uppercase tracking-[0.18em] text-slate-500">
                        <p>{run.intensity}</p>
                        <p className="mt-1">{formatDate(run.created_at)}</p>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-sm leading-7 text-slate-400">Todavía no hay corridas IA guardadas para este draft.</p>
              )}
            </div>
          </div>

          <div className="glass-panel rounded-[2rem] p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="section-eyebrow">Versiones del draft</p>
                <h2 className="text-2xl font-semibold text-white">Línea de tiempo</h2>
              </div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{versions.length} total</p>
            </div>
            <div className="mt-6">
              <VersionTimeline versions={versions} articleSlug={selectedArticle?.slug ?? activeDraft.slug} currentVersionId={params.version ?? null} />
            </div>
          </div>

          <details className="glass-panel rounded-[2rem] p-8">
            <summary className="cursor-pointer list-none">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="section-eyebrow">Archivo editable</p>
                  <h2 className="text-2xl font-semibold text-white">Artículos existentes</h2>
                </div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{articles.length} total</p>
              </div>
            </summary>
            <div className="mt-6 space-y-3">
              {articles.map((article) => (
                <div key={article.id} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-white">{article.title}</p>
                      <p className="text-sm text-slate-400">/{article.slug}</p>
                    </div>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
                      {article.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">Actualizado {formatDate(article.updated_at)}</p>
                  <div className="mt-4 flex flex-wrap gap-3 text-sm">
                    <Link href={`/studio?article=${article.slug}`} className="text-cyan-200 transition hover:text-cyan-100">
                      Editar
                    </Link>
                    {article.status === "published" ? (
                      <Link href={`/articulos/${article.slug}`} className="text-slate-300 transition hover:text-white">
                        Ver publicado
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
