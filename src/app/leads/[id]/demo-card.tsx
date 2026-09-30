"use client";

import { useState, useTransition } from "react";
import { Business } from "@/types/business";
import { DemoAction, DemoView } from "@/types/demo";
import { DEMO_TEMPLATES, matchDemoTemplate } from "@/data/demo-templates";
import { demoUrl, slugFromName, validateSlug } from "@/lib/demo-slug";
import { createDemoPromptAction, markDemoSentAction, saveDemoAction } from "../actions";

// yaytech-demos/scripts/cleanup.mjs deletes demos older than this unless they are marked keep.
const DEMO_LIFETIME_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const VISIBLE_VIEWS = 8;

const ACTION_LABEL: Record<DemoAction, string> = {
  whatsapp: "WhatsApp'a bastı",
  call: "Aramaya bastı",
  maps: "Haritayı açtı",
  instagram: "Instagram'a baktı",
};

interface DemoState {
  demo_url: string | null;
  demo_created_at: string | null;
  demo_sent_at: string | null;
  demo_view_count: number;
  demo_last_viewed_at: string | null;
  demo_deleted_at: string | null;
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

function dateTime(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function timeAgo(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "az önce";
  if (minutes < 60) return `${minutes} dk önce`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} sa önce`;
  return `${Math.floor(minutes / (24 * 60))} gün önce`;
}

function duration(seconds: number): string {
  if (seconds < 60) return `${seconds} sn`;
  const rest = seconds % 60;
  return rest ? `${Math.floor(seconds / 60)} dk ${rest} sn` : `${Math.floor(seconds / 60)} dk`;
}

function place(v: DemoView): string | null {
  const parts = [v.city, v.country && v.country !== "TR" ? v.country : null].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

function statusLine(d: DemoState): string | null {
  if (!d.demo_created_at) return null;
  const daysLeft = DEMO_LIFETIME_DAYS - Math.floor((Date.now() - new Date(d.demo_created_at).getTime()) / DAY_MS);
  return [
    `Oluşturuldu ${shortDate(d.demo_created_at)}`,
    d.demo_sent_at && `Gönderildi ${shortDate(d.demo_sent_at)}`,
    d.demo_deleted_at
      ? `Silindi ${shortDate(d.demo_deleted_at)}`
      : daysLeft > 0
      ? `${daysLeft} gün sonra silinir`
      : "30 günlük süre doldu",
  ]
    .filter(Boolean)
    .join(" · ");
}

function ViewStats({ views, demo }: { views: DemoView[]; demo: DemoState }) {
  const [showAll, setShowAll] = useState(false);
  if (demo.demo_view_count === 0) {
    return <p className="text-slate-400">{demo.demo_sent_at ? "Henüz açılmadı." : "Gönderilince açılışlar burada görünür."}</p>;
  }

  // A null visitor id (storage blocked) cannot be matched, so it counts as its own person.
  const people = new Set(views.map((v) => v.visitor_id || v.id)).size;
  const actions = [...new Set(views.flatMap((v) => v.actions))];
  const visible = showAll ? views : views.slice(0, VISIBLE_VIEWS);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold text-slate-950 text-sm">
          {demo.demo_view_count} açılış · {people} kişi
        </span>
        {demo.demo_last_viewed_at && <span className="text-slate-500">son {timeAgo(demo.demo_last_viewed_at)}</span>}
        {actions.map((a) => (
          <span key={a} className="px-2 py-0.5 rounded-md font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            {ACTION_LABEL[a]}
          </span>
        ))}
      </div>

      <ul className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl bg-slate-50/50">
        {visible.map((v) => (
          <li key={v.id} className="px-3.5 py-2.5 flex flex-wrap gap-x-3 gap-y-1 text-slate-600">
            <span className="font-semibold text-slate-900 whitespace-nowrap">{dateTime(v.created_at)}</span>
            {place(v) && <span>{place(v)}</span>}
            <span>{[v.os, v.browser].filter(Boolean).join(" · ")}</span>
            {v.duration_seconds !== null && <span>{duration(v.duration_seconds)}</span>}
            {v.max_scroll !== null && <span>%{v.max_scroll} kaydırdı</span>}
            {v.actions.map((a) => (
              <span key={a} className="font-semibold text-emerald-700">
                {ACTION_LABEL[a]}
              </span>
            ))}
          </li>
        ))}
      </ul>
      {views.length > VISIBLE_VIEWS && (
        <button onClick={() => setShowAll((s) => !s)} className="font-semibold text-slate-500 hover:text-slate-950">
          {showAll ? "Daha az göster" : `Tümünü göster (${views.length})`}
        </button>
      )}
    </div>
  );
}

const inputClass =
  "h-10 px-3 border border-slate-200/90 rounded-xl text-xs bg-white text-slate-900 focus:outline-none focus:border-slate-400";
const secondaryButtonClass =
  "h-10 px-4 bg-white border border-slate-200/90 hover:border-slate-300 text-slate-700 hover:text-slate-950 text-xs font-bold rounded-xl transition shadow-xs disabled:opacity-50";
const primaryButtonClass =
  "h-10 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 active:bg-black text-white text-xs font-bold shadow-xs transition disabled:opacity-50";

export function DemoCard({ business, initialViews }: { business: Business; initialViews: DemoView[] }) {
  const [template, setTemplate] = useState(
    business.demo_template || matchDemoTemplate(business.category)?.id || DEMO_TEMPLATES[0].id
  );
  const [slug, setSlug] = useState(business.demo_slug || slugFromName(business.name));
  const [prompt, setPrompt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [urlInput, setUrlInput] = useState(business.demo_url || "");
  const [demo, setDemo] = useState<DemoState>({
    demo_url: business.demo_url ?? null,
    demo_created_at: business.demo_created_at ?? null,
    demo_sent_at: business.demo_sent_at ?? null,
    demo_view_count: business.demo_view_count ?? 0,
    demo_last_viewed_at: business.demo_last_viewed_at ?? null,
    demo_deleted_at: business.demo_deleted_at ?? null,
  });
  const [views, setViews] = useState(initialViews);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const slugError = validateSlug(slug);
  const status = statusLine(demo);

  const handleCreatePrompt = () => {
    setMessage(null);
    setCopied(false);
    startTransition(async () => {
      const res = await createDemoPromptAction(business.id, template, slug);
      setPrompt(res.prompt);
      setMessage(res.success ? res.warning : res.error ?? null);
    });
  };

  const handleCopy = async () => {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
    } catch {
      setMessage("Panoya kopyalanamadı; metni kutudan elle kopyala.");
    }
  };

  const handleSave = () => {
    setMessage(null);
    startTransition(async () => {
      const res = await saveDemoAction(business.id, template, urlInput);
      if (res.success && res.demo) {
        if (res.demo.demo_url !== demo.demo_url) setViews([]);
        setDemo(res.demo);
        setUrlInput(res.demo.demo_url ?? "");
        setMessage("Demo linki kaydedildi.");
      } else {
        setMessage(res.error ?? "Kaydedilemedi.");
      }
    });
  };

  const handleSent = () => {
    if (!demo.demo_url) return;
    const url = demo.demo_url;
    setMessage(null);
    startTransition(async () => {
      const res = await markDemoSentAction(business.id, url);
      if (res.success && res.sentAt) setDemo((d) => ({ ...d, demo_sent_at: res.sentAt }));
      else setMessage(res.error ?? "Kaydedilemedi.");
    });
  };

  return (
    <div className="border border-slate-200/90 bg-white rounded-2xl p-6 sm:p-7 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-5 mb-6">
        <div>
          <h2 className="text-base font-bold text-slate-950 tracking-tight">Demo site</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {status || "Agent için prompt oluştur, dönen linki buraya kaydet."}
          </p>
        </div>
        {demo.demo_url && !demo.demo_deleted_at && (
          <a
            // ?me=1 marks this browser as the owner's so its visits are never counted.
            href={`${demo.demo_url}?me=1`}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-blue-600 hover:underline self-start sm:self-auto"
          >
            {demo.demo_url.replace("https://", "")} ↗
          </a>
        )}
      </div>

      <div className="space-y-5 text-xs">
        {demo.demo_url && <ViewStats views={views} demo={demo} />}

        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] gap-3 sm:items-start">
          <select value={template} onChange={(e) => setTemplate(e.target.value)} className={inputClass}>
            {DEMO_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <div>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              aria-label="Slug"
              className={`${inputClass} w-full font-mono`}
            />
            <p className={`mt-1 ${slugError ? "text-rose-600" : "text-slate-400"}`}>
              {slugError || demoUrl(slug)}
            </p>
          </div>
          <button onClick={handleCreatePrompt} disabled={isPending || !!slugError} className={primaryButtonClass}>
            Prompt oluştur
          </button>
        </div>

        {prompt && (
          <div className="space-y-2">
            <textarea
              readOnly
              value={prompt}
              rows={16}
              className="w-full leading-relaxed p-3 rounded-xl border border-slate-200/90 bg-slate-50/50 font-mono text-[11px] text-slate-800 focus:outline-none"
            />
            <button onClick={handleCopy} className={secondaryButtonClass}>
              {copied ? "Kopyalandı" : "Kopyala"}
            </button>
          </div>
        )}

        <div className="border-t border-slate-100 pt-5 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3">
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder={demoUrl(slug)}
            aria-label="Demo linki"
            className={`${inputClass} w-full font-mono`}
          />
          <button onClick={handleSave} disabled={isPending || !urlInput.trim()} className={secondaryButtonClass}>
            Linki kaydet
          </button>
          <button
            onClick={handleSent}
            disabled={isPending || !demo.demo_url || !!demo.demo_sent_at}
            className={secondaryButtonClass}
          >
            {demo.demo_sent_at ? "Gönderildi" : "Gönderildi olarak işaretle"}
          </button>
        </div>

        {message && <p className="text-slate-600">{message}</p>}
      </div>
    </div>
  );
}
