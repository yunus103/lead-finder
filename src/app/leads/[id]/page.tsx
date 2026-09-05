import Link from "next/link";
import { notFound } from "next/navigation";
import { getBusinessWithSources } from "@/services/business-service";
import { getLatestWebsiteAudit, performDeepAudit } from "@/services/website-service";
import { getLeadActivities } from "@/services/crm-service";
import { WebsiteIntelligenceCard } from "./website-intelligence-card";
import { LeadScoreCard } from "./lead-score-card";
import { CrmCockpit } from "./crm-cockpit";

export const dynamic = "force-dynamic";

interface LeadDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { id } = await params;
  const data = await getBusinessWithSources(id);

  if (!data) {
    notFound();
  }

  const { business: b, sources } = data;
  let latestAudit = await getLatestWebsiteAudit(b.id);
  const activities = await getLeadActivities(b.id);

  // If business has a website but no deep audit yet, perform it on-demand
  if (!latestAudit && b.website && b.website.trim() !== "") {
    try {
      latestAudit = await performDeepAudit(b.id);
    } catch (e) {
      console.warn("On-demand deep audit failed on page load:", e);
    }
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <Link
          href="/leads"
          className="text-xs text-slate-500 hover:text-slate-950 transition inline-flex items-center gap-1.5 font-bold"
        >
          ← Aday Havuzuna Dön
        </Link>
      </div>

      {/* Header */}
      <div className="border border-slate-200/90 bg-white rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-6 mb-6">
          <div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 font-mono">
              ● Ana Kurumsal Kayıt
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight mt-2">{b.name}</h1>
            <p className="text-xs text-slate-500 mt-0.5">{b.category || "Kategori Belirtilmemiş"}</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-lg text-xs font-bold border font-mono ${
                b.website_status === "HAS_WEBSITE"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : b.website_status === "NO_WEBSITE"
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : b.website_status === "UNREACHABLE"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              }`}
            >
              Web Durumu:{" "}
              {b.website_status === "HAS_WEBSITE"
                ? "SİTE VAR"
                : b.website_status === "NO_WEBSITE"
                ? "SİTE YOK"
                : b.website_status === "UNREACHABLE"
                ? "ERİŞİLEMEZ"
                : "BİLİNMİYOR"}
            </span>
          </div>
        </div>

        {/* Identity & Normalized Data Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              İletişim & Web Varlığı
            </h3>
            <div className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Telefon:</span>
                <span className="text-slate-950 font-bold font-mono text-sm">{b.phone || "—"}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Normalize Telefon:</span>
                <span className="font-mono text-slate-700 font-semibold">{b.phone_normalized || "—"}</span>
              </div>
              <div className="border-t border-slate-200/70 pt-2.5 flex justify-between items-center">
                <span className="text-slate-500">Web Sitesi:</span>
                {b.website ? (
                  <a
                    href={b.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 font-mono font-medium hover:underline truncate max-w-[220px]"
                  >
                    {b.website}
                  </a>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Alan Adı:</span>
                <span className="font-mono text-slate-700 font-semibold">{b.website_domain || "—"}</span>
              </div>
              <div className="border-t border-slate-200/70 pt-2.5 flex justify-between items-center">
                <span className="text-slate-500">Instagram:</span>
                {b.instagram ? (
                  <span className="text-pink-600 font-medium">
                    @{b.instagram_normalized || b.instagram}
                  </span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Konum & Performans Bilgisi
            </h3>
            <div className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Adres:</span>
                <span className="text-slate-900 text-right max-w-[240px] truncate font-medium">
                  {b.address || "—"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Şehir / İlçe:</span>
                <span className="text-slate-950 font-semibold">
                  {b.city || "—"} {b.district ? `(${b.district})` : ""}
                </span>
              </div>
              <div className="border-t border-slate-200/70 pt-2.5 flex justify-between items-center">
                <span className="text-slate-500">Google Puanı:</span>
                <span className="text-slate-900 font-bold">
                  {b.rating ? `★ ${b.rating}` : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Yorum Sayısı:</span>
                <span className="text-slate-900 font-mono font-bold">{b.review_count || 0}</span>
              </div>
              <div className="border-t border-slate-200/70 pt-2.5 flex justify-between items-center text-slate-500">
                <span>İlk Keşif Tarihi:</span>
                <span className="font-mono">{new Date(b.created_at).toLocaleDateString("tr-TR")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CRM & Cold-Calling Cockpit */}
      <CrmCockpit business={b} initialActivities={activities} />

      {/* Lead Scoring */}
      <LeadScoreCard business={b} />

      {/* Website Intelligence */}
      <WebsiteIntelligenceCard business={b} latestAudit={latestAudit} />

      {/* Discovery Sources */}
      <div className="border border-slate-200/90 bg-white rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-950 tracking-tight">
            Keşif Kaynakları ({sources.length})
          </h2>
          <span className="text-xs text-slate-500">
            Bu ana işletmeye bağlı harici sağlayıcı kayıtları
          </span>
        </div>

        {sources.length === 0 ? (
          <p className="text-xs text-slate-400 py-4">Henüz bağlı bir kaynak kaydı bulunmuyor.</p>
        ) : (
          <div className="space-y-3">
            {sources.map((src) => (
              <div
                key={src.id}
                className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-4 text-xs"
              >
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 uppercase text-[10px] bg-slate-200 px-2.5 py-0.5 rounded-md">
                      {src.provider === "google_maps"
                        ? "Google Haritalar"
                        : src.provider === "google_search"
                        ? "Google Arama"
                        : src.provider === "instagram"
                        ? "Instagram"
                        : "Manuel"}
                    </span>
                    {src.external_id && (
                      <span className="text-slate-600 font-mono text-xs">
                        ID: {src.external_id}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 font-mono">
                    {new Date(src.fetched_at).toLocaleString("tr-TR")}
                  </span>
                </div>
                {src.source_url && (
                  <div className="mb-2">
                    <span className="text-slate-500 mr-2">Kaynak Bağlantısı:</span>
                    <a
                      href={src.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline truncate font-mono text-xs"
                    >
                      {src.source_url}
                    </a>
                  </div>
                )}
                {src.raw_data && Object.keys(src.raw_data).length > 0 && (
                  <div>
                    <span className="text-slate-500 block mb-1 text-[10px] font-semibold uppercase tracking-wider">Ham Veri:</span>
                    <pre className="bg-white border border-slate-200/80 p-3 rounded-xl text-[10px] text-slate-700 overflow-x-auto font-mono">
                      {JSON.stringify(src.raw_data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
