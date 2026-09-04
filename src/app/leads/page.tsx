import Link from "next/link";
import { getBusinesses } from "@/services/business-service";
import { NewLeadDialog } from "./new-lead-dialog";

export const dynamic = "force-dynamic";

interface LeadsPageProps {
  searchParams: Promise<{ search?: string; category?: string; websiteStatus?: string }>;
}

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const params = await searchParams;
  let businesses: Awaited<ReturnType<typeof getBusinesses>>["businesses"] = [];
  let total = 0;
  let loadError: string | null = null;

  try {
    const res = await getBusinesses({
      search: params.search,
      category: params.category,
      websiteStatus: params.websiteStatus,
    });
    businesses = res.businesses;
    total = res.total;
  } catch (err: unknown) {
    loadError = err instanceof Error ? err.message : String(err);
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            İşletmeler ve Potansiyel Müşteriler
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tüm keşif kaynaklarından toplanan, tekilleştirilen ve zenginleştirilen kurumsal kayıtlar
          </p>
        </div>
        <div className="flex items-center gap-3">
          <NewLeadDialog />
        </div>
      </div>

      {loadError && (
        <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
          <strong>Veritabanı Uyarısı:</strong> {loadError}
          <div className="mt-1 text-slate-500">
            Lütfen SQL migrasyonunun Supabase SQL Editöründe çalıştırıldığından emin olun.
          </div>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="mb-6 bg-white border border-slate-200 p-3 rounded-xl shadow-sm flex items-center justify-between">
        <form method="GET" className="flex items-center space-x-3 w-full max-w-md">
          <input
            type="text"
            name="search"
            defaultValue={params.search || ""}
            placeholder="İşletme adına göre ara..."
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white w-full"
          />
          <button
            type="submit"
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium px-4 py-1.5 rounded-lg transition"
          >
            Ara
          </button>
          {params.search && (
            <Link
              href="/leads"
              className="text-xs text-slate-500 hover:text-slate-900 transition"
            >
              Temizle
            </Link>
          )}
        </form>
        <div className="text-xs text-slate-500">
          Toplam <span className="text-slate-900 font-semibold">{total}</span> işletmeden{" "}
          <span className="text-slate-900 font-semibold">{businesses.length}</span> tanesi gösteriliyor
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {businesses.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-slate-400 text-lg mb-3">
              🏢
            </div>
            <h3 className="text-sm font-semibold text-slate-800">Henüz kayıtlı işletme bulunamadı</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Arama kriterlerinize uyan kayıt yok. Yukarıdaki &quot;+ Test İşletme Ekle&quot; butonunu kullanarak test kaydı oluşturabilir veya sonraki aşamalarda otomatik keşif yapabilirsiniz.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">İşletme</th>
                  <th className="px-4 py-3 font-semibold">Konum</th>
                  <th className="px-4 py-3 font-semibold">İletişim</th>
                  <th className="px-4 py-3 font-semibold">Web Sitesi</th>
                  <th className="px-4 py-3 font-semibold">Puan / Yorum</th>
                  <th className="px-4 py-3 font-semibold text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {businesses.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900">{b.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {b.category || "Kategori Belirtilmemiş"}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">
                      <div>{b.city || "—"}</div>
                      <div className="text-[11px] text-slate-400">{b.district || ""}</div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">
                      <div>{b.phone || "—"}</div>
                      {b.instagram && (
                        <div className="text-[11px] text-pink-600 mt-0.5 font-medium">
                          @{b.instagram_normalized || b.instagram}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${
                          b.website_status === "HAS_WEBSITE"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : b.website_status === "NO_WEBSITE"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {b.website_status === "HAS_WEBSITE"
                          ? "SİTE VAR"
                          : b.website_status === "NO_WEBSITE"
                          ? "SİTE YOK"
                          : "BİLİNMİYOR"}
                      </span>
                      {b.website_domain && (
                        <div className="text-[11px] text-slate-500 mt-1 truncate max-w-[150px]">
                          {b.website_domain}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">
                      {b.rating ? (
                        <div className="flex items-center space-x-1">
                          <span className="text-amber-500 font-bold">★</span>
                          <span className="font-semibold text-slate-800">{b.rating}</span>
                          <span className="text-slate-400 text-[10px]">
                            ({b.review_count || 0})
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href={`/leads/${b.id}`}
                        className="text-emerald-600 hover:text-emerald-700 font-semibold hover:underline"
                      >
                        İncele →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
