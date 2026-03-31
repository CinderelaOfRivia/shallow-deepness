"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

type Props = {
  feedbackAction: (formData: FormData) => void | Promise<void>;
  steelmanAction: (formData: FormData) => void | Promise<void>;
  editorialAction: (formData: FormData) => void | Promise<void>;
  saveAction: (formData: FormData) => void | Promise<void>;
  defaultModel: string;
  heavyModel: string;
};

function PendingHint({ label }: { label: string | null }) {
  const { pending } = useFormStatus();

  if (!pending || !label) return null;

  return (
    <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-50">
      {label}… esto puede tardar un poco si el modelo está razonando en serio.
    </div>
  );
}

export function StudioActionBar({
  feedbackAction,
  steelmanAction,
  editorialAction,
  saveAction,
  defaultModel,
  heavyModel,
}: Props) {
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);
  const { pending } = useFormStatus();

  const commonButton =
    "rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-60";

  return (
    <div className="rounded-[1.6rem] border border-violet-300/15 bg-violet-300/5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-violet-200/80">Laboratorio editorial IA</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Tres cuchillos, dos intensidades</h3>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">
            Default usa {defaultModel}. Heavy usa {heavyModel}. Feedback encuentra fallas, steelman aprieta el argumento y editorial pule sin licuar la voz.
          </p>
        </div>
        <label className="block space-y-2">
          <span className="text-sm text-slate-300">Intensidad</span>
          <select name="ai_intensity" defaultValue="default" className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none">
            <option value="default">default · {defaultModel}</option>
            <option value="heavy">heavy · {heavyModel}</option>
          </select>
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="submit"
          formAction={feedbackAction}
          onClick={() => setPendingLabel("Corriendo feedback")}
          disabled={pending}
          className={`${commonButton} border border-cyan-300/20 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/20`}
        >
          Feedback
        </button>
        <button
          type="submit"
          formAction={steelmanAction}
          onClick={() => setPendingLabel("Corriendo steelman")}
          disabled={pending}
          className={`${commonButton} border border-rose-300/20 bg-rose-300/10 text-rose-100 hover:bg-rose-300/20`}
        >
          Steelman
        </button>
        <button
          type="submit"
          formAction={editorialAction}
          onClick={() => setPendingLabel("Corriendo editorial")}
          disabled={pending}
          className={`${commonButton} border border-violet-300/20 bg-violet-300/10 text-violet-100 hover:bg-violet-300/20`}
        >
          Editorial
        </button>
        <button
          type="submit"
          formAction={saveAction}
          onClick={() => setPendingLabel("Guardando artículo")}
          disabled={pending}
          className={`${commonButton} bg-cyan-300 text-slate-950 hover:bg-cyan-200`}
        >
          Guardar artículo
        </button>
      </div>

      <p className="mt-4 text-xs leading-6 text-slate-500">
        Título, slug, subtítulo, extracto, idioma, tags y SEO se infieren automáticamente del draft. Si hay una corrida seleccionada, el siguiente pase puede reutilizar ese contexto.
      </p>

      <PendingHint label={pendingLabel} />
    </div>
  );
}
