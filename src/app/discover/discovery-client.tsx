"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { runDiscoveryAction, saveSelectedLeadsAction, loadPastSearchAction } from "./actions";
import { DiscoveredCandidateLead, SearchRecord } from "@/services/discovery/types";
import { TURKISH_CITIES, TURKISH_DISTRICTS } from "@/data/turkey-locations";
import { SECTOR_PRESETS } from "@/data/sector-presets";
import { auditHealth, isOutdatedYear } from "@/lib/site-analysis";
import { PHONE_TYPE_LABEL } from "@/lib/outreach";

const CACHE_STORAGE_KEY = "lead_finder_active_discovery";

interface ResultFilters {
  onlyOpportunities: boolean;
  onlyMobile: boolean;
  hideChains: boolean;
  hideSaved: boolean;
  minReviews: number;
}

const DEFAULT_FILTERS: ResultFilters = {
  onlyOpportunities: false,
  onlyMobile: false,
  hideChains: false,
  hideSaved: false,
  minReviews: 0,
};

function matchesFilters(item: DiscoveredCandidateLead, f: ResultFilters): boolean {
  if (f.onlyOpportunities && item.priority !== "HOT" && item.priority !== "WARM") return false;
  if (f.onlyMobile && item.phone_type !== "mobile") return false;
  if (f.hideChains && item.chain_suspect) return false;
  if (f.hideSaved && item.already_saved) return false;
  if (item.review_count < f.minReviews) return false;
  return true;
}

/** Leads worth calling by default: strong score and not a chain branch. */
function defaultSelection(items: DiscoveredCandidateLead[]): Set<string> {
  return new Set(
    items
      .filter((i) => !i.already_saved && !i.chain_suspect && (i.priority === "HOT" || i.priority === "WARM"))
      .map((i) => i.tempId)
  );
}

type Signal = { label: string; tone: "bad" | "warn" | "info" };

function websiteSignals(item: DiscoveredCandidateLead): Signal[] {
  const signals: Signal[] = [];
  if (item.presence_note) signals.push({ label: item.presence_note, tone: "bad" });

  const audit = item.audit;
  if (audit) {
    const health = auditHealth(audit);
    const d = audit.deep_audit_data;
    if (health !== "ok") {
      signals.push({
        label: d?.healthDetail || (health === "protected" ? "Korumalı site" : "Açılmıyor"),
        tone: health === "protected" ? "info" : "bad",
      });
      return signals;
    }
    if (d?.sslIssue === "expired" || d?.sslIssue === "invalid") signals.push({ label: "SSL Uyarısı", tone: "bad" });
    else if (!audit.is_https) signals.push({ label: "HTTPS Yok", tone: "bad" });
    if (!audit.has_viewport) signals.push({ label: "Mobil Uyumsuz", tone: "bad" });
    if (isOutdatedYear(d?.copyrightYear)) signals.push({ label: `Eski Site (${d?.copyrightYear})`, tone: "warn" });
    if (d && !d.hasWhatsApp) signals.push({ label: "WhatsApp Yok", tone: "warn" });
    return signals;
  }

  const legacy = item.audit_preview;
  if (item.website_status === "HAS_WEBSITE" && legacy) {
    if (!legacy.has_viewport) signals.push({ label: "Mobil Uyumsuz", tone: "bad" });
    if (!legacy.is_https) signals.push({ label: "HTTPS Yok", tone: "bad" });
    if (!legacy.has_whatsapp) signals.push({ label: "WhatsApp Yok", tone: "warn" });
  }
  return signals;
}

