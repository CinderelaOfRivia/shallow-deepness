import Link from "next/link";
import { redirect } from "next/navigation";
import { createIdeaAction, logoutAction, upsertArticleAction } from "@/app/studio/actions";
import { getAllArticles, getAllIdeas } from "@/lib/articles";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { hasSupabaseAdminEnv } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

export const metadata = {
  title: "Studio",
};

function Input({
  label,
  name,
  defaultValue,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm text-slate-300">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue ?? undefined}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none placeholder:text-slate-500"
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
  required,
  rows = 6,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm text-slate-300">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue ?? undefined}
        required={required}
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

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{ article?: string; saved?: string }>;
}) {
  const isAdmin = await isAdminAuthenticated();
  if (!isAdmin) redirect("/studio/login");

  const params = await searchParams;
  const [articles, ideas] = await Promise.all([getAllArticles(), getAllIdeas()]);
  const latestDraft = articles.find((article) => article.status === "draft") ?? null;
  const selectedArticle =
    articles.find((article) => article.slug === params.article) ?? latestDraft ?? articles[0] ?? null;
  const supabaseReady = hasSupabaseAdminEnv();

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-16">
      <section className="flex flex-wrap items-start justify-between gap-4 rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Panel editorial</p>
          <h1 className="text-4xl font-semibold tracking-tight text-white">Studio de Shallow Deepness</h1>
          <p className="max-w-3xl text-sm leading-7 text-slate-300">
            Un panel mínimo para escribir, revisar y publicar. Nada de inflar el ego con un CMS barroco cuando un formulario honesto resuelve el trabajo.
          </p>
        </div>
        <form action={logoutAction}>
          <button className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
            Cerrar sesión
          </button>
        </form>
      </section>

      {!supabaseReady ? (
        <StudioNotice kind="warning">
          Supabase no está configurado todavía. El sitio público funciona con contenido local de ejemplo, pero el studio no puede guardar hasta que llenes `.env.local` y ejecutes `supabase/schema.sql`.
        </StudioNotice>
      ) : null}

      {params.saved === "article" ? <StudioNotice kind="success">Artículo guardado. La web ya fue revalidada.</StudioNotice> : null}
      {params.saved === "idea" ? <StudioNotice kind="success">Idea guardada. El banco de ideas ya fue revalidado.</StudioNotice> : null}

      <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6 rounded-[2rem] border border-white/10 bg-white/5 p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Artículo</p>
              <h2 className="text-2xl font-semibold text-white">Crear o actualizar</h2>
              <p className="max-w-2xl text-sm leading-7 text-slate-400">
                Puedes crear uno nuevo desde cero o cargar uno existente para editarlo sin pelearte con el último draft por accidente.
              </p>
            </div>
            <Link
              href="/studio"
              className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Nuevo artículo
            </Link>
          </div>

          <form action={upsertArticleAction} className="space-y-4">
            <input type="hidden" name="id" defaultValue={selectedArticle?.id ?? undefined} />
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Título" name="title" defaultValue={selectedArticle?.title} required />
              <Input label="Slug" name="slug" defaultValue={selectedArticle?.slug} placeholder="se genera si lo dejas vacío" />
            </div>
            <Input label="Subtítulo" name="subtitle" defaultValue={selectedArticle?.subtitle} />
            <TextArea label="Extracto" name="excerpt" defaultValue={selectedArticle?.excerpt} required rows={3} />
            <TextArea label="Cuerpo en markdown" name="body_md" defaultValue={selectedArticle?.body_md} required rows={16} />
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Tags separados por coma"
                name="tags"
                defaultValue={selectedArticle?.tags.join(", ")}
                placeholder="philosophy, culture, ethics"
              />
              <Input label="Cover image URL" name="cover_image_url" defaultValue={selectedArticle?.cover_image_url} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="SEO title" name="seo_title" defaultValue={selectedArticle?.seo_title} />
              <Input label="SEO description" name="seo_description" defaultValue={selectedArticle?.seo_description} />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="block space-y-2">
                <span className="text-sm text-slate-300">Idioma</span>
                <select
                  name="language"
                  defaultValue={selectedArticle?.language ?? "es"}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none"
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                </select>
              </label>
              <label className="block space-y-2">
                <span className="text-sm text-slate-300">Estado</span>
                <select
                  name="status"
                  defaultValue={selectedArticle?.status ?? "draft"}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </label>
              <Input
                label="Published at (ISO opcional)"
                name="published_at"
                defaultValue={selectedArticle?.published_at}
                placeholder="2026-03-30T18:00:00.000Z"
              />
            </div>
            <label className="flex items-center gap-3 text-sm text-slate-300">
              <input
                type="checkbox"
                name="featured"
                defaultChecked={selectedArticle?.featured ?? false}
                className="size-4 rounded border-white/10 bg-slate-950/70"
              />
              Marcar como destacado
            </label>
            <button className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">
              Guardar artículo
            </button>
          </form>
        </section>

        <section className="space-y-8">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Banco de ideas</p>
              <h2 className="text-2xl font-semibold text-white">Sembrar siguiente tema</h2>
            </div>

            <form action={createIdeaAction} className="mt-6 space-y-4">
              <Input label="Título" name="title" required />
              <TextArea label="Ángulo" name="angle" rows={4} required />
              <TextArea label="Por qué ahora" name="why_now" rows={3} required />
              <TextArea label="Notas" name="notes" rows={4} />
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Artículo fuente (slug opcional)" name="source_article_slug" />
                <label className="block space-y-2">
                  <span className="text-sm text-slate-300">Estado</span>
                  <select name="status" defaultValue="seed" className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none">
                    <option value="seed">seed</option>
                    <option value="exploring">exploring</option>
                    <option value="drafting">drafting</option>
                    <option value="published">published</option>
                    <option value="paused">paused</option>
                  </select>
                </label>
              </div>
              <button className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/20">
                Guardar idea
              </button>
            </form>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-semibold text-white">Estado actual</h2>
            <div className="mt-6 space-y-4">
              <div>
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Artículos</p>
                  <p className="text-xs text-slate-500">{articles.length} total</p>
                </div>
                <div className="mt-3 space-y-3">
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

              <div>
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Ideas</p>
                  <p className="text-xs text-slate-500">{ideas.length} total</p>
                </div>
                <div className="mt-3 space-y-3">
                  {ideas.map((idea) => (
                    <div key={idea.id} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <p className="font-medium text-white">{idea.title}</p>
                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
                          {idea.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-7 text-slate-400">{idea.angle}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
