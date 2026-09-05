import Link from "next/link";
import { notFound } from "next/navigation";
import { getBusinessWithSources } from "@/services/business-service";
import { getLatestWebsiteAudit, performDeepAudit } from "@/services/website-service";
import { WebsiteIntelligenceCard } from "./website-intelligence-card";
import { LeadScoreCard } from "./lead-score-card";

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

  // If business has a website but no deep audit yet, perform it on-demand
  if (!latestAudit && b.website && b.website.trim() !== "") {
    try {
      latestAudit = await performDeepAudit(b.id);
    } catch (e) {
      console.warn("On-demand deep audit failed on page load:", e);
    }
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link
          href="/leads"
          className="text-xs text-slate-500 hover:text-slate-900 transition flex items-center gap-1 font-medium"
        >
          ← İşletmelere Dön
        </Link>
      </div>

      {/* Header */}
      <div className="border border-slate-200 bg-white rounded-xl p-6 mb-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6 mb-6">
          <div>
            <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Ana Kurumsal Kayıt
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-2">{b.name}</h1>
            <p className="text-xs text-slate-500 mt-0.5">{b.category || "Kategori Belirtilmemiş"}</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium border ${
                b.website_status === "HAS_WEBSITE"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : b.website_status === "NO_WEBSITE"
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : b.website_status === "UNREACHABLE"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              }`}
            >
              Web Sitesi:{" "}
              {b.website_status === "HAS_WEBSITE"
                ? "VAR"
                : b.website_status === "NO_WEBSITE"
                ? "YOK"
                : b.website_status === "UNREACHABLE"
                ? "ERİŞİLEMEZ"
                : "BİLİNMİYOR"}
            </span>
          </div>
        </div>

        {/* Identity & Normalized Data Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
              İletişim & Web Varlığı
            </h3>
            <div className="bg-slate-50/80 border border-slate-200 rounded-lg p-4 space-y-2.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Telefon:</span>
                <span className="text-slate-900 font-medium">{b.phone || "—"}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Normalize Edilmiş Telefon:</span>
                <span className="font-mono text-slate-700">{b.phone_normalized || "—"}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between">
                <span className="text-slate-500">Web Sitesi:</span>
                {b.website ? (
                  <a
                    href={b.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-600 font-medium hover:underline truncate max-w-[220px]"
                  >
                    {b.website}
                  </a>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Alan Adı (Domain):</span>
                <span className="font-mono text-slate-700">{b.website_domain || "—"}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between">
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
            <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
              Konum & Performans Bilgisi
            </h3>
            <div className="bg-slate-50/80 border border-slate-200 rounded-lg p-4 space-y-2.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Adres:</span>
                <span className="text-slate-900 text-right max-w-[240px] truncate">
                  {b.address || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Şehir / İlçe:</span>
                <span className="text-slate-900 font-medium">
                  {b.city || "—"} {b.district ? `(${b.district})` : ""}
                </span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between">
                <span className="text-slate-500">Puan:</span>
                <span className="text-slate-900 font-medium">
                  {b.rating ? `★ ${b.rating}` : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Yorum Sayısı:</span>
                <span className="text-slate-900 font-medium">{b.review_count || 0}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between text-slate-500">
                <span>İlk Keşif Tarihi:</span>
                <span>{new Date(b.created_at).toLocaleDateString("tr-TR")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lead Scoring */}
      <LeadScoreCard business={b} />

      {/* Website Intelligence */}
      <WebsiteIntelligenceCard business={b} latestAudit={latestAudit} />

      {/* Discovery Sources */}
      <div className="border border-slate-200 bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-900 tracking-wide uppercase">
            Keşif Kaynakları ({sources.length})
          </h2>
          <span className="text-xs text-slate-500">
            Bu ana işletmeye bağlı olan harici sağlayıcı kayıtları
          </span>
        </div>

        {sources.length === 0 ? (
          <p className="text-xs text-slate-400 py-4">Henüz bağlı bir kaynak kaydı bulunmuyor.</p>
        ) : (
          <div className="space-y-3">
            {sources.map((src) => (
              <div
                key={src.id}
                className="bg-slate-50/80 border border-slate-200 rounded-lg p-4 text-xs"
              >
                <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 uppercase text-[11px] bg-slate-200 px-2 py-0.5 rounded">
                      {src.provider === "google_maps"
                        ? "Google Haritalar"
                        : src.provider === "google_search"
                        ? "Google Arama"
                        : src.provider === "instagram"
                        ? "Instagram"
                        : "Manuel"}
                    </span>
                    {src.external_id && (
                      <span className="text-slate-600 font-mono text-[10px]">
                        ID: {src.external_id}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Çekilme Tarihi: {new Date(src.fetched_at).toLocaleString("tr-TR")}
                  </span>
                </div>
                {src.source_url && (
                  <div className="mb-2">
                    <span className="text-slate-500 mr-2">Kaynak Bağlantısı:</span>
                    <a
                      href={src.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-600 hover:underline truncate"
                    >
                      {src.source_url}
                    </a>
                  </div>
                )}
                {src.raw_data && Object.keys(src.raw_data).length > 0 && (
                  <div>
                    <span className="text-slate-500 block mb-1 text-[10px]">Ham Veri Paketi:</span>
                    <pre className="bg-white border border-slate-200 p-2.5 rounded text-[10px] text-slate-700 overflow-x-auto">
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
