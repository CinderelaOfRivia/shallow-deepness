export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-3xl space-y-4">
      <p className="section-eyebrow">{eyebrow}</p>
      <h2 className="text-glow text-3xl font-semibold tracking-tight text-white sm:text-5xl">{title}</h2>
      <p className="text-lg leading-8 text-slate-300 sm:text-xl">{description}</p>
    </div>
  );
}