const SIGNAL_TONE_CLASS: Record<Signal["tone"], string> = {
  bad: "bg-rose-50 text-rose-700 border-rose-200/80",
  warn: "bg-amber-50 text-amber-800 border-amber-200/80",
  info: "bg-slate-100 text-slate-600 border-slate-200",
};

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
  const [filters, setFilters] = useState<ResultFilters>(DEFAULT_FILTERS);

  const availableDistricts = TURKISH_DISTRICTS[selectedCity] || [];

  // Restore cached discovery search on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.search && Array.isArray(parsed?.items)) {
          setSearchResult(parsed);
          setSelectedLeadIds(defaultSelection(parsed.items));
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
    const selectable = searchResult.items.filter((item) => !item.already_saved && matchesFilters(item, filters));
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
      setSelectedLeadIds(defaultSelection(res.items));

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

      setSelectedLeadIds(defaultSelection(res.items));

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

      const idsByTempId = res.idsByTempId || {};
      const updatedItems = searchResult.items.map((item) =>
        idsByTempId[item.tempId]
          ? { ...item, already_saved: true, existing_business_id: idsByTempId[item.tempId] }
          : item
      );

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
  const visibleItems = searchResult?.items.filter((item) => matchesFilters(item, filters)) || [];
  const visibleSelectable = visibleItems.filter((item) => !item.already_saved);
  const allSelected =
    visibleSelectable.length > 0 && visibleSelectable.every((item) => selectedLeadIds.has(item.tempId));

  return (
    <div className="space-y-8">
      {/* Discovery Query Form */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="border-b border-slate-100 pb-5 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
              ● Harita & Web Motoru
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-950 tracking-tight">Yeni Keşif Başlat</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
            Konum ve sektör seçerek işletmeleri bulun, anında skorlayın ve sadece istediğiniz işletmeleri listenize kaydedin.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">
                Şehir / İl *
              </label>
              <select
                name="location"
                required
                value={selectedCity}
                onChange={(e) => handleCityChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition cursor-pointer"
              >
                {TURKISH_CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">
                İlçe (İsteğe bağlı)
              </label>
              <select
                name="district"
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition cursor-pointer"
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
              <label className="block text-xs font-bold text-slate-800 mb-2">
                Sektör / Kategori *
              </label>
              <select
                value={selectedPresetId}
                onChange={(e) => setSelectedPresetId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition cursor-pointer"
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
                  className="w-full mt-2 bg-white border border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">
                Aktif Keşif Kaynağı
              </label>
              <input type="hidden" name="source_maps" value="on" />
              <div className="flex items-center space-x-2.5 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-xs text-slate-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-bold text-slate-900">Google Haritalar & Yerel Ağ</span>
                <span className="text-[10px] font-mono text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded ml-auto">
                  Canlı API
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">
                Hedef İşletme Sayısı (Google Maps Sayfalama)
              </label>
              <select
                name="limit"
                defaultValue="20"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition cursor-pointer"
              >
                <option value="20">20 İşletme (Hızlı / 1 Sayfa)</option>
                <option value="40">40 İşletme (2 Sayfa)</option>
                <option value="60">60 İşletme (Maksimum / 3 Sayfa)</option>
              </select>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {errorMessage}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-bold text-xs px-6 py-3 rounded-xl transition shadow-xs flex items-center space-x-2"
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
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-mono">
                ✓ Keşif Tamamlandı (Önizleme Havuzu)
              </span>
              <h3 className="text-xl font-extrabold text-slate-950 mt-1.5 tracking-tight">
                {searchResult.search.location} {searchResult.search.district ? `(${searchResult.search.district})` : ""} — {searchResult.search.sector}
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="bg-slate-50 border border-slate-200/80 px-3.5 py-1.5 rounded-xl font-mono text-slate-700">
                Bulunan: <strong className="text-slate-950 font-bold">{searchResult.items.length}</strong>
              </span>
              <span className="bg-emerald-50 border border-emerald-200/80 px-3.5 py-1.5 rounded-xl font-mono text-emerald-800">
                Yeni Aday: <strong className="font-bold">{selectableItems.length}</strong>
              </span>
              <span className="bg-slate-100 border border-slate-200/80 px-3.5 py-1.5 rounded-xl font-mono text-slate-700">
                Listede: <strong className="font-bold">{searchResult.items.length - selectableItems.length}</strong>
              </span>
            </div>
          </div>

          {/* Action & Batch Save Bar */}
          <div className="bg-slate-950 text-white rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2.5">
                <span>{selectedLeadIds.size} / {selectableItems.length} Yeni İşletme Seçildi</span>
                {saveMessage && (
                  <span className="text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2.5 py-0.5 rounded-md text-xs font-semibold">
                    ✓ {saveMessage}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                İşaretlediğiniz işletmeler tek tıkla CRM listenize aktarılır. Listenizde olanlar tekrar eklenmez.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 w-full md:w-auto">
              <button
                type="button"
                onClick={handleClearDiscovery}
                className="text-xs font-semibold text-slate-300 hover:text-white px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 transition text-center"
              >
                Sonuçları Temizle
              </button>
              <button
                type="button"
                disabled={savingLeads || selectedLeadIds.size === 0}
                onClick={handleSaveSelected}
                className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs transition flex items-center justify-center space-x-2"
              >
                {savingLeads ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Kaydediliyor ({selectedLeadIds.size})...</span>
                  </>
                ) : (
                  <span>Seçilenleri CRM&apos;e Aktar ({selectedLeadIds.size}) →</span>
                )}
              </button>
            </div>
          </div>

          {/* Result Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-slate-500 mr-1">Filtrele:</span>
            {(
              [
                ["onlyOpportunities", "Sadece HOT/WARM"],
                ["onlyMobile", "Sadece cep telefonu"],
                ["hideChains", "Zincirleri gizle"],
                ["hideSaved", "Listedekileri gizle"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilters((f) => ({ ...f, [key]: !f[key] }))}
                className={`px-3 py-1.5 rounded-lg font-semibold border transition ${
                  filters[key]
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
              >
                {label}
              </button>
            ))}
            <select
              value={filters.minReviews}
              onChange={(e) => setFilters((f) => ({ ...f, minReviews: Number(e.target.value) }))}
              className="px-3 py-1.5 rounded-lg font-semibold border border-slate-200 bg-white text-slate-600 cursor-pointer"
            >
              <option value={0}>Min. yorum: yok</option>
              <option value={5}>Min. 5 yorum</option>
              <option value={20}>Min. 20 yorum</option>
              <option value={50}>Min. 50 yorum</option>
            </select>
            <span className="ml-auto font-mono text-slate-500">
              Gösterilen: <strong className="text-slate-900">{visibleItems.length}</strong> / {searchResult.items.length}
            </span>
          </div>

          <div className="border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200/90">
                  <tr>
                    <th className="px-4 py-3.5 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        disabled={visibleSelectable.length === 0}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                        title="Tümünü Seç / Kaldır"
                      />
                    </th>
                    <th className="px-4 py-3.5">Durum</th>
                    <th className="px-4 py-3.5">Öncelik & Skor</th>
                    <th className="px-5 py-3.5">İşletme Adı & Konum</th>
                    <th className="px-5 py-3.5">İletişim</th>
                    <th className="px-5 py-3.5">Web Durumu & Fırsat Sinyalleri</th>
                    <th className="px-5 py-3.5 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleItems.map((item) => {
                    const signals = websiteSignals(item);
                    const isChecked = selectedLeadIds.has(item.tempId);
                    return (
                      <tr
                        key={item.tempId}
                        onClick={() => !item.already_saved && toggleItem(item.tempId)}
                        className={`hover:bg-slate-50/60 transition cursor-pointer ${
                          isChecked ? "bg-blue-50/40" : ""
                        } ${item.already_saved ? "opacity-75 cursor-default bg-slate-50/30" : ""}`}
                      >
                        <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={item.already_saved}
                            onChange={() => toggleItem(item.tempId)}
                            className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer disabled:opacity-30"
                          />
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap">
                          {item.already_saved ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                              LİSTEDE
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                              YENİ ADAY
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-bold border ${
                              item.priority === "HOT"
                                ? "bg-rose-100 text-rose-800 border-rose-200"
                                : item.priority === "WARM"
                                ? "bg-amber-100 text-amber-800 border-amber-200"
                                : item.priority === "COLD"
                                ? "bg-blue-100 text-blue-800 border-blue-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            {item.priority} ({item.lead_score})
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="font-bold text-sm text-slate-950 flex items-center gap-2 flex-wrap">
                            {item.name}
                            {item.chain_suspect && (
                              <span
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700"
                                title="Aynı isim sonuçlarda birden fazla geçiyor veya 0850/444 hattı kullanıyor"
                              >
                                ZİNCİR?
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                            {item.address || "—"}
                          </div>
                          {(item.rating || item.review_count > 0) && (
                            <div className="text-xs text-amber-600 font-semibold mt-1">
                              ⭐ {item.rating || 0} <span className="text-slate-400 font-normal">({item.review_count} Yorum)</span>
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4 text-slate-700 whitespace-nowrap">
                          <div className="font-mono font-bold text-xs text-slate-900">{item.phone || "—"}</div>
                          {item.phone && item.phone_type && (
                            <div
                              className={`text-[10px] font-semibold mt-0.5 ${
                                item.phone_type === "mobile"
                                  ? "text-emerald-700"
                                  : item.phone_type === "corporate"
                                  ? "text-rose-600"
                                  : "text-slate-500"
                              }`}
                            >
                              {PHONE_TYPE_LABEL[item.phone_type]}
                            </div>
                          )}
                          {item.instagram && (
                            <div className="text-xs text-pink-600 mt-0.5 font-semibold">
                              @{item.instagram}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="space-y-1.5">
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
                                  className="text-xs font-mono text-blue-600 hover:underline truncate max-w-[160px]"
                                >
                                  {item.website.replace(/^https?:\/\/(www\.)?/, "")}
                                </a>
                              )}
                            </div>

                            {signals.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {signals.map((sig) => (
                                  <span
                                    key={sig.label}
                                    className={`border text-[10px] font-semibold px-2 py-0.5 rounded-md ${SIGNAL_TONE_CLASS[sig.tone]}`}
                                  >
                                    {sig.label}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          {item.already_saved && item.existing_business_id ? (
                            <Link
                              href={`/leads/${item.existing_business_id}`}
                              className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
                            >
                              İncele →
                            </Link>
                          ) : (
                            <span className="text-slate-400 text-xs italic">Kaydedilmedi</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Search History Section */}
      {history.length > 0 && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-950 tracking-tight">
              Son Keşif Geçmişi ({history.length})
            </h3>
            <span className="text-xs font-mono text-slate-400">Arşiv</span>
          </div>

          <div className="divide-y divide-slate-100">
            {history.map((s) => (
              <div key={s.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-sm text-slate-950">
                    {s.location} {s.district ? `(${s.district})` : ""} — {s.sector}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {new Date(s.created_at).toLocaleString("tr-TR")} • Kaynaklar: {s.sources.join(", ")}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-slate-600 font-mono text-xs">
                    <strong>{s.unique_count}</strong> bulunan (<strong>{s.new_count}</strong> yeni, <strong>{s.existing_count}</strong> listede)
                  </span>
                  <button
                    type="button"
                    disabled={loadingSearchId === s.id}
                    onClick={() => handleLoadPastSearch(s.id)}
                    className="text-slate-800 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-200/90 px-3 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                  >
                    {loadingSearchId === s.id ? "Yükleniyor..." : "Sonuçları Göster"}
                  </button>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold border font-mono ${
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
