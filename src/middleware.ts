import { NextRequest, NextResponse } from "next/server";

// Whole app is private. Fails closed: if the env vars are missing, nobody gets in.
export function middleware(req: NextRequest) {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASSWORD;
  const header = req.headers.get("authorization");

  if (user && pass && header?.startsWith("Basic ")) {
    const [u, ...rest] = atob(header.slice(6)).split(":");
    if (u === user && rest.join(":") === pass) return NextResponse.next();
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="lead-finder", charset="UTF-8"' },
  });
}

export const config = {
  // demo-view is pinged by public demo sites; demos has its own bearer token.
  matcher: ["/((?!api/demo-view|api/demos|_next/static|_next/image|favicon.ico).*)"],
};
