"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Business } from "@/types/business";
import { CallOutcome, ExclusionReason, EXCLUSION_REASONS } from "@/types/crm";
import {
  logCallAction,
  setLeadExclusionAction,
  getNextLeadAction,
} from "@/app/leads/actions";

interface QueueDialerProps {
  lead: Business;
  meta: {
    remainingCount: number;
    categories: string[];
    districts: string[];
  };
  activeCategory?: string;
  activeDistrict?: string;
}

export function QueueDialer({
  lead,
  meta,
  activeCategory,
  activeDistrict,
}: QueueDialerProps) {
  const router = useRouter();

  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFollowUpBox, setShowFollowUpBox] = useState(false);
  const [showExcludeBox, setShowExcludeBox] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Phone number normalization
  const rawPhone = lead.phone || "";
  const normalizedPhone = lead.phone_normalized || rawPhone.replace(/\D/g, "");

  let waPhone = normalizedPhone;
  if (waPhone.startsWith("0")) {
    waPhone = "9" + waPhone;
  } else if (!waPhone.startsWith("90") && waPhone.length === 10) {
    waPhone = "90" + waPhone;
  }

  // Generate dynamic sales pitch based on lead signals
  const getSalesPitch = () => {
    const bizName = lead.name || "İşletme Yetkilisi";
    if (lead.website_status === "NO_WEBSITE") {
      return `Merhabalar, Google Haritalar'daki işletme profilinizi ve müşteri yorumlarınızı inceledim; ${lead.district ? `${lead.district} bölgesinde` : "bölgenizde"} oldukça iyi bir bilinirliğiniz var ancak aktif bir web siteniz bulunmuyor. Google'da sizi arayan potansiyel hastaların/müşterilerin doğrudan randevu alabileceği mobil uyumlu ve WhatsApp entegreli modern bir web altyapısı için hızlı bir teklif hazırladık.`;
    }
    if (lead.website_status === "UNREACHABLE") {
      return `Merhabalar, Google Haritalar profilinizdeki web sitesi bağlantısını kontrol ettiğimde sitenizin açılmadığını ve hata verdiğini fark ettim. Reklam ve haritalardan gelen müşterilerinizi kaybetmemeniz için sitenizi ayağa kaldıralım.`;
    }
    return `Merhabalar, web sitenizi cep telefonundan incelediğimde mobil uyum ve açılış hızında müşterilerin doğrudan iletişime geçmesini zorlaştıran bazı eksikler tespit ettik. Sitenizi modern, hızlı ve tek tıkla WhatsApp randevusu aldıran yeni nesil bir yapıya kavuşturalım.`;
  };

  const pitchText = getSalesPitch();

  // Generate tailored WhatsApp pre-filled text
  const getWhatsAppMessage = () => {
    const bizName = lead.name || "İşletme Yetkilisi";
    if (lead.website_status === "NO_WEBSITE") {
      return `Merhabalar ${bizName}, Yaytech Studio'dan ulaşıyorum. Google Haritalar'daki yüksek puanlı profilinizi incelediğimizde henüz aktif bir web sitenizin bulunmadığını gördük. Potansiyel müşterilerinizin doğrudan randevu alabileceği modern bir web altyapısı için teklifimiz hazır: https://yaytech.studio`;
    }
    return `Merhabalar ${bizName}, Yaytech Studio'dan ulaşıyorum. Web siteniz üzerinde yaptığımız mobil ve hız analizinde müşterilerin erişimini zorlaştıran birkaç kritik nokta tespit ettik. İyileştirme önerilerimizi iletmek isteriz: https://yaytech.studio`;
  };

  const copyPhone = () => {
    if (!rawPhone) return;
    navigator.clipboard.writeText(rawPhone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const copyPitch = () => {
    navigator.clipboard.writeText(pitchText);
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 2000);
  };

  // Navigates to next lead in this queue segment
  const advanceToNext = async (knownNextId?: string | null) => {
    let nextId = knownNextId;
    if (nextId === undefined) {
      const res = await getNextLeadAction(lead.id, {
        category: activeCategory,
        district: activeDistrict,
      });
      nextId = res.success ? res.nextId : null;
    }

    const params = new URLSearchParams();
    if (activeCategory) params.set("category", activeCategory);
    if (activeDistrict) params.set("district", activeDistrict);

    if (nextId) {
      params.set("leadId", nextId);
    }
    router.push(`/queue?${params.toString()}`);
  };

  const handleOutcome = async (
    outcome: CallOutcome,
    presetNotes?: string,
    followUpDateVal?: string | null
  ) => {
    setIsProcessing(true);
    setFeedback("Kaydediliyor...");

    const res = await logCallAction({
      businessId: lead.id,
      outcome,
      notes: presetNotes || null,
      followUpDate: followUpDateVal,
      currentAttempts: lead.contact_attempts || 0,
      currentStatus: lead.crm_status || "NEW",
      queueFilter: {
        category: activeCategory,
        district: activeDistrict,
      },
    });

    await advanceToNext(res.nextLeadId);
  };

  const handleQuickFollowUp = (preset: "2h" | "tomorrow" | "monday") => {
    const target = new Date();
    if (preset === "2h") {
      target.setHours(target.getHours() + 2);
    } else if (preset === "tomorrow") {
      target.setDate(target.getDate() + 1);
      target.setHours(10, 0, 0, 0);
    } else if (preset === "monday") {
      target.setDate(target.getDate() + 2);
      target.setHours(10, 0, 0, 0);
    }
    handleOutcome("callback", `Geri aranacak (${target.toLocaleString("tr-TR")})`, target.toISOString());
  };

  const handleExclude = async (reason: ExclusionReason) => {
    setIsProcessing(true);
    await setLeadExclusionAction(lead.id, true, reason);
    await advanceToNext();
  };

  const handleSkip = async () => {
    setIsProcessing(true);
    await advanceToNext();
  };

  const handleFilterChange = (cat?: string, dist?: string) => {
    const params = new URLSearchParams();
    if (cat) params.set("category", cat);
    if (dist) params.set("district", dist);
    router.push(`/queue?${params.toString()}`);
  };

  const getPriorityStyle = (p?: string) => {
    switch (p) {
      case "HOT":
        return "bg-rose-100 text-rose-800 border-rose-300";
      case "WARM":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "COLD":
        return "bg-blue-100 text-blue-800 border-blue-300";
      default:
        return "bg-slate-100 text-slate-700 border-slate-300";
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 space-y-3.5">
      {/* 1. Queue Control Header (Filter Presets + Remaining Count) */}
      <div className="bg-white border border-slate-200 rounded-xl px-5 py-2.5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 font-semibold text-slate-950 text-sm tracking-tight">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <span>Arama Sırası</span>
          </div>

          <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>

          {/* Category Quick Filter */}
          <div className="relative">
            <select
              value={activeCategory || ""}
              onChange={(e) => handleFilterChange(e.target.value || undefined, activeDistrict)}
              className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-slate-800 text-xs font-semibold rounded-lg px-3 py-1.5 pr-7 appearance-none cursor-pointer focus:outline-none focus:border-slate-400 transition"
            >
              <option value="">Tüm Sektörler ({meta.categories.length})</option>
              {meta.categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">
              ▼
            </span>
          </div>

          {/* District Quick Filter */}
          <div className="relative">
            <select
              value={activeDistrict || ""}
              onChange={(e) => handleFilterChange(activeCategory, e.target.value || undefined)}
              className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-slate-800 text-xs font-semibold rounded-lg px-3 py-1.5 pr-7 appearance-none cursor-pointer focus:outline-none focus:border-slate-400 transition"
            >
              <option value="">Tüm İlçeler ({meta.districts.length})</option>
              {meta.districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">
              ▼
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <span className="bg-slate-950 text-white px-3 py-1.5 rounded-lg text-xs font-mono font-semibold tracking-tight">
            {meta.remainingCount} Aday Kaldı
          </span>
          <Link
            href={`/leads/${lead.id}`}
            target="_blank"
            className="text-xs font-semibold text-slate-500 hover:text-slate-950 transition flex items-center gap-1"
            title="Yeni sekmede tam kurumsal ve teknik detayları aç"
          >
            <span>Detaylı İncele</span>
            <span className="font-mono">↗</span>
          </Link>
        </div>
      </div>

      {/* 2. Focused Dual-Column Calling Cockpit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (5 Cols): Business Profile, Signals & Score */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 sm:p-5.5 shadow-xs space-y-4.5">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md font-mono text-xs font-bold border ${getPriorityStyle(
                  lead.priority
                )}`}
              >
                🔥 SKOR {lead.lead_score} • {lead.priority}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${
                  lead.website_status === "NO_WEBSITE"
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : lead.website_status === "HAS_WEBSITE"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    lead.website_status === "NO_WEBSITE"
                      ? "bg-rose-500"
                      : lead.website_status === "HAS_WEBSITE"
                      ? "bg-emerald-500"
                      : "bg-amber-500"
                  }`}
                ></span>
                {lead.website_status === "NO_WEBSITE"
                  ? "Web Sitesi Yok"
                  : lead.website_status === "HAS_WEBSITE"
                  ? "Web Sitesi Var"
                  : "Erişilemez"}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-950 tracking-tight leading-snug">
              {lead.name}
            </h1>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium mt-2.5">
              <span className="text-slate-800 font-semibold">{lead.category || "Genel Ticari"}</span>
              <span>•</span>
              <span>
                {lead.city || "İstanbul"}
                {lead.district ? ` (${lead.district})` : ""}
              </span>
              {lead.google_maps_url && (
                <>
                  <span>•</span>
                  <a
                    href={lead.google_maps_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-0.5 hover:underline"
                  >
                    <span>Google Haritalar</span>
                    <span className="font-mono text-[11px]">↗</span>
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Reputation & Stats */}
          <div className="bg-slate-50/80 border border-slate-200/90 rounded-lg p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-amber-500 text-base">★</span>
              <span className="font-mono font-bold text-sm text-slate-950">{lead.rating || "—"}</span>
              <span className="text-xs text-slate-500">({lead.review_count || 0} yorum)</span>
            </div>
            <div className="text-xs font-semibold text-slate-600">
              {lead.contact_attempts ? `${lead.contact_attempts} kez arandı` : "İlk Arama"}
            </div>
          </div>

          {/* Why This Lead is Valuable (Score Reasons) */}
          <div className="space-y-2.5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Tespit Edilen Fırsatlar
            </span>
            <div className="space-y-2">
              {lead.score_reasons && lead.score_reasons.length > 0 ? (
                lead.score_reasons.slice(0, 4).map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200/70 text-xs"
                  >
                    <span className="text-slate-800 font-medium">{r.label}</span>
                    <span className="font-mono font-bold text-emerald-700 bg-white border border-emerald-200 px-2 py-0.5 rounded text-xs ml-2">
                      +{r.points}
                    </span>
                  </div>
                ))
              ) : (
                <div className="px-3.5 py-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500">
                  {lead.website_status === "NO_WEBSITE"
                    ? "Aktif web sitesi bulunmuyor; doğrudan yeni site teklifi yapılabilir."
                    : "Web sitesi incelendi."}
                </div>
              )}
            </div>
          </div>

          {lead.website && (
            <div className="text-xs text-slate-500 flex items-center gap-1.5 pt-2 border-t border-slate-100">
              <span>Mevcut Site:</span>
              <a
                href={lead.website}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-blue-600 hover:underline truncate max-w-[260px]"
              >
                {lead.website_domain || lead.website} ↗
              </a>
            </div>
          )}
        </div>

        {/* Right Column (7 Cols): Sales Hook Pitch + Phone Trigger + 1-Click Action Bar */}
        <div className="lg:col-span-7 space-y-3.5">
          {/* Card 1: Sales Opening Script (Teleprompter style) */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span>🎙️</span> Satış Açılış Metni
              </span>
              <button
                type="button"
                onClick={copyPitch}
                className="h-7 px-3 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold transition flex items-center gap-1 shadow-2xs"
              >
                <span>{copiedPitch ? "✓" : "📋"}</span>
                <span>{copiedPitch ? "Kopyalandı" : "Metni Kopyala"}</span>
              </button>
            </div>
            <p className="text-sm font-medium text-slate-800 leading-relaxed bg-slate-50/70 border-l-2 border-blue-600 rounded-r-lg p-3">
              &ldquo;{pitchText}&rdquo;
            </p>
          </div>

          {/* Card 2: The Direct Contact & Call Terminal */}
          <div className="bg-slate-950 text-white rounded-xl p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest font-mono text-slate-400 font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Doğrudan İletişim Hattı
              </span>
              <span className="text-xs text-slate-400 font-mono">Türkiye (+90)</span>
            </div>

            {/* Phone Number: Guaranteed 1 line, bold, zero overflow */}
            <div className="font-mono text-3xl sm:text-4xl font-extrabold text-white tracking-tight select-all leading-none">
              {rawPhone || "Telefon Kaydı Yok"}
            </div>

            {/* 3 Action Buttons in an equal 3-column grid */}
            {rawPhone && (
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                {/* Hemen Ara */}
                <a
                  href={`tel:${normalizedPhone}`}
                  className="h-11 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-950 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition shadow-xs"
                  title="Telefon uygulamasını başlat"
                >
                  <span className="text-base">📞</span>
                  <span>Ara</span>
                </a>

                {/* Kopyala */}
                <button
                  type="button"
                  onClick={copyPhone}
                  className="h-11 bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 border border-slate-700 transition shadow-xs"
                  title="Numarayı panoya kopyala"
                >
                  <span>{copiedPhone ? "✓" : "📋"}</span>
                  <span>{copiedPhone ? "Kopyalandı" : "Kopyala"}</span>
                </button>

                {/* WhatsApp */}
                <a
                  href={`https://wa.me/${waPhone}?text=${encodeURIComponent(getWhatsAppMessage())}`}
                  target="_blank"
                  rel="noreferrer"
                  className="h-11 bg-[#25D366] hover:bg-[#20bd5a] active:bg-[#1da850] text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition shadow-xs"
                  title="Hazır Türkçe satış mesajı ile WhatsApp sohbetini aç"
                >
                  <span className="text-base">💬</span>
                  <span>WhatsApp</span>
                </a>
              </div>
            )}
          </div>

          {/* Card 3: 1-Click Fast Outcome Logger (Auto-Advances to Next Lead) */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Sonucu Kaydet & Sıradakine Geç
              </span>
              {feedback && (
                <span className="text-xs font-semibold text-blue-600 animate-pulse">
                  {feedback}
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {/* Cevap Yok */}
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleOutcome("no_answer", "Cevap yok / meşgul.")}
                className="h-16 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 transition flex flex-col items-center justify-center gap-1 active:scale-[0.98] disabled:opacity-50 shadow-2xs"
                title="Arama denemesini kaydeder ve sıradaki adaya geçer"
              >
                <span className="text-lg">📵</span>
                <span className="text-xs font-semibold">Cevap Yok</span>
              </button>

              {/* Geri Ara */}
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setShowFollowUpBox(!showFollowUpBox)}
                className={`h-16 rounded-lg border transition flex flex-col items-center justify-center gap-1 active:scale-[0.98] ${
                  showFollowUpBox
                    ? "border-amber-500 bg-amber-50 text-amber-950 font-bold shadow-xs"
                    : "border-slate-200 bg-white hover:bg-amber-50/40 text-slate-800 shadow-2xs"
                }`}
              >
                <span className="text-lg">⏰</span>
                <span className="text-xs font-semibold">Geri Ara</span>
              </button>

              {/* İlgilendi (The Hero Outcome!) */}
              <button
                type="button"
                disabled={isProcessing}
                onClick={() =>
                  handleOutcome("interested", "Görüşme olumlu, randevu veya detay istendi.")
                }
                className="h-16 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white transition flex flex-col items-center justify-center gap-1 active:scale-[0.98] shadow-sm font-bold"
              >
                <span className="text-lg">🔥</span>
                <span className="text-xs">İlgilendi</span>
              </button>

              {/* Red */}
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleOutcome("rejected", "Web sitesi istemiyor.")}
                className="h-16 rounded-lg border border-slate-200 bg-white hover:bg-rose-50/40 text-slate-800 transition flex flex-col items-center justify-center gap-1 active:scale-[0.98] shadow-2xs"
              >
                <span className="text-lg">❌</span>
                <span className="text-xs font-semibold">Red</span>
              </button>

              {/* Atla */}
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleSkip}
                className="h-16 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition flex flex-col items-center justify-center gap-1 active:scale-[0.98] shadow-2xs"
                title="Durumu değiştirmeden sıradaki adaya geçer"
              >
                <span className="text-lg">⏭️</span>
                <span className="text-xs font-semibold">Atla</span>
              </button>

              {/* Dışla */}
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setShowExcludeBox(!showExcludeBox)}
                className={`h-16 rounded-lg border transition flex flex-col items-center justify-center gap-1 active:scale-[0.98] ${
                  showExcludeBox
                    ? "border-slate-800 bg-slate-100 text-slate-950 font-bold"
                    : "border-slate-200 bg-white hover:bg-slate-50 text-slate-500 shadow-2xs"
                }`}
              >
                <span className="text-lg">🚫</span>
                <span className="text-xs font-semibold">Dışla</span>
              </button>
            </div>

            {/* Expandable Follow-Up Quick Presets */}
            {showFollowUpBox && (
              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2 animate-in fade-in duration-150">
                <span className="text-xs font-semibold text-amber-950 block">
                  Geri arama zamanı seçin (tek tıkla sıradakine geçer):
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickFollowUp("2h")}
                    className="h-9 px-3.5 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 text-amber-950 text-xs font-semibold transition"
                  >
                    +2 Saat Sonra
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickFollowUp("tomorrow")}
                    className="h-9 px-3.5 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 text-amber-950 text-xs font-semibold transition"
                  >
                    Yarın Sabah (10:00)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickFollowUp("monday")}
                    className="h-9 px-3.5 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 text-amber-950 text-xs font-semibold transition"
                  >
                    Pazartesi (10:00)
                  </button>
                </div>
              </div>
            )}

            {/* Expandable Exclude Reasons */}
            {showExcludeBox && (
              <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-xl space-y-2 animate-in fade-in duration-150">
                <span className="text-xs font-semibold text-slate-900 block">
                  Dışlama sebebi seçin:
                </span>
                <div className="flex flex-wrap gap-2">
                  {EXCLUSION_REASONS.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => handleExclude(r.value)}
                      className="h-8 px-3 rounded-lg bg-white border border-slate-300 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition"
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

}