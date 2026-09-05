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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
      {/* 1. Queue Control Header (Filter Presets + Remaining Count) */}
      <div className="bg-white border border-slate-200 rounded-xl px-5 py-3 mb-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Arama Sırası</span>
          </div>

          <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>

          {/* Category Quick Filter */}
          <select
            value={activeCategory || ""}
            onChange={(e) => handleFilterChange(e.target.value || undefined, activeDistrict)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-medium focus:outline-none focus:border-emerald-500"
          >
            <option value="">Tüm Sektörler ({meta.categories.length})</option>
            {meta.categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* District Quick Filter */}
          <select
            value={activeDistrict || ""}
            onChange={(e) => handleFilterChange(activeCategory, e.target.value || undefined)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-medium focus:outline-none focus:border-emerald-500"
          >
            <option value="">Tüm İlçeler ({meta.districts.length})</option>
            {meta.districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full font-bold">
            {meta.remainingCount} Aday Kaldı
          </span>
          <Link
            href={`/leads/${lead.id}`}
            target="_blank"
            className="text-slate-500 hover:text-slate-900 underline font-medium"
            title="Yeni sekmede tam kurumsal ve teknik detayları aç"
          >
            Detaylı İncele ↗
          </Link>
        </div>
      </div>

      {/* 2. Focused Single-Screen Calling Cockpit */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (5 Cols): Business Profile, Signals & Score */}
          <div className="lg:col-span-5 space-y-4 border-b lg:border-b-0 lg:border-r border-slate-200 pb-5 lg:pb-0 lg:pr-6">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded">
                  Skor: {lead.lead_score} • {lead.priority}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                    lead.website_status === "NO_WEBSITE"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : lead.website_status === "HAS_WEBSITE"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  {lead.website_status === "NO_WEBSITE"
                    ? "Web Sitesi Yok"
                    : lead.website_status === "HAS_WEBSITE"
                    ? "Web Sitesi Var"
                    : "Erişilemez"}
                </span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-snug">
                {lead.name}
              </h1>
              <div className="text-xs text-slate-500 mt-1.5 flex flex-wrap items-center gap-2">
                <span>{lead.category || "Genel Ticari"}</span>
                <span>•</span>
                <span className="font-medium text-slate-700">
                  {lead.city || "İstanbul"} {lead.district ? `(${lead.district})` : ""}
                </span>
                {lead.google_maps_url && (
                  <>
                    <span>•</span>
                    <a
                      href={lead.google_maps_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-semibold bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded text-[11px] transition shadow-2xs"
                      title="Google Haritalar profilini ve kullanıcı yorumlarını yeni sekmede aç"
                    >
                      <span>📍 Haritalarda Gör</span>
                      <span>↗</span>
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* Reputation & Google Trust Stats */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-amber-500 font-bold text-base">★</span>
                <span className="font-bold text-slate-900 text-sm">{lead.rating || "—"}</span>
                <span className="text-slate-400">({lead.review_count || 0} yorum)</span>
              </div>
              <div className="text-slate-500 text-[11px]">
                {lead.contact_attempts ? (
                  <span className="font-semibold text-slate-700">{lead.contact_attempts} kez arandı</span>
                ) : (
                  <span className="text-emerald-700 font-semibold">İlk Arama</span>
                )}
              </div>
            </div>

            {/* Why This Lead is Valuable (Score Reasons) */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                Öne Çıkan Satış Fırsatları
              </span>
              <div className="space-y-1.5 text-xs">
                {lead.score_reasons && lead.score_reasons.length > 0 ? (
                  lead.score_reasons.slice(0, 3).map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100"
                    >
                      <span className="text-slate-700 leading-tight">{r.label}</span>
                      <span className="font-mono font-bold text-emerald-700 text-[11px] ml-2">
                        +{r.points}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-2 rounded-lg bg-slate-50 text-slate-500 text-xs">
                    {lead.website_status === "NO_WEBSITE"
                      ? "Aktif web sitesi bulunmuyor; yüksek ticari potansiyel."
                      : "Web sitesi incelendi; iyileştirme adayı."}
                  </div>
                )}
              </div>
            </div>

            {lead.website && (
              <div className="text-xs pt-1">
                <span className="text-slate-400 mr-2">Mevcut Site:</span>
                <a
                  href={lead.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-600 hover:underline font-mono truncate inline-block max-w-[240px] align-bottom"
                >
                  {lead.website_domain || lead.website}
                </a>
              </div>
            )}
          </div>

          {/* Right Column (7 Cols): Sales Hook Pitch + Phone Trigger + 1-Click Action Bar */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
            {/* Sales Opening Script */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-950 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <span>📞</span> Doğrudan Kullanılacak Satış Açılışı
                </span>
                <button
                  type="button"
                  onClick={copyPitch}
                  className="bg-white border border-emerald-200 hover:bg-emerald-100 text-emerald-800 text-[11px] font-semibold px-2.5 py-0.5 rounded shadow-2xs transition"
                >
                  {copiedPitch ? "Kopyalandı ✓" : "Metni Kopyala"}
                </button>
              </div>
              <p className="text-slate-800 leading-relaxed font-medium bg-white/80 border border-emerald-200/60 rounded-lg p-3 text-xs">
                &ldquo;{pitchText}&rdquo;
              </p>
            </div>

            {/* Direct Phone & WhatsApp Communication Bar */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Doğrudan İletişim Hattı
                </span>
                <div className="text-xl font-bold font-mono text-slate-900 tracking-tight mt-0.5">
                  {rawPhone || "Telefon Kaydı Bulunamadı"}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {rawPhone && (
                  <>
                    <a
                      href={`tel:${normalizedPhone}`}
                      className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
                    >
                      <span>📞 Hemen Ara</span>
                    </a>
                    <button
                      type="button"
                      onClick={copyPhone}
                      className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium transition"
                    >
                      {copiedPhone ? "Kopyalandı!" : "Kopyala"}
                    </button>
                    <a
                      href={`https://wa.me/${waPhone}?text=${encodeURIComponent(getWhatsAppMessage())}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-xs transition"
                      title="Hazır Türkçe satış mesajını WhatsApp Web üzerinden başlatır"
                    >
                      <span>💬 WhatsApp</span>
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* 1-Click Fast Outcome Logger (Auto-Advances to Next Lead) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Sonucu Kaydet & Sıradakine Geç (Tek Tık)
                </span>
                {feedback && <span className="text-xs text-emerald-600 font-semibold">{feedback}</span>}
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleOutcome("no_answer", "Cevap yok / meşgul.")}
                  className="flex flex-col items-center justify-center p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold transition active:scale-95 disabled:opacity-50"
                  title="Arama denemesini kaydeder ve hemen sıradaki adayı açar"
                >
                  <span className="text-base mb-0.5">📵</span>
                  <span>Cevap Yok</span>
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setShowFollowUpBox(!showFollowUpBox)}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-semibold transition active:scale-95 ${
                    showFollowUpBox
                      ? "border-amber-400 bg-amber-50 text-amber-900"
                      : "border-amber-200 bg-amber-50/50 hover:bg-amber-100 text-amber-900"
                  }`}
                >
                  <span className="text-base mb-0.5">⏰</span>
                  <span>Geri Ara</span>
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleOutcome("interested", "Görüşme olumlu, randevu veya detay istendi.")}
                  className="flex flex-col items-center justify-center p-2 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition active:scale-95"
                >
                  <span className="text-base mb-0.5">🔥</span>
                  <span>İlgilendi</span>
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleOutcome("rejected", "Web sitesi istemiyor.")}
                  className="flex flex-col items-center justify-center p-2 rounded-lg border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-rose-800 text-xs font-semibold transition active:scale-95"
                >
                  <span className="text-base mb-0.5">❌</span>
                  <span>Red</span>
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleSkip}
                  className="flex flex-col items-center justify-center p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium transition active:scale-95"
                  title="Durumu değiştirmeden sıradaki adaya geçer"
                >
                  <span className="text-base mb-0.5">⏭️</span>
                  <span>Atla</span>
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setShowExcludeBox(!showExcludeBox)}
                  className="flex flex-col items-center justify-center p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 text-xs font-medium transition active:scale-95"
                >
                  <span className="text-base mb-0.5">🚫</span>
                  <span>Dışla</span>
                </button>
              </div>

              {/* Expandable Follow-Up Quick Presets */}
              {showFollowUpBox && (
                <div className="mt-2.5 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-2 animate-in fade-in duration-150">
                  <span className="font-bold text-amber-900 block">
                    Geri arama zamanı seçin (seçtiğiniz an sıradakine geçer):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickFollowUp("2h")}
                      className="px-3 py-1.5 rounded bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 font-semibold"
                    >
                      +2 Saat Sonra
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickFollowUp("tomorrow")}
                      className="px-3 py-1.5 rounded bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 font-semibold"
                    >
                      Yarın Sabah (10:00)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickFollowUp("monday")}
                      className="px-3 py-1.5 rounded bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 font-semibold"
                    >
                      Pazartesi (10:00)
                    </button>
                  </div>
                </div>
              )}

              {/* Expandable Exclude Reasons */}
              {showExcludeBox && (
                <div className="mt-2.5 p-3 bg-slate-100 border border-slate-300 rounded-lg text-xs space-y-2 animate-in fade-in duration-150">
                  <span className="font-bold text-slate-800 block">Dışlama sebebi:</span>
                  <div className="flex flex-wrap gap-2">
                    {EXCLUSION_REASONS.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => handleExclude(r.value)}
                        className="px-2.5 py-1 rounded bg-white border border-slate-300 hover:bg-slate-200 text-slate-700 text-[11px] font-medium"
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
    </div>
  );
}