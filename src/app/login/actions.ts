"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_MAX_AGE, sessionToken } from "@/lib/session";

export async function login(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");
  // Only same-site paths, so the login form can't be used as an open redirect.
  const target = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  const expected = process.env.APP_PASSWORD;
  if (!expected || password !== expected) {
    redirect(`/login?error=1&next=${encodeURIComponent(target)}`);
  }

  (await cookies()).set(SESSION_COOKIE, await sessionToken(password), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  redirect(target);
}
