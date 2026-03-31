import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center gap-5 px-6 text-center">
      <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">404</p>
      <h1 className="text-4xl font-semibold tracking-tight text-white">Ese texto no vive aquí.</h1>
      <p className="text-lg leading-8 text-slate-300">
        Puede que el slug no exista o que el artículo siga en borrador, descansando lejos del público.
      </p>
      <Link href="/articulos" className="rounded-full bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950">
        Volver a artículos
      </Link>
    </div>
  );
}
