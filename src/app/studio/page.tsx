import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction, runEditorialAction, runFeedbackAction, runSteelmanAction, upsertArticleAction } from "@/app/studio/actions";
import { getAiRunById, getRecentAiRuns } from "@/lib/ai-runs";
import { getAllArticles } from "@/lib/articles";
import { hasXaiEnv, resolveXaiModel } from "@/lib/editor-ai";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { hasSupabaseAdminEnv } from "@/lib/supabase";
import type { Article, ArticleAiRun, ArticleDraftInput } from "@/lib/types";
import { formatDate } from "@/lib/utils";

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

function buildStudioHref(params: { article?: string | null; run?: string | null; apply?: string | null }) {
  const search = new URLSearchParams();
  if (params.article) search.set("article", params.article);
  if (params.run) search.set("run", params.run);
  if (params.apply) search.set("apply", params.apply);
  return `/studio${search.toString() ? `?${search.toString()}` : ""}`;
}

function ErrorNotice({ code }: { code?: string }) {
  if (!code) return null;

  const messages: Record<string, string> = {
    "xai-missing": "Falta XAI_API_KEY en producción. Sin esa llave, el laboratorio editorial no puede correr.",
    "supabase-missing": "Falta configuración admin de Supabase. El studio necesita persistencia real para guardar artículos y corridas IA.",
    "draft-too-thin": "El borrador está demasiado vacío o corto. Pega algo con más sustancia antes de pedirle cirugía a la IA.",
    "ai-failed": "La corrida con xAI falló. Revisa la API key, el modelo configurado y vuelve a intentar.",
  };

  const message = messages[code];
  if (!message) return null;

  return <StudioNotice kind="warning">{message}</StudioNotice>;
}

