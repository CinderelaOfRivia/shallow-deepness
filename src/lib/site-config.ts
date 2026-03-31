export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? "Shallow Deepness",
  description:
    process.env.NEXT_PUBLIC_SITE_DESCRIPTION ??
    "Un journal anónimo para publicar ideas, ensayos y preguntas sin convertir la identidad en el producto.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;
