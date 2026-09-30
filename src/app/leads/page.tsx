import Link from "next/link";
import { getBusinesses } from "@/services/business-service";
import { NewLeadDialog } from "./new-lead-dialog";

import { CRM_STATUS_CONFIG, CrmStatus } from "@/types/crm";

export const dynamic = "force-dynamic";

interface LeadsPageProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
    websiteStatus?: string;
    priority?: string;
    crmTab?: string;
    sortBy?: "score" | "newest" | "demo_viewed";
    mobile?: string;
    page?: string;
  }>;
}

const PAGE_SIZE = 50;

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
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
      mobileOnly: params.mobile === "1",
      sortBy: params.sortBy || "score",
      isExcluded: isExcludedTab ? true : false,
      crmStatus:
        activeCrmTab === "to_call"
          ? "TO_CALL_OR_NEW"
          : activeCrmTab === "opportunities"
          ? "OPPORTUNITY"
          : undefined,
      followUpDue: activeCrmTab === "follow_ups" ? true : undefined,
      hasDemo: activeCrmTab === "demos" ? true : undefined,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    });
    businesses = res.businesses;
    total = res.total;
  } catch (err: unknown) {
    loadError = err instanceof Error ? err.message : String(err);
  }

  // Builds a /leads URL that keeps every active filter except the ones being changed.
  // Page resets to 1 unless explicitly overridden, since a filter change shrinks the result set.
  const buildHref = (overrides: Partial<Record<keyof typeof params, string | undefined>>) => {
    const merged: Record<string, string | undefined> = { ...params, page: undefined, ...overrides };
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) {
      if (value) qs.set(key, value);
    }
    return `/leads${qs.toString() ? `?${qs.toString()}` : ""}`;
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const segmentClass = (isActive: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
      isActive ? "bg-white text-slate-950 shadow-xs" : "text-slate-500 hover:text-slate-950"
    }`;

  const websiteTabs = [
    { label: "Tüm siteler", value: "" },
    { label: "Site yok", value: "NO_WEBSITE" },
    { label: "Açılmıyor", value: "UNREACHABLE" },
    { label: "Site var", value: "HAS_WEBSITE" },
  ];

  const crmTabs = [
    { label: "Tüm aktifler", value: "all" },
    { label: "Aranacaklar", value: "to_call" },
    { label: "Geri aranacaklar", value: "follow_ups" },
    { label: "Sıcak fırsatlar", value: "opportunities" },
    { label: "Demolar", value: "demos" },
    { label: "Dışlananlar", value: "excluded" },
  ];

  const priorityTabs = [
    { label: "Tüm skorlar", value: "" },
    { label: "HOT", value: "HOT" },
    { label: "WARM", value: "WARM" },
    { label: "COLD", value: "COLD" },
    { label: "Önceliksiz (LOW)", value: "LOW" },
  ];

  const getPriorityBadge = (p: string, score: number) => {
    switch (p) {
      case "HOT":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
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
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-slate-950 tracking-tight">
          İşletmeler <span className="text-slate-400 font-medium">{total}</span>
        </h1>
        <NewLeadDialog />
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
            {params.websiteStatus && <input type="hidden" name="websiteStatus" value={params.websiteStatus} />}
            {params.mobile && <input type="hidden" name="mobile" value={params.mobile} />}
            <div className="relative w-full">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <circle cx="9" cy="9" r="6" />
                <path d="m14 14 4 4" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                name="search"
                defaultValue={params.search || ""}
                placeholder="İşletme adı ara…"
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
                href={buildHref({ search: undefined })}
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
                href={buildHref({ sortBy: undefined })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  (params.sortBy || "score") === "score"
                    ? "bg-white text-slate-950 shadow-xs"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                Skor
              </Link>
              <Link
                href={buildHref({ sortBy: "newest" })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  params.sortBy === "newest"
                    ? "bg-white text-slate-950 shadow-xs"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                En yeni
              </Link>
              <Link
                href={buildHref({ sortBy: "demo_viewed" })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  params.sortBy === "demo_viewed"
                    ? "bg-white text-slate-950 shadow-xs"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                Demo açılışı
              </Link>
            </div>

          </div>
        </div>

        {/* Operational CRM Workflow Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
          {crmTabs.map((tab) => {
            const isActive = activeCrmTab === tab.value;

            return (
              <Link
                key={tab.value}
                href={buildHref({ crmTab: tab.value === "all" ? undefined : tab.value })}
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

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-0.5 bg-slate-100 p-1 rounded-xl">
            {priorityTabs.map((tab) => (
              <Link
                key={tab.value}
                href={buildHref({ priority: tab.value || undefined })}
                className={segmentClass((params.priority || "") === tab.value)}
              >
                {tab.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-0.5 bg-slate-100 p-1 rounded-xl">
            {websiteTabs.map((tab) => (
              <Link
                key={tab.value}
                href={buildHref({ websiteStatus: tab.value || undefined })}
                className={segmentClass((params.websiteStatus || "") === tab.value)}
              >
                {tab.label}
              </Link>
            ))}
          </div>
          <Link
            href={buildHref({ mobile: params.mobile === "1" ? undefined : "1" })}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              params.mobile === "1"
                ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                : "bg-white border-slate-200/90 text-slate-600 hover:border-slate-300 hover:text-slate-950"
            }`}
            title="Sadece cep telefonu olanlar (WhatsApp'tan ulaşılabilir, genelde sahibi açar)"
          >
            {params.mobile === "1" ? "✓ " : ""}Sadece cep
          </Link>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
        {businesses.length === 0 ? (
          <div className="text-center py-20 px-4">
            <h3 className="text-sm font-bold text-slate-900">Bu filtrelerle işletme yok</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Filtreleri gevşet ya da <Link href="/discover" className="text-blue-600 hover:underline">yeni keşif</Link> yap.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200/90">
                <tr>
                  <th className="px-5 py-3.5">Skor</th>
                  <th className="px-5 py-3.5">Durum</th>
                  <th className="px-5 py-3.5">İşletme</th>
                  <th className="px-5 py-3.5">Telefon</th>
                  <th className="px-5 py-3.5">Web</th>
                  <th className="px-5 py-3.5">Puan</th>
                  <th className="px-5 py-3.5"><span className="sr-only">Aksiyonlar</span></th>
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
                              Dışlandı
                            </span>
                          )}

                          {b.demo_url && !b.demo_deleted_at && (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                                b.demo_last_viewed_at
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                              title={b.demo_last_viewed_at ? new Date(b.demo_last_viewed_at).toLocaleString("tr-TR") : undefined}
                            >
                              {b.demo_last_viewed_at
                                ? `Demo ${b.demo_view_count}× açıldı · ${new Date(b.demo_last_viewed_at).toLocaleDateString("tr-TR")}`
                                : b.demo_sent_at
                                ? "Demo gönderildi"
                                : "Demo hazır"}
                            </span>
                          )}

                          {b.next_follow_up_at && (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                isFollowUpDue
                                  ? "bg-rose-100 text-rose-800 border border-rose-200"
                                  : "bg-amber-100 text-amber-800 border border-amber-200"
                              }`}
                              title={new Date(b.next_follow_up_at).toLocaleString("tr-TR")}
                            >
                              {isFollowUpDue ? "Takip gecikti" : `Takip: ${new Date(b.next_follow_up_at).toLocaleDateString("tr-TR")}`}
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
                          {[b.category, b.district || b.city].filter(Boolean).join(" · ")}
                        </div>
                      </td>

                      {/* 4. Contact & Call Tracking */}
                      <td className="px-5 py-4 text-slate-700 whitespace-nowrap">
                        <div className="font-mono font-bold text-xs text-slate-900">
                          {b.phone || <span className="font-sans font-normal text-slate-400">Telefon yok</span>}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {(b.contact_attempts || 0) > 0 ? `${b.contact_attempts} kez arandı` : "Aranmadı"}
                        </div>
                      </td>

                      {/* 5. Website Status */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border whitespace-nowrap ${
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
                            ? "Site var"
                            : b.website_status === "NO_WEBSITE"
                            ? "Site yok"
                            : b.website_status === "UNREACHABLE"
                            ? "Açılmıyor"
                            : "Bilinmiyor"}
                        </span>
                        {b.website_domain && (
                          <div className="text-[11px] text-slate-500 mt-1 truncate max-w-[150px]">
                            {b.website_domain}
                          </div>
                        )}
                      </td>

                      {/* 6. Google Rating */}
                      <td className="px-5 py-4 text-slate-700 whitespace-nowrap">
                        {b.rating ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-amber-500 font-bold">★</span>
                            <span className="font-bold text-slate-900">{b.rating}</span>
                            <span className="text-slate-400 text-xs">
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
                              title="Arama sırasında aç"
                            >
                              <span>Ara</span>
                            </Link>
                          )}
                          <Link
                            href={`/leads/${b.id}`}
                            className="h-8 px-3.5 rounded-lg border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold inline-flex items-center gap-1 transition"
                          >
                            <span>Detay</span>
                            <span className="text-xs">→</span>
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

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6 text-xs font-semibold">
            {page > 1 ? (
              <Link
                href={buildHref({ page: page - 1 > 1 ? String(page - 1) : undefined })}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200/90 text-slate-600 hover:border-slate-300 hover:text-slate-950 transition"
              >
                ← Önceki
              </Link>
            ) : (
              <span className="px-3 py-1.5 rounded-lg border border-slate-100 text-slate-300">← Önceki</span>
            )}
            <span className="font-mono text-slate-600">
              Sayfa {page} / {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                href={buildHref({ page: String(page + 1) })}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200/90 text-slate-600 hover:border-slate-300 hover:text-slate-950 transition"
              >
                Sonraki →
              </Link>
            ) : (
              <span className="px-3 py-1.5 rounded-lg border border-slate-100 text-slate-300">Sonraki →</span>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
