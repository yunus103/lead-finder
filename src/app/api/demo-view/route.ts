import { NextRequest, NextResponse } from "next/server";
import { recordDemoView } from "@/services/demo-service";
import { isBotUserAgent, parseUserAgent } from "@/lib/user-agent";
import { validateSlug } from "@/lib/demo-slug";
import { DemoAction } from "@/types/demo";

// Beacons from yaytech-demos/_shared/preview.js. They are sent as text/plain so the browser
// skips the CORS preflight; the slug is taken from the Origin header, never from the body.

const ORIGIN_RE = /^https:\/\/([a-z0-9-]+)\.yaytechstudio\.com$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIONS: DemoAction[] = ["whatsapp", "call", "maps", "instagram"];

interface Beacon {
  t?: string;
  id?: string;
  v?: string;
  r?: string;
  d?: number;
  s?: number;
  a?: string;
}

function header(req: NextRequest, name: string): string | null {
  const value = req.headers.get(name);
  // Vercel URL-encodes geo headers ("%C4%B0stanbul").
  return value ? decodeURIComponent(value) : null;
}

function clampInt(value: unknown, max: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(0, Math.round(value))) : 0;
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin") || "";
  const slug = origin.match(ORIGIN_RE)?.[1];
  const ua = req.headers.get("user-agent") || "";
  if (!slug || validateSlug(slug) || isBotUserAgent(ua)) {
    return new NextResponse(null, { status: 204 });
  }

  let body: Beacon;
  try {
    body = JSON.parse(await req.text());
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  if (!body.id || !UUID_RE.test(body.id)) return new NextResponse(null, { status: 400 });

  try {
    if (body.t === "open") {
      await recordDemoView({
        type: "open",
        id: body.id,
        slug,
        visitorId: body.v && UUID_RE.test(body.v) ? body.v : null,
        referrer: body.r ? body.r.slice(0, 200) : null,
        city: header(req, "x-vercel-ip-city"),
        region: header(req, "x-vercel-ip-country-region"),
        country: header(req, "x-vercel-ip-country"),
        ...parseUserAgent(ua),
      });
    } else if (body.t === "end") {
      await recordDemoView({
        type: "end",
        id: body.id,
        slug,
        durationSeconds: clampInt(body.d, 24 * 60 * 60),
        maxScroll: clampInt(body.s, 100),
      });
    } else if (body.t === "action" && ACTIONS.includes(body.a as DemoAction)) {
      await recordDemoView({ type: "action", id: body.id, slug, action: body.a as DemoAction });
    }
  } catch (error: unknown) {
    console.error("demo-view:", error instanceof Error ? error.message : error);
    return new NextResponse(null, { status: 500 });
  }

  return new NextResponse(null, { status: 204, headers: { "Access-Control-Allow-Origin": origin } });
}
