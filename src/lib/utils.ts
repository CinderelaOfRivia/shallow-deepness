import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | null) {
  if (!date) return "Sin fecha";

  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
  }).format(new Date(date));
}

export function calculateReadingTime(markdown: string) {
  const words = markdown.replace(/[#_*`>\-]/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}
