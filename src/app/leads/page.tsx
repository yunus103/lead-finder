import Link from "next/link";
import { getBusinesses } from "@/services/business-service";
import { NewLeadDialog } from "./new-lead-dialog";
import { RecalculateAllButton } from "./recalculate-all-button";

import { CRM_STATUS_CONFIG, CrmStatus } from "@/types/crm";

export const dynamic = "force-dynamic";

interface LeadsPageProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
    websiteStatus?: string;
    priority?: string;
    crmTab?: string;
    sortBy?: "score" | "newest";
  }>;
}

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const params = await searchParams;
  let businesses: Awaited<ReturnType<typeof getBusinesses>>["businesses"] = [];
  let total = 0;
  let loadError: string | null = null;

  const activeCrmTab = params.crmTab || "all";
  const isExcludedTab = activeCrmTab === "excluded";

  try {
    const res = await getBusinesses({
      search: params.search,
      category: params.category,
      websiteStatus: params.websiteStatus,
      priority: params.priority,
      sortBy: params.sortBy || "score",
      isExcluded: isExcludedTab ? true : false,
      crmStatus:
        activeCrmTab === "to_call"
          ? "TO_CALL_OR_NEW"
          : activeCrmTab === "opportunities"
          ? "OPPORTUNITY"
          : undefined,
      followUpDue: activeCrmTab === "follow_ups" ? true : undefined,
    });
    businesses = res.businesses;
    total = res.total;
  } catch (err: unknown) {
    loadError = err instanceof Error ? err.message : String(err);
  }

  const crmTabs = [
    { label: "📋 Tüm Aktifler", value: "all" },
    { label: "📞 Aranacaklar", value: "to_call" },
    { label: "⏰ Geri Aranacaklar", value: "follow_ups" },
    { label: "🔥 Sıcak Fırsatlar", value: "opportunities" },
    { label: "🚫 Dışlananlar", value: "excluded" },
  ];

  const priorityTabs = [
    { label: "Tüm Skorlar", value: "" },
    { label: "🔥 HOT (80–100)", value: "HOT" },
    { label: "⚡ WARM (60–79)", value: "WARM" },
    { label: "❄️ COLD (40–59)", value: "COLD" },
    { label: "Önceliksiz (LOW)", value: "LOW" },
  ];

  const getPriorityBadge = (p: string, score: number) => {
    switch (p) {
      case "HOT":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
            HOT {score}
          </span>
        );
      case "WARM":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
            WARM {score}
          </span>
        );
      case "COLD":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
            COLD {score}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200">
            LOW {score}
          </span>
        );
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Yaytech CRM Havuzu
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
            İşletmeler ve Aday Havuzu
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-xl">
            Tüm kaynaklardan toplanan, web sitesi durumuna ve ticari potansiyeline göre puanlanan kayıtlar.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <RecalculateAllButton />
          <NewLeadDialog />
        </div>
      </div>

      {loadError && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
          <strong>Veritabanı Uyarısı:</strong> {loadError}
          <div className="mt-1 text-slate-600">
            Lütfen SQL migrasyonunun Supabase SQL Editöründe çalıştırıldığından emin olun.
          </div>
        </div>
      )}

      {/* Filter / Search & Priority Tabs Bar */}
      <div className="space-y-4">
        <div className="bg-white border border-slate-200/90 p-3 sm:p-4 rounded-2xl shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <form method="GET" className="flex items-center gap-2 w-full max-w-md">
            {params.priority && <input type="hidden" name="priority" value={params.priority} />}
            {activeCrmTab !== "all" && <input type="hidden" name="crmTab" value={activeCrmTab} />}
            <div className="relative w-full">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400 text-sm">
                🔍
              </span>
              <input
                type="text"
                name="search"
                defaultValue={params.search || ""}
                placeholder="İşletme adı veya anahtar kelime ile ara..."
                className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white w-full transition"
              />
            </div>
            <button
              type="submit"
              className="bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs shrink-0"
            >
              Ara
            </button>
            {params.search && (
              <Link
                href={params.priority ? `/leads?priority=${params.priority}` : "/leads"}
                className="text-xs font-semibold text-slate-500 hover:text-slate-950 transition shrink-0"
              >
                Temizle
              </Link>
            )}
          </form>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 justify-between lg:justify-end">
            {/* Sort Toggle */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              <span className="text-[11px] font-medium text-slate-400 pl-2">Sırala:</span>
              <Link
                href={`/leads?${new URLSearchParams({
                  ...(params.search && { search: params.search }),
                  ...(params.priority && { priority: params.priority }),
                  ...(activeCrmTab !== "all" && { crmTab: activeCrmTab }),
                  sortBy: "score",
                }).toString()}`}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  (params.sortBy || "score") === "score"
                    ? "bg-white text-slate-950 shadow-xs"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                Skor (Yüksek)
              </Link>
              <Link
                href={`/leads?${new URLSearchParams({
                  ...(params.search && { search: params.search }),
                  ...(params.priority && { priority: params.priority }),
                  ...(activeCrmTab !== "all" && { crmTab: activeCrmTab }),
                  sortBy: "newest",
                }).toString()}`}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  params.sortBy === "newest"
                    ? "bg-white text-slate-950 shadow-xs"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                En Yeni
              </Link>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 px-3.5 py-1.5 rounded-xl font-mono text-xs">
              Toplam <span className="font-bold text-slate-950">{total}</span> Kayıt
            </div>
          </div>
        </div>

        {/* Operational CRM Workflow Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
          {crmTabs.map((tab) => {
            const isActive = activeCrmTab === tab.value;
            const queryParams = new URLSearchParams();
            if (params.search) queryParams.set("search", params.search);
            if (params.sortBy) queryParams.set("sortBy", params.sortBy);
            if (params.priority) queryParams.set("priority", params.priority);
            if (tab.value !== "all") queryParams.set("crmTab", tab.value);

            return (
              <Link
                key={tab.value}
                href={`/leads${queryParams.toString() ? `?${queryParams.toString()}` : ""}`}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                  isActive
                    ? "bg-slate-950 text-white shadow-xs"
                    : "bg-white border border-slate-200/90 text-slate-600 hover:border-slate-300 hover:text-slate-950"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {/* Priority Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400 mr-1">Öncelik Seviyesi:</span>
          {priorityTabs.map((tab) => {
            const isActive = (params.priority || "") === tab.value;
            const queryParams = new URLSearchParams();
            if (params.search) queryParams.set("search", params.search);
            if (params.sortBy) queryParams.set("sortBy", params.sortBy);
            if (activeCrmTab !== "all") queryParams.set("crmTab", activeCrmTab);
            if (tab.value) queryParams.set("priority", tab.value);

            return (
              <Link
                key={tab.value}
                href={`/leads${queryParams.toString() ? `?${queryParams.toString()}` : ""}`}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  isActive
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-white border border-slate-200/90 text-slate-600 hover:border-slate-300 hover:text-slate-950"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
        {businesses.length === 0 ? (
          <div className="text-center py-20 px-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 mx-auto flex items-center justify-center text-2xl mb-3 shadow-2xs">
              🏢
            </div>
            <h3 className="text-sm font-bold text-slate-900">Kayıt bulunamadı</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Seçilen filtre ve arama kriterlerine uyan bir işletme bulunmuyor.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200/90">
                <tr>
                  <th className="px-5 py-3.5">Öncelik & Skor</th>
                  <th className="px-5 py-3.5">CRM Durumu</th>
                  <th className="px-5 py-3.5">İşletme Adı</th>
                  <th className="px-5 py-3.5">İletişim & Arama</th>
                  <th className="px-5 py-3.5">Web Varlığı</th>
                  <th className="px-5 py-3.5">Google Puanı</th>
                  <th className="px-5 py-3.5 text-right">Aksiyonlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {businesses.map((b) => {
                  const statusCfg = CRM_STATUS_CONFIG[b.crm_status as CrmStatus] || CRM_STATUS_CONFIG.NEW;
                  const isFollowUpDue = b.next_follow_up_at && new Date(b.next_follow_up_at) <= new Date();

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/60 transition group">
                      {/* 1. Score & Priority */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {getPriorityBadge(b.priority, b.lead_score)}
                      </td>

                      {/* 2. CRM Status & Follow-Up Alert */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1.5 items-start">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`}></span>
                            {statusCfg.label}
                          </span>

                          {b.is_excluded && (
                            <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                              🚫 Dışlandı
                            </span>
                          )}

                          {b.next_follow_up_at && (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                isFollowUpDue
                                  ? "bg-rose-100 text-rose-800 border border-rose-200 animate-pulse"
                                  : "bg-amber-100 text-amber-800 border border-amber-200"
                              }`}
                              title={new Date(b.next_follow_up_at).toLocaleString("tr-TR")}
                            >
                              ⏰ {isFollowUpDue ? "Gecikmiş Takip!" : new Date(b.next_follow_up_at).toLocaleDateString("tr-TR")}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 3. Business Name & Location */}
                      <td className="px-5 py-4">
                        <Link
                          href={`/leads/${b.id}`}
                          className="font-bold text-sm text-slate-950 hover:text-blue-600 transition block"
                        >
                          {b.name}
                        </Link>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {b.category || "Kategori Belirtilmemiş"}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {b.city || "—"} {b.district ? `(${b.district})` : ""}
                        </div>
                      </td>

                      {/* 4. Contact & Call Tracking */}
                      <td className="px-5 py-4 text-slate-700">
                        <div className="font-mono font-bold text-xs text-slate-900">
                          {b.phone || "Telefon Yok"}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              (b.contact_attempts || 0) > 0
                                ? "bg-slate-100 text-slate-700 border border-slate-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {(b.contact_attempts || 0) > 0
                              ? `${b.contact_attempts} arama yapıldı`
                              : "Hiç aranmadı"}
                          </span>
                        </div>
                      </td>

                      {/* 5. Website Status */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                            b.website_status === "HAS_WEBSITE"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : b.website_status === "NO_WEBSITE"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : b.website_status === "UNREACHABLE"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {b.website_status === "HAS_WEBSITE"
                            ? "SİTE VAR"
                            : b.website_status === "NO_WEBSITE"
                            ? "SİTE YOK"
                            : b.website_status === "UNREACHABLE"
                            ? "ERİŞİLEMEZ"
                            : "BİLİNMİYOR"}
                        </span>
                        {b.website_domain && (
                          <div className="text-[11px] text-slate-500 mt-1 truncate max-w-[150px] font-mono">
                            {b.website_domain}
                          </div>
                        )}
                      </td>

                      {/* 6. Google Rating */}
                      <td className="px-5 py-4 text-slate-700">
                        {b.rating ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-amber-500 font-bold">★</span>
                            <span className="font-bold text-slate-900">{b.rating}</span>
                            <span className="text-slate-400 text-xs font-mono">
                              ({b.review_count || 0})
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* 7. Action */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {!b.is_excluded && b.crm_status !== "WON" && b.crm_status !== "LOST" && (
                            <Link
                              href={`/queue?leadId=${b.id}`}
                              className="h-8 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold shadow-2xs inline-flex items-center gap-1.5 transition"
                              title="Arama Sırasında Hemen Ara"
                            >
                              <span>📞</span>
                              <span>Ara</span>
                            </Link>
                          )}
                          <Link
                            href={`/leads/${b.id}`}
                            className="h-8 px-3.5 rounded-lg border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold inline-flex items-center gap-1 transition"
                            title="İşletme Detay & CRM Kokpiti"
                          >
                            <span>Kokpit</span>
                            <span className="font-mono text-xs">→</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
