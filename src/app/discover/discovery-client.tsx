"use client";

import { useState } from "react";
import Link from "next/link";
import { runDiscoveryAction } from "./actions";
import { DiscoveredLeadItem, SearchRecord } from "@/services/discovery/types";

interface DiscoveryClientProps {
  initialHistory: SearchRecord[];
}

export function DiscoveryClient({ initialHistory }: DiscoveryClientProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<{
    search: SearchRecord;
    items: DiscoveredLeadItem[];
  } | null>(null);
  const [history, setHistory] = useState<SearchRecord[]>(initialHistory);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    const res = await runDiscoveryAction(formData);

    setLoading(false);
    if (res.success && res.search && res.items) {
      setSearchResult({
        search: res.search,
        items: res.items,
      });
      setHistory((prev) => [res.search, ...prev.slice(0, 9)]);
    } else {
      setErrorMessage(res.error || "Keşif çalıştırılırken bilinmeyen bir hata oluştu.");
    }
  }

  return (
    <div className="space-y-8">
      {/* Discovery Query Form */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="border-b border-slate-200 pb-4 mb-6">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Yeni Keşif Başlat</h2>
          <p className="text-xs text-slate-500 mt-1">
            Konum, ilçe ve sektör kriterlerini girerek seçili kaynaklardan işletmeleri bulun ve otomatik tekilleştirin.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Şehir / Konum *
              </label>
              <input
                name="location"
                required
                defaultValue="İstanbul"
                placeholder="Örn: İstanbul"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                İlçe (İsteğe bağlı)
              </label>
              <input
                name="district"
                defaultValue="Kadıköy"
                placeholder="Örn: Kadıköy"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Sektör / Kategori *
              </label>
              <input
                name="sector"
                required
                defaultValue="Diş Kliniği"
                placeholder="Örn: Diş Kliniği, Mimar, Cafe"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Sorgulanacak Kaynaklar
            </label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center space-x-2 bg-slate-50 border border-slate-300 px-3 py-2 rounded-lg text-xs text-slate-800 cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  name="source_maps"
                  defaultChecked
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span className="font-medium">Google Haritalar</span>
              </label>
              <label className="flex items-center space-x-2 bg-slate-50 border border-slate-300 px-3 py-2 rounded-lg text-xs text-slate-800 cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  name="source_search"
                  defaultChecked
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span className="font-medium">Google Arama</span>
              </label>
              <label className="flex items-center space-x-2 bg-slate-50 border border-slate-300 px-3 py-2 rounded-lg text-xs text-slate-800 cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  name="source_instagram"
                  defaultChecked
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span className="font-medium">Instagram</span>
              </label>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {errorMessage}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs px-5 py-2.5 rounded-lg transition shadow-sm flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Keşfediliyor ve İşleniyor...</span>
                </>
              ) : (
                <span>Keşfi Başlat →</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Discovery Results View */}
      {searchResult && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Keşif Tamamlandı
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-1">
                {searchResult.search.location} {searchResult.search.district ? `(${searchResult.search.district})` : ""} — {searchResult.search.sector}
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg font-medium text-slate-700">
                Toplam Ham: <strong className="text-slate-900">{searchResult.search.raw_count}</strong>
              </span>
              <span className="bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg font-medium text-slate-700">
                Tekil İşletme: <strong className="text-slate-900">{searchResult.search.unique_count}</strong>
              </span>
              <span className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg font-medium text-emerald-800">
                Yeni Eklenen: <strong>{searchResult.search.new_count}</strong>
              </span>
              <span className="bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg font-medium text-blue-800">
                Zaten Kayıtlı: <strong>{searchResult.search.existing_count}</strong>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Durum</th>
                  <th className="px-4 py-3 font-semibold">İşletme Adı</th>
                  <th className="px-4 py-3 font-semibold">Kaynak</th>
                  <th className="px-4 py-3 font-semibold">İletişim</th>
                  <th className="px-4 py-3 font-semibold">Web Durumu</th>
                  <th className="px-4 py-3 font-semibold text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {searchResult.items.map((item, idx) => (
                  <tr key={`${item.business.id}-${idx}`} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3.5">
                      {item.isNew ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          YENİ
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          MEVCUT {item.matchedBy ? `(${item.matchedBy})` : ""}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900">{item.business.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{item.business.address || "—"}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded uppercase">
                        {item.provider.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">
                      <div>{item.business.phone || "—"}</div>
                      {item.business.instagram && (
                        <div className="text-[11px] text-pink-600 mt-0.5 font-medium">
                          @{item.business.instagram_normalized || item.business.instagram}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${
                          item.business.website_status === "HAS_WEBSITE"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : item.business.website_status === "NO_WEBSITE"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {item.business.website_status === "HAS_WEBSITE"
                          ? "SİTE VAR"
                          : item.business.website_status === "NO_WEBSITE"
                          ? "SİTE YOK"
                          : "BİLİNMİYOR"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href={`/leads/${item.business.id}`}
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
        </div>
      )}

      {/* Search History Section */}
      {history.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
            Son Keşif Geçmişi ({history.length})
          </h3>
          <div className="divide-y divide-slate-100">
            {history.map((s) => (
              <div key={s.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-900">
                    {s.location} {s.district ? `(${s.district})` : ""} — {s.sector}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {new Date(s.created_at).toLocaleString("tr-TR")} • Kaynaklar: {s.sources.join(", ")}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-600">
                    <strong>{s.unique_count}</strong> tekil (<strong>{s.new_count}</strong> yeni, <strong>{s.existing_count}</strong> mevcut)
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                      s.status === "completed"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {s.status === "completed" ? "TAMAMLANDI" : s.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