function AiRunDetails({ selectedRun, selectedArticleSlug }: { selectedRun: ArticleAiRun | null; selectedArticleSlug?: string | null }) {
  if (!selectedRun) {
    return (
      <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm leading-7 text-slate-400">
        Corre feedback, steelman o editorial sobre el draft actual. Cada pasada queda guardada y puedes cargar la sugerencia de vuelta al borrador si te sirve.
      </div>
    );
  }

  const suggestionHref = buildStudioHref({ article: selectedArticleSlug, run: selectedRun.id, apply: "1" });
  const plainHref = buildStudioHref({ article: selectedArticleSlug, run: selectedRun.id });

  return (
    <div className="space-y-4">
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
      </div>

      {selectedRun.output_payload.suggested_article ? (
        <div className="rounded-[1.6rem] border border-cyan-300/15 bg-cyan-300/5 p-5 text-sm leading-7 text-cyan-50">
          <p className="text-xs uppercase tracking-[0.26em] text-cyan-200/80">Aplicar propuesta</p>
          <p className="mt-3 text-cyan-50/90">
            Si esta pasada sí entendió el assignment, carga la sugerencia en el borrador. No publica nada. No guarda nada por detrás. Solo te la deja puesta para revisión humana.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href={suggestionHref} className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200">
              Cargar sugerencia
            </Link>
            <Link href={plainHref} className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">
              Ver sin aplicar
            </Link>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {[
          { label: "Preservar", items: selectedRun.output_payload.preserve },
          { label: "Fortalezas", items: selectedRun.output_payload.strengths },
          { label: "Tensiones", items: selectedRun.output_payload.tensions },
          { label: "Siguiente paso", items: selectedRun.output_payload.action_items },
        ].map((section) => (
          <div key={section.label} className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{section.label}</p>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-300">
              {section.items.map((item) => (
                <li key={item} className="list-inside list-disc">{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {selectedRun.output_payload.counterpoints.length > 0 ? (
        <div className="rounded-[1.4rem] border border-rose-300/15 bg-rose-300/5 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-rose-200/80">Presión crítica</p>
          <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-200">
            {selectedRun.output_payload.counterpoints.map((item) => (
              <li key={item} className="list-inside list-disc">{item}</li>
            ))}
          </ul>
          {selectedRun.output_payload.confidence_note ? (
            <p className="mt-4 text-sm italic text-rose-100/80">{selectedRun.output_payload.confidence_note}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{ article?: string; saved?: string; run?: string; apply?: string; error?: string }>;
}) {
  const isAdmin = await isAdminAuthenticated();
  if (!isAdmin) redirect("/studio/login");

  const params = await searchParams;
  const [articles, selectedRun] = await Promise.all([
    getAllArticles(),
    params.run ? getAiRunById(params.run) : Promise.resolve(null),
  ]);

  const selectedArticle = articles.find((article) => article.slug === params.article) ?? null;
  const latestDraft = articles.find((article) => article.status === "draft") ?? null;
  const baseDraft = selectedArticle ? articleToDraft(selectedArticle) : latestDraft ? articleToDraft(latestDraft) : emptyDraft();
  const activeDraft = mergeDraftWithSuggestion(baseDraft, selectedRun, params.apply === "1");
  const recentRuns = await getRecentAiRuns(selectedArticle?.id ?? null, 8);
  const supabaseReady = hasSupabaseAdminEnv();
  const xaiReady = hasXaiEnv();

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-16">
      <section className="glass-panel flex flex-wrap items-start justify-between gap-4 rounded-[2rem] p-8">
        <div className="space-y-3">
          <p className="section-eyebrow">Panel editorial</p>
          <h1 className="text-4xl font-semibold tracking-tight text-white">Studio de Shallow Deepness</h1>
          <p className="max-w-3xl text-sm leading-7 text-slate-300">
            La experiencia ahora es más simple: pega el draft, opcionalmente ajusta el título, agrega límites de voz si hace falta y corre feedback, steelman o editorial. El resto lo extrae el motor y tú decides qué aceptar.
          </p>
        </div>
        <form action={logoutAction}>
          <button className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
            Cerrar sesión
          </button>
        </form>
      </section>

      {!supabaseReady ? <StudioNotice kind="warning">Supabase admin no está configurado todavía.</StudioNotice> : null}
      {!xaiReady ? <StudioNotice kind="warning">XAI_API_KEY todavía no existe en el entorno. El lab editorial sigue apagado hasta que pongas la llave.</StudioNotice> : null}

      {params.saved === "article" ? <StudioNotice kind="success">Artículo guardado. Metadata y slug quedaron resueltos automáticamente.</StudioNotice> : null}
      {params.saved === "feedback" ? <StudioNotice kind="success">Feedback corrido y guardado.</StudioNotice> : null}
      {params.saved === "steelman" ? <StudioNotice kind="success">Steelman corrido y guardado.</StudioNotice> : null}
      {params.saved === "editorial" ? <StudioNotice kind="success">Editorial corrido y guardado.</StudioNotice> : null}

      <ErrorNotice code={params.error} />

      <div className="grid gap-8 xl:grid-cols-[1.12fr_0.88fr]">
        <section className="glass-panel space-y-6 rounded-[2rem] p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="section-eyebrow">Draft-first</p>
              <h2 className="text-2xl font-semibold text-white">Pega texto. Lo demás se infiere.</h2>
              <p className="max-w-2xl text-sm leading-7 text-slate-400">
                Título, excerpt, language, tags, SEO y demás se generan automáticamente al guardar o correr un pase IA. Si ya estás editando un artículo publicado, puedes seguirlo corrigiendo desde aquí sin pelearte con veinte campos irrelevantes.
              </p>
            </div>
            <Link href="/studio" className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">
              Nuevo draft
            </Link>
          </div>

          <form action={upsertArticleAction} className="space-y-5">
            <input type="hidden" name="id" defaultValue={activeDraft.id ?? undefined} />
            <input type="hidden" name="slug" defaultValue={activeDraft.slug || undefined} />
            <input type="hidden" name="subtitle" defaultValue={activeDraft.subtitle ?? undefined} />
            <input type="hidden" name="excerpt" defaultValue={activeDraft.excerpt || undefined} />
            <input type="hidden" name="language" defaultValue={activeDraft.language} />
            <input type="hidden" name="cover_image_url" defaultValue={activeDraft.cover_image_url ?? undefined} />
            <input type="hidden" name="tags" defaultValue={activeDraft.tags.join(", ") || undefined} />
            <input type="hidden" name="featured" defaultValue={activeDraft.featured ? "on" : ""} />
            <input type="hidden" name="published_at" defaultValue={activeDraft.published_at ?? undefined} />
            <input type="hidden" name="seo_title" defaultValue={activeDraft.seo_title ?? undefined} />
            <input type="hidden" name="seo_description" defaultValue={activeDraft.seo_description ?? undefined} />

            <input type="hidden" name="title" defaultValue={activeDraft.title || undefined} />
            <input type="hidden" name="selected_run_id" defaultValue={selectedRun?.id ?? undefined} />

            <TextArea
              label="Borrador"
              name="body_md"
              defaultValue={activeDraft.body_md}
              rows={20}
              placeholder="Pega aquí el primer draft crudo. Sin ceremonias."
            />

            <div className="grid gap-4 md:grid-cols-[0.7fr_0.3fr]">
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

            <div className="rounded-[1.6rem] border border-violet-300/15 bg-violet-300/5 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-violet-200/80">Laboratorio editorial IA</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">Tres cuchillos, dos intensidades</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">
                    Default usa {resolveXaiModel("default")}. Heavy usa {resolveXaiModel("heavy")}. Feedback encuentra fallas, steelman construye el mejor ataque y editorial pule sin destruir la firma mental del texto.
                  </p>
                </div>
                <label className="block space-y-2">
                  <span className="text-sm text-slate-300">Intensidad</span>
                  <select name="ai_intensity" defaultValue="default" className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none">
                    <option value="default">default · {resolveXaiModel("default")}</option>
                    <option value="heavy">heavy · {resolveXaiModel("heavy")}</option>
                  </select>
                </label>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button formAction={runFeedbackAction} className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20">
                  Feedback
                </button>
                <button formAction={runSteelmanAction} className="rounded-full border border-rose-300/20 bg-rose-300/10 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-300/20">
                  Steelman
                </button>
                <button formAction={runEditorialAction} className="rounded-full border border-violet-300/20 bg-violet-300/10 px-4 py-2 text-sm font-semibold text-violet-100 transition hover:bg-violet-300/20">
                  Editorial
                </button>
                <button className="rounded-full bg-cyan-300 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200">
                  Guardar artículo
                </button>
              </div>

              <p className="mt-4 text-xs leading-6 text-slate-500">
                Título, slug, subtítulo, extracto, idioma, tags y SEO se infieren automáticamente del draft. Si tienes una corrida seleccionada a la derecha, el siguiente pase IA puede reutilizar ese contexto en cualquier orden.
              </p>
            </div>
          </form>
        </section>

        <section className="space-y-8">
          <div className="glass-panel rounded-[2rem] p-8">
            <div className="space-y-2">
              <p className="section-eyebrow">Corrida seleccionada</p>
              <h2 className="text-2xl font-semibold text-white">Resultado editorial</h2>
            </div>
            <div className="mt-6">
              <AiRunDetails selectedRun={selectedRun} selectedArticleSlug={selectedArticle?.slug ?? activeDraft.slug} />
            </div>
          </div>

          <div className="glass-panel rounded-[2rem] p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="section-eyebrow">Historial</p>
                <h2 className="text-2xl font-semibold text-white">Últimas corridas IA</h2>
              </div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{recentRuns.length} visibles</p>
            </div>
            <div className="mt-6 space-y-3">
              {recentRuns.length > 0 ? (
                recentRuns.map((run) => (
                  <Link
                    key={run.id}
                    href={buildStudioHref({ article: selectedArticle?.slug ?? activeDraft.slug, run: run.id })}
                    className="block rounded-[1.4rem] border border-white/10 bg-black/20 p-4 transition hover:border-violet-300/20 hover:bg-white/[0.04]"
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
                <p className="text-sm leading-7 text-slate-400">Todavía no hay corridas IA guardadas para este artículo.</p>
              )}
            </div>
          </div>

          <div className="glass-panel rounded-[2rem] p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="section-eyebrow">Archivo editable</p>
                <h2 className="text-2xl font-semibold text-white">Artículos existentes</h2>
              </div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{articles.length} total</p>
            </div>
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
          </div>
        </section>
      </div>
    </div>
  );
}
