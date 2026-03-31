import { loginAction } from "@/app/studio/actions";

export const metadata = {
  title: "Studio login",
};

export default async function StudioLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const hasError = Boolean(params.error);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-6 py-16">
      <div className="w-full rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-slate-950/20 backdrop-blur">
        <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Studio</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Entrar al panel editorial</h1>
        <p className="mt-4 text-sm leading-7 text-slate-300">
          Acceso mínimo, directo y suficientemente digno para un proyecto personal. La alternativa era un CMS gigante con más ceremonias que utilidad.
        </p>

        <form action={loginAction} className="mt-8 space-y-4">
          <label className="block space-y-2">
            <span className="text-sm text-slate-300">Password</span>
            <input
              type="password"
              name="password"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none ring-0 placeholder:text-slate-500"
              placeholder="BLOG_ADMIN_PASSWORD"
              required
            />
          </label>

          {hasError ? <p className="text-sm text-rose-300">Password incorrecto.</p> : null}

          <button className="w-full rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
