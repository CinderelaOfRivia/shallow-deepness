"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearAdminAuthCookie, isAdminAuthenticated, setAdminAuthCookie } from "@/lib/admin-auth";
import { getSupabaseAdmin, hasSupabaseAdminEnv } from "@/lib/supabase";
import { slugify } from "@/lib/utils";

function requireSupabase() {
  if (!hasSupabaseAdminEnv()) {
    throw new Error("Supabase no está configurado todavía. Usa .env.example y ejecuta supabase/schema.sql.");
  }

  return getSupabaseAdmin();
}

async function requireAdmin() {
  const ok = await isAdminAuthenticated();
  if (!ok) {
    redirect("/studio/login");
  }
}

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");

  if (!process.env.BLOG_ADMIN_PASSWORD) {
    throw new Error("Falta BLOG_ADMIN_PASSWORD en el entorno.");
  }

  if (password !== process.env.BLOG_ADMIN_PASSWORD) {
    redirect("/studio/login?error=1");
  }

  await setAdminAuthCookie();
  redirect("/studio");
}

export async function logoutAction() {
  await clearAdminAuthCookie();
  redirect("/");
}

export async function upsertArticleAction(formData: FormData) {
  await requireAdmin();
  const supabase = requireSupabase();

  const title = String(formData.get("title") ?? "").trim();
  const providedSlug = String(formData.get("slug") ?? "").trim();
  const slug = slugify(providedSlug || title);
  const excerpt = String(formData.get("excerpt") ?? "").trim();
  const body_md = String(formData.get("body_md") ?? "").trim();
  const subtitle = String(formData.get("subtitle") ?? "").trim() || null;
  const cover_image_url = String(formData.get("cover_image_url") ?? "").trim() || null;
  const seo_title = String(formData.get("seo_title") ?? "").trim() || null;
  const seo_description = String(formData.get("seo_description") ?? "").trim() || null;
  const language = String(formData.get("language") ?? "es");
  const status = String(formData.get("status") ?? "draft");
  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const featured = formData.get("featured") === "on";
  const published_at = status == "published" ? String(formData.get("published_at") ?? "").trim() || new Date().toISOString() : null;
  const id = String(formData.get("id") ?? "").trim() || undefined;

  if (!title || !slug || !excerpt || !body_md) {
    throw new Error("Título, slug, extracto y cuerpo son obligatorios.");
  }

  const payload = {
    id,
    slug,
    title,
    subtitle,
    excerpt,
    body_md,
    language,
    status,
    cover_image_url,
    tags,
    featured,
    published_at,
    seo_title,
    seo_description,
  };

  const { error } = await supabase.from("articles").upsert(payload, { onConflict: "slug" });
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/articulos");
  revalidatePath(`/articulos/${slug}`);
  revalidatePath("/studio");
  redirect("/studio?saved=article");
}

export async function createIdeaAction(formData: FormData) {
  await requireAdmin();
  const supabase = requireSupabase();

  const title = String(formData.get("title") ?? "").trim();
  const angle = String(formData.get("angle") ?? "").trim();
  const why_now = String(formData.get("why_now") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "seed");
  const source_article_slug = String(formData.get("source_article_slug") ?? "").trim() || null;

  if (!title || !angle || !why_now) {
    throw new Error("Título, ángulo y por qué ahora son obligatorios.");
  }

  const { error } = await supabase.from("idea_bank").insert({
    title,
    angle,
    why_now,
    notes,
    status,
    source_article_slug,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/studio");
  redirect("/studio?saved=idea");
}
