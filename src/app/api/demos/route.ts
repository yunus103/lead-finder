import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { markDemosDeleted, saveDemo } from "@/services/demo-service";
import { demoUrl, validateSlug } from "@/lib/demo-slug";
import { DEMO_TEMPLATES } from "@/data/demo-templates";

// Called by yaytech-demos/scripts/notify.mjs after a push or a cleanup.
//   { "action": "saved", "leadId": "<uuid>", "slug": "svd-pilates", "template": "pilates" }
//   { "action": "deleted", "slugs": ["svd-pilates"] }

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.DEMOS_API_TOKEN;
  const given = req.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  if (!expected || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { action?: string; leadId?: string; slug?: string; template?: string; slugs?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    if (body.action === "saved") {
      const { leadId, slug, template } = body;
      if (!leadId || !slug || validateSlug(slug)) {
        return NextResponse.json({ error: "leadId and a valid slug are required" }, { status: 400 });
      }
      if (!template || !DEMO_TEMPLATES.some((t) => t.id === template)) {
        return NextResponse.json({ error: `Unknown template: ${template}` }, { status: 400 });
      }
      const demo = await saveDemo(leadId, template, slug, demoUrl(slug));
      return NextResponse.json({ ok: true, url: demo.demo_url });
    }

    if (body.action === "deleted") {
      const slugs = (body.slugs || []).filter((s) => !validateSlug(s));
      if (slugs.length === 0) return NextResponse.json({ error: "slugs are required" }, { status: 400 });
      const updated = await markDemosDeleted(slugs);
      return NextResponse.json({ ok: true, updated });
    }
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }

  return NextResponse.json({ error: "action must be 'saved' or 'deleted'" }, { status: 400 });
}
