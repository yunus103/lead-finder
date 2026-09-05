"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { runDiscoveryAction, saveSelectedLeadsAction, loadPastSearchAction } from "./actions";
import { DiscoveredCandidateLead, SearchRecord } from "@/services/discovery/types";
import { TURKISH_CITIES, TURKISH_DISTRICTS } from "@/data/turkey-locations";
import { SECTOR_PRESETS } from "@/data/sector-presets";

const CACHE_STORAGE_KEY = "lead_finder_active_discovery";

interface DiscoveryClientProps {
  initialHistory: SearchRecord[];
}

export function DiscoveryClient({ initialHistory }: DiscoveryClientProps) {
  const [loading, setLoading] = useState(false);
  const [savingLeads, setSavingLeads] = useState(false);
  const [loadingSearchId, setLoadingSearchId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [searchResult, setSearchResult] = useState<{
    search: SearchRecord;
    items: DiscoveredCandidateLead[];
  } | null>(null);

  const [history, setHistory] = useState<SearchRecord[]>(initialHistory);
  const [selectedCity, setSelectedCity] = useState<string>("İstanbul");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("Kadıköy");
  const [selectedPresetId, setSelectedPresetId] = useState<string>("dental");
  const [customSector, setCustomSector] = useState<string>("");

  // Checkbox selection state
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());

  const availableDistricts = TURKISH_DISTRICTS[selectedCity] || [];

  // Restore cached discovery search on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.search && Array.isArray(parsed?.items)) {
          setSearchResult(parsed);
          // Default: check all items that are not already saved
          const newIds = parsed.items
            .filter((item: DiscoveredCandidateLead) => !item.already_saved)
            .map((item: DiscoveredCandidateLead) => item.tempId);
          setSelectedLeadIds(new Set(newIds));
        }
      }
    } catch {
      // LocalStorage error fallback
    }
  }, []);

  function handleCityChange(city: string) {
    setSelectedCity(city);
    const districts = TURKISH_DISTRICTS[city] || [];
    setSelectedDistrict(districts[0] || "");
  }

  function toggleSelectAll() {
    if (!searchResult) return;
    const selectable = searchResult.items.filter((item) => !item.already_saved);
    const allSelected =
      selectable.length > 0 && selectable.every((item) => selectedLeadIds.has(item.tempId));

    if (allSelected) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(selectable.map((i) => i.tempId)));
    }
  }

  function toggleItem(tempId: string) {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(tempId)) {
        next.delete(tempId);
      } else {
        next.add(tempId);
      }
      return next;
    });
  }

  function handleClearDiscovery() {
    if (confirm("Mevcut arama sonuçlarını ve seçimlerinizi ekrandan temizlemek istediğinize emin misiniz?")) {
      setSearchResult(null);
      setSelectedLeadIds(new Set());
      setSaveMessage(null);
      try {
        localStorage.removeItem(CACHE_STORAGE_KEY);
      } catch {}
    }
  }

  async function handleLoadPastSearch(searchId: string) {
    setLoadingSearchId(searchId);
    setErrorMessage(null);
    setSaveMessage(null);
    const res = await loadPastSearchAction(searchId);
    setLoadingSearchId(null);
    if (res.success && res.search && res.items && res.items.length > 0) {
      const loadedResult = {
        search: res.search,
        items: res.items,
      };
      setSearchResult(loadedResult);
      // Select all non-saved items by default
      const defaultSelected = res.items
        .filter((item) => !item.already_saved)
        .map((item) => item.tempId);
      setSelectedLeadIds(new Set(defaultSelected));

      try {
        localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(loadedResult));
      } catch {}

      window.scrollTo({ top: 380, behavior: "smooth" });
    } else {
      alert(
        res.error ||
          "Bu geçmiş aramaya ait kaydedilmiş aday işletme detayı bulunamadı (Önceki aramalar boş kaydedilmiş olabilir)."
      );
    }
  }


  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSaveMessage(null);

    const formData = new FormData(e.currentTarget);

    // Resolve sector from preset or custom input
    let finalSector = "";
    if (selectedPresetId === "custom") {
      finalSector = customSector.trim();
    } else {
      const found = SECTOR_PRESETS.flatMap((g) => g.presets).find((p) => p.id === selectedPresetId);
      finalSector = found?.searchTerm || "Diş Kliniği";
    }

    if (!finalSector) {
      setLoading(false);
      setErrorMessage("Lütfen geçerli bir sektör seçin veya yazın.");
      return;
    }

    formData.set("sector", finalSector);

    const res = await runDiscoveryAction(formData);

    setLoading(false);
    if (res.success && res.search && res.items) {
      const newResult = {
        search: res.search,
        items: res.items,
      };
      setSearchResult(newResult);
      setHistory((prev) => [res.search, ...prev.slice(0, 9)]);

      // Check all non-saved items by default
      const defaultSelected = res.items
        .filter((item) => !item.already_saved)
        .map((item) => item.tempId);
      setSelectedLeadIds(new Set(defaultSelected));

      // Persist to localStorage
      try {
        localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(newResult));
      } catch {}
    } else {
      setErrorMessage(res.error || "Keşif çalıştırılırken bilinmeyen bir hata oluştu.");
    }
  }

  async function handleSaveSelected() {
    if (!searchResult || selectedLeadIds.size === 0) return;
    setSavingLeads(true);
    setSaveMessage(null);

    const leadsToSave = searchResult.items.filter((item) => selectedLeadIds.has(item.tempId));
    const res = await saveSelectedLeadsAction(leadsToSave);
    setSavingLeads(false);

    if (res.success) {
      setSaveMessage(`${res.savedCount} işletme başarıyla kaydedildi!`);

      // Update in-memory state: mark saved items as already_saved
      const savedMap = new Map<string, string>();
      if (res.savedIds && res.savedIds.length === leadsToSave.length) {
        leadsToSave.forEach((lead, idx) => {
          savedMap.set(lead.tempId, res.savedIds![idx]);
        });
      }

      const updatedItems = searchResult.items.map((item) => {
        if (selectedLeadIds.has(item.tempId)) {
          return {
            ...item,
            already_saved: true,
            existing_business_id: savedMap.get(item.tempId) || item.existing_business_id,
          };
        }
        return item;
      });

      const updatedResult = {
        ...searchResult,
        items: updatedItems,
      };

      setSearchResult(updatedResult);
      setSelectedLeadIds(new Set());

      try {
        localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(updatedResult));
      } catch {}
    } else {
      alert("Kaydetme sırasında bir hata oluştu: " + (res.error || "Bilinmeyen hata"));
    }
  }

  const selectableItems = searchResult?.items.filter((item) => !item.already_saved) || [];
  const allSelected =
    selectableItems.length > 0 && selectableItems.every((item) => selectedLeadIds.has(item.tempId));

  return (
    <div className="space-y-8">
      {/* Discovery Query Form */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="border-b border-slate-200 pb-4 mb-6">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Yeni Keşif Başlat</h2>
          <p className="text-xs text-slate-500 mt-1">
            Konum ve sektör seçerek işletmeleri bulun, anında skorlayın ve sadece istediğiniz işletmeleri listenize kaydedin.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Şehir / İl *
              </label>
              <select
                name="location"
                required
                value={selectedCity}
                onChange={(e) => handleCityChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white cursor-pointer"
              >
                {TURKISH_CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                İlçe (İsteğe bağlı)
              </label>
              <select
                name="district"
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white cursor-pointer"
              >
                <option value="">Tümü / Belirtilmemiş</option>
                {availableDistricts.map((dist) => (
                  <option key={dist} value={dist}>
                    {dist}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Sektör / Kategori *
              </label>
              <select
                value={selectedPresetId}
                onChange={(e) => setSelectedPresetId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white cursor-pointer"
              >
                {SECTOR_PRESETS.map((group) => (
                  <optgroup key={group.groupName} label={group.groupName}>
                    {group.presets.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
                <optgroup label="Özel Arama">
                  <option value="custom">Diğer / Özel Arama (Serbest Metin)...</option>
                </optgroup>
              </select>

              {selectedPresetId === "custom" && (
                <input
                  required
                  value={customSector}
                  onChange={(e) => setCustomSector(e.target.value)}
                  placeholder="Örn: Butik Otel, Dövme Stüdyosu..."
                  className="w-full mt-2 bg-white border border-emerald-500 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Hedef İşletme Sayısı (Google Maps Sayfalama)
              </label>
              <select
                name="limit"
                defaultValue="20"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white"
              >
                <option value="20">20 İşletme (Hızlı / 1 Sayfa)</option>
                <option value="40">40 İşletme (Orta / 2 Sayfa - ~3 sn)</option>
                <option value="60">60 İşletme (Maksimum / 3 Sayfa - ~6 sn)</option>
              </select>
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
                  <span>Haritalar Taranıyor ve Skorlanıyor...</span>
                </>
              ) : (
                <span>Keşfi Başlat →</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Discovery Results Sandbox View */}
      {searchResult && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Keşif Tamamlandı (Önizleme)
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-1">
                {searchResult.search.location} {searchResult.search.district ? `(${searchResult.search.district})` : ""} — {searchResult.search.sector}
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg font-medium text-slate-700">
                Bulunan İşletme: <strong className="text-slate-900">{searchResult.items.length}</strong>
              </span>
              <span className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg font-medium text-emerald-800">
                Yeni Aday: <strong>{selectableItems.length}</strong>
              </span>
              <span className="bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg font-medium text-blue-800">
                Zaten Listede: <strong>{searchResult.items.length - selectableItems.length}</strong>
              </span>
            </div>
          </div>

          {/* Action & Batch Save Bar */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-emerald-950 flex items-center gap-2">
                <span>{selectedLeadIds.size} / {selectableItems.length} Yeni İşletme Seçildi</span>
                {saveMessage && (
                  <span className="text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                    ✓ {saveMessage}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                İşaretlediğiniz işletmeler tek tıkla CRM listenize aktarılır. İşaretsiz işletmeler veri tabanınızı kirletmez.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearDiscovery}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 transition"
              >
                Sonuçları Temizle
              </button>
              <button
                type="button"
                disabled={savingLeads || selectedLeadIds.size === 0}
                onClick={handleSaveSelected}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs px-5 py-2 rounded-lg shadow-sm transition flex items-center space-x-2"
              >
                {savingLeads ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Kaydediliyor ({selectedLeadIds.size})...</span>
                  </>
                ) : (
                  <span>Seçilenleri Kaydet ({selectedLeadIds.size}) →</span>
                )}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-3 py-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      disabled={selectableItems.length === 0}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                      title="Tümünü Seç / Kaldır"
                    />
                  </th>
                  <th className="px-3 py-3 font-semibold">Durum</th>
                  <th className="px-3 py-3 font-semibold">Öncelik & Skor</th>
                  <th className="px-4 py-3 font-semibold">İşletme Adı & Konum</th>
                  <th className="px-4 py-3 font-semibold">İletişim</th>
                  <th className="px-4 py-3 font-semibold">Web Durumu & Fırsat Sinyalleri</th>
                  <th className="px-4 py-3 font-semibold text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {searchResult.items.map((item) => {
                  const isChecked = selectedLeadIds.has(item.tempId);
                  return (
                    <tr
                      key={item.tempId}
                      onClick={() => !item.already_saved && toggleItem(item.tempId)}
                      className={`hover:bg-slate-50/80 transition cursor-pointer ${
                        isChecked ? "bg-emerald-50/40" : ""
                      } ${item.already_saved ? "opacity-75 cursor-default bg-slate-50/30" : ""}`}
                    >
                      <td className="px-3 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={item.already_saved}
                          onChange={() => toggleItem(item.tempId)}
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer disabled:opacity-30"
                        />
                      </td>

                      <td className="px-3 py-3.5 whitespace-nowrap">
                        {item.already_saved ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            ZATEN LİSTEDE
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            YENİ ADAY
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold border ${
                            item.priority === "HOT"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : item.priority === "WARM"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : item.priority === "COLD"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {item.priority} ({item.lead_score})
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">{item.name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                          {item.address || "—"}
                        </div>
                        {(item.rating || item.review_count > 0) && (
                          <div className="text-[10px] text-amber-600 font-medium mt-0.5">
                            ⭐ {item.rating || 0} ({item.review_count} Yorum)
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-slate-700 whitespace-nowrap">
                        <div>{item.phone || "—"}</div>
                        {item.instagram && (
                          <div className="text-[11px] text-pink-600 mt-0.5 font-medium">
                            @{item.instagram}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                                item.website_status === "HAS_WEBSITE"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : item.website_status === "NO_WEBSITE"
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              {item.website_status === "HAS_WEBSITE"
                                ? "SİTE VAR"
                                : item.website_status === "NO_WEBSITE"
                                ? "SİTE YOK (FIRSAT)"
                                : "ERİŞİLEMEZ"}
                            </span>
                            {item.website && (
                              <a
                                href={item.website}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-[11px] text-blue-600 hover:underline truncate max-w-[140px]"
                              >
                                {item.website.replace(/^https?:\/\/(www\.)?/, "")}
                              </a>
                            )}
                          </div>

                          {/* Quick flaw signals for pitches */}
                          {item.website_status === "HAS_WEBSITE" && item.audit_preview && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {!item.audit_preview.has_viewport && (
                                <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[9px] font-semibold px-1.5 py-0.2 rounded">
                                  Mobil Uyumsuz
                                </span>
                              )}
                              {!item.audit_preview.has_whatsapp && (
                                <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-semibold px-1.5 py-0.2 rounded">
                                  WhatsApp Butonu Yok
                                </span>
                              )}
                              {!item.audit_preview.is_https && (
                                <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[9px] font-semibold px-1.5 py-0.2 rounded">
                                  Güvensiz (SSL Yok)
                                </span>
                              )}
                              {item.audit_preview.response_time_ms > 2000 && (
                                <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-semibold px-1.5 py-0.2 rounded">
                                  Yavaş ({(item.audit_preview.response_time_ms / 1000).toFixed(1)}s)
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {item.already_saved && item.existing_business_id ? (
                          <Link
                            href={`/leads/${item.existing_business_id}`}
                            className="text-emerald-600 hover:text-emerald-700 font-semibold hover:underline"
                          >
                            İncele →
                          </Link>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Kaydedilmedi</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
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
                    <strong>{s.unique_count}</strong> bulunan (<strong>{s.new_count}</strong> yeni, <strong>{s.existing_count}</strong> listede)
                  </span>
                  <button
                    type="button"
                    disabled={loadingSearchId === s.id}
                    onClick={() => handleLoadPastSearch(s.id)}
                    className="text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded text-[11px] font-semibold transition disabled:opacity-50 cursor-pointer"
                  >
                    {loadingSearchId === s.id ? "Yükleniyor..." : "Sonuçları Göster"}
                  </button>
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
