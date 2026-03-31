import { cookies } from "next/headers";

const ADMIN_COOKIE = "thoughts_site_admin";

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_COOKIE)?.value === "ok";
}

export async function setAdminAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, "ok", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearAdminAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
}
