import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, sessionToken } from "@/lib/session";

// Hashed once per instance; each request is then a single string comparison.
// Fails closed: without APP_PASSWORD nobody gets in.
const password = process.env.APP_PASSWORD;
const expected = password ? sessionToken(password) : null;

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (expected && token === (await expected)) return NextResponse.next();

  if (req.method === "GET") {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return new NextResponse(null, { status: 401 });
}

export const config = {
  // demo-view is pinged by public demo sites; demos has its own bearer token.
  // Static files are skipped so they never cost a middleware invocation.
  matcher: [
    "/((?!login|api/demo-view|api/demos|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml)$).*)",
  ],
};
