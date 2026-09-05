"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Business } from "@/types/business";
import {
  CrmStatus,
  CallOutcome,
  LeadActivity,
  CRM_STATUS_CONFIG,
  EXCLUSION_REASONS,
  ExclusionReason,
} from "@/types/crm";
import {
  logCallAction,
  updateLeadStatusAction,
  setLeadExclusionAction,
  saveLeadNoteAction,
  getNextLeadAction,
} from "@/app/leads/actions";

interface CrmCockpitProps {
  business: Business;
  initialActivities: LeadActivity[];
}

export function CrmCockpit({ business, initialActivities }: CrmCockpitProps) {
  const router = useRouter();

  const [crmStatus, setCrmStatus] = useState<CrmStatus>(
    (business.crm_status as CrmStatus) || "NEW"
  );
  const [isExcluded, setIsExcluded] = useState(business.is_excluded || false);
  const [exclusionReason, setExclusionReason] = useState<string | null>(
    business.exclusion_reason || null
  );
  const [contactAttempts, setContactAttempts] = useState(
    business.contact_attempts || 0
  );
  const [lastContactedAt, setLastContactedAt] = useState<string | null>(
    business.last_contacted_at || null
  );
  const [nextFollowUpAt, setNextFollowUpAt] = useState<string | null>(
    business.next_follow_up_at || null
  );

  const [activities, setActivities] = useState<LeadActivity[]>(initialActivities);
  const [noteInput, setNoteInput] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isLoggingCall, setIsLoggingCall] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [showFollowUpBox, setShowFollowUpBox] = useState(false);
  const [showExcludeBox, setShowExcludeBox] = useState(false);
  const [customDate, setCustomDate] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Phone number normalization for WhatsApp & dialer
  const rawPhone = business.phone || "";
  const normalizedPhone = business.phone_normalized || rawPhone.replace(/\D/g, "");
  
  // Format phone for WhatsApp: ensure leading 90 for Turkey
  let waPhone = normalizedPhone;
  if (waPhone.startsWith("0")) {
    waPhone = "9" + waPhone;
  } else if (!waPhone.startsWith("90") && waPhone.length === 10) {
    waPhone = "90" + waPhone;
  }

  // Pre-generate tailored Turkish pitch message for WhatsApp
  const generateWhatsAppMessage = () => {
    const bizName = business.name || "İşletme Yetkilisi";
    if (business.website_status === "NO_WEBSITE") {
      return `Merhabalar ${bizName}, Yaytech Studio'dan ulaşıyorum. Google Haritalar'daki yüksek puanlı işletme profilinizi incelediğimizde henüz aktif bir web sitenizin bulunmadığını fark ettik. Bölgenizdeki potansiyel müşterilerin doğrudan randevu ve bilgi alabileceği modern bir web altyapısı için hızlı bir teklif hazırladık: https://yaytech.studio`;
    }
    const domain = business.website_domain || business.website || "web siteniz";
    return `Merhabalar ${bizName}, Yaytech Studio'dan ulaşıyorum. ${domain} web siteniz üzerinde yaptığımız mobil ve hız analizinde müşterilerin erişimini zorlaştıran birkaç kritik nokta tespit ettik. İyileştirme önerilerimizi ve referans çalışmalarımızı iletmek isteriz: https://yaytech.studio`;
  };

  const copyPhone = () => {
    if (!rawPhone) return;
    navigator.clipboard.writeText(rawPhone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleLogCall = async (
    outcome: CallOutcome,
    presetNotes?: string,
    followUpDateVal?: string | null
  ) => {
    setIsLoggingCall(true);
    setStatusMessage(null);

    const res = await logCallAction({
      businessId: business.id,
      outcome,
      notes: presetNotes || null,
      followUpDate: followUpDateVal,
    });

    setIsLoggingCall(false);

    if (res.success) {
      setCrmStatus(res.nextStatus);
      setContactAttempts((prev) => prev + 1);
      setLastContactedAt(new Date().toISOString());
      if (followUpDateVal !== undefined) {
        setNextFollowUpAt(followUpDateVal);
      }
      setShowFollowUpBox(false);

      // Add optimistic activity
      const newAct: LeadActivity = {
        id: "temp-" + Date.now(),
        business_id: business.id,
        type: "call",
        outcome,
        content: presetNotes || `${outcome} araması kaydedildi.`,
        created_at: new Date().toISOString(),
      };
      setActivities([newAct, ...activities]);
      setStatusMessage("Arama kaydedildi.");
      setTimeout(() => setStatusMessage(null), 3000);
    } else {
      setStatusMessage(res.error || "Arama kaydedilemedi.");
    }
  };

  const handleQuickFollowUp = (preset: "2h" | "tomorrow" | "monday") => {
    const now = new Date();
    let target = new Date();

    if (preset === "2h") {
      target.setHours(target.getHours() + 2);
    } else if (preset === "tomorrow") {
      target.setDate(target.getDate() + 1);
      target.setHours(10, 0, 0, 0);
    } else if (preset === "monday") {
      const day = target.getDay();
      const daysUntilMonday = day === 0 ? 1 : 8 - day;
      target.setDate(target.getDate() + 2);
      target.setHours(10, 0, 0, 0);
    }

    const iso = target.toISOString();
    setActivePreset(preset);
    handleLogCall("callback", `Geri aranacak olarak takvimlendi (${target.toLocaleString("tr-TR")})`, iso);
  };

  const handleCustomFollowUp = () => {
    if (!customDate) return;
    const iso = new Date(customDate).toISOString();
    handleLogCall("callback", `Geri aranacak olarak takvimlendi (${new Date(customDate).toLocaleString("tr-TR")})`, iso);
  };

  const handleExclusion = async (reason: ExclusionReason) => {
    const res = await setLeadExclusionAction(business.id, true, reason);
    if (res.success) {
      setIsExcluded(true);
      setExclusionReason(reason);
      setShowExcludeBox(false);
      setStatusMessage("İşletme aramadan dışlandı.");
    }
  };

  const handleRestoreExclusion = async () => {
    const res = await setLeadExclusionAction(business.id, false, null);
    if (res.success) {
      setIsExcluded(false);
      setExclusionReason(null);
      setStatusMessage("İşletme aktif listeye geri alındı.");
    }
  };

  const handleStatusChange = async (newStatus: CrmStatus) => {
    const res = await updateLeadStatusAction(business.id, newStatus);
    if (res.success) {
      setCrmStatus(newStatus);
    }
  };

  const handleSaveNote = async () => {
    if (!noteInput.trim()) return;
    setIsSavingNote(true);
    const res = await saveLeadNoteAction(business.id, noteInput);
    setIsSavingNote(false);

    if (res.success) {
      const newAct: LeadActivity = {
        id: "temp-" + Date.now(),
        business_id: business.id,
        type: "note",
        content: noteInput.trim(),
        created_at: new Date().toISOString(),
      };
      setActivities([newAct, ...activities]);
      setNoteInput("");
    }
  };

  const handleNextLead = async () => {
    const res = await getNextLeadAction(business.id);
    if (res.success && res.nextId) {
      router.push(`/leads/${res.nextId}`);
    } else {
      router.push("/leads");
    }
  };

  const statusCfg = CRM_STATUS_CONFIG[crmStatus] || CRM_STATUS_CONFIG.NEW;

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 mb-6 shadow-xs">
      {/* 1. Top Call Header & Quick Communication Tools */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 pb-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="bg-slate-950 text-white p-3.5 rounded-2xl flex items-center justify-center shadow-xs">
            <span className="text-xl">📞</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Hızlı Arama Hattı
              </span>
              {copiedPhone && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold">
                  ✓ Kopyalandı
                </span>
              )}
            </div>
            <div className="text-xl sm:text-2xl font-extrabold font-mono text-slate-950 tracking-tight mt-0.5 truncate">
              {rawPhone || "Telefon Numarası Yok"}
            </div>
          </div>
        </div>

        {/* Call & WhatsApp Trigger Buttons */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2.5 w-full lg:w-auto">
          {rawPhone && (
            <>
              <a
                href={`tel:${normalizedPhone}`}
                className="h-10 px-3 sm:px-4 rounded-xl bg-slate-950 hover:bg-slate-800 active:bg-black text-white text-xs font-bold shadow-xs transition inline-flex items-center justify-center gap-1.5"
              >
                <span>📞 Hemen Ara</span>
              </a>
              <button
                type="button"
                onClick={copyPhone}
                className="h-10 px-3 sm:px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-xs inline-flex items-center justify-center"
              >
                {copiedPhone ? "✓ Kopyalandı" : "Kopyala"}
              </button>
              <a
                href={`https://wa.me/${waPhone}?text=${encodeURIComponent(generateWhatsAppMessage())}`}
                target="_blank"
                rel="noreferrer"
                className="h-10 px-3 sm:px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold shadow-xs transition inline-flex items-center justify-center gap-1.5"
                title="Tek tıkla hazır Türkçe satış mesajını WhatsApp ile açar"
              >
                <span>💬 WhatsApp</span>
              </a>
            </>
          )}

          {/* Next Lead High-Velocity Dialer Button */}
          <button
            type="button"
            onClick={handleNextLead}
            className="h-10 px-3 sm:px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold shadow-xs transition inline-flex items-center justify-center gap-1.5 sm:ml-auto"
            title="Aramayı tamamla veya atla, sıradaki en yüksek puanlı adaya geç"
          >
            <span>Sıradaki →</span>
          </button>
        </div>
      </div>

      {/* 2. 1-Click Call Outcome Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Arama Sonucu Kaydet (1-Tık)
          </span>
          {statusMessage && (
            <span className="text-xs text-emerald-600 font-bold animate-pulse">
              ✓ {statusMessage}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <button
            type="button"
            disabled={isLoggingCall}
            onClick={() => handleLogCall("no_answer", "Cevap vermedi / meşgul.")}
            className="h-14 flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold transition active:scale-95 disabled:opacity-50"
          >
            <span className="text-base mb-0.5">📵</span>
            <span>Cevap Yok</span>
          </button>

          <button
            type="button"
            disabled={isLoggingCall}
            onClick={() => setShowFollowUpBox(!showFollowUpBox)}
            className={`h-14 flex flex-col items-center justify-center rounded-xl border text-xs font-bold transition active:scale-95 ${
              showFollowUpBox
                ? "border-amber-400 bg-amber-100 text-amber-900 shadow-xs"
                : "border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-amber-800"
            }`}
          >
            <span className="text-base mb-0.5">⏰</span>
            <span>Geri Ara</span>
          </button>

          <button
            type="button"
            disabled={isLoggingCall}
            onClick={() => handleLogCall("interested", "Görüşme olumlu, detaylı bilgi talep edildi.")}
            className="h-14 flex flex-col items-center justify-center rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-800 text-xs font-bold transition active:scale-95"
          >
            <span className="text-base mb-0.5">🔥</span>
            <span>İlgilendi</span>
          </button>

          <button
            type="button"
            disabled={isLoggingCall}
            onClick={() => handleLogCall("meeting", "Toplantı veya teklif sunumu ayarlandı.")}
            className="h-14 flex flex-col items-center justify-center rounded-xl border border-purple-200 bg-purple-50/70 hover:bg-purple-100 text-purple-800 text-xs font-bold transition active:scale-95"
          >
            <span className="text-base mb-0.5">🤝</span>
            <span>Toplantı</span>
          </button>

          <button
            type="button"
            disabled={isLoggingCall}
            onClick={() => handleLogCall("rejected", "İlgilenmediğini belirtti / web sitesi istemiyor.")}
            className="h-14 flex flex-col items-center justify-center rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-800 text-xs font-bold transition active:scale-95"
          >
            <span className="text-base mb-0.5">❌</span>
            <span>Olumsuz / Red</span>
          </button>

          <button
            type="button"
            onClick={() => setShowExcludeBox(!showExcludeBox)}
            className={`h-14 flex flex-col items-center justify-center rounded-xl border text-xs font-bold transition active:scale-95 ${
              isExcluded
                ? "border-slate-400 bg-slate-200 text-slate-800 shadow-xs"
                : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
            }`}
          >
            <span className="text-base mb-0.5">🚫</span>
            <span>{isExcluded ? "Dışlandı" : "Dışla"}</span>
          </button>
        </div>

        {/* Expandable Follow-Up Quick Preset Box */}
        {showFollowUpBox && (
          <div className="mt-3.5 p-4 bg-amber-50/90 border border-amber-200 rounded-xl text-xs space-y-3 animate-in fade-in duration-200">
            <div className="font-bold text-amber-950">
              Ne zaman geri aranacak? (Tek tıkla planla):
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleQuickFollowUp("2h")}
                className="px-3.5 py-2 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 font-bold transition shadow-2xs"
              >
                +2 Saat Sonra
              </button>
              <button
                type="button"
                onClick={() => handleQuickFollowUp("tomorrow")}
                className="px-3.5 py-2 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 font-bold transition shadow-2xs"
              >
                Yarın Sabah (10:00)
              </button>
              <button
                type="button"
                onClick={() => handleQuickFollowUp("monday")}
                className="px-3.5 py-2 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 font-bold transition shadow-2xs"
              >
                Pazartesi (10:00)
              </button>
              <div className="flex items-center gap-1.5 ml-auto">
                <input
                  type="datetime-local"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={handleCustomFollowUp}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shadow-2xs"
                >
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Expandable Exclude Reason Box */}
        {showExcludeBox && (
          <div className="mt-3.5 p-4 bg-slate-100 border border-slate-300/80 rounded-xl text-xs space-y-2.5 animate-in fade-in duration-200">
            <div className="font-bold text-slate-800">
              {isExcluded
                ? `Bu işletme dışlanmış durumda (${exclusionReason || "Belirtilmemiş"}).`
                : "Bu işletmeyi neden dışlıyorsunuz?"}
            </div>
            {!isExcluded ? (
              <div className="flex flex-wrap gap-2">
                {EXCLUSION_REASONS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => handleExclusion(r.value)}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-200 text-slate-800 text-xs font-medium transition"
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            ) : (
              <button
                type="button"
                onClick={handleRestoreExclusion}
                className="px-4 py-2 rounded-xl bg-slate-950 text-white hover:bg-slate-800 text-xs font-bold shadow-xs transition"
              >
                Dışlamayı Kaldır (Aktif Listeye Al)
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3. CRM Metrics & Status Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-y border-slate-100 py-4 mb-6 text-xs">
        <div>
          <span className="text-slate-400 block text-[11px] font-medium">CRM Durumu:</span>
          <select
            value={crmStatus}
            onChange={(e) => handleStatusChange(e.target.value as CrmStatus)}
            className={`mt-1.5 font-bold text-xs rounded-lg border px-2.5 py-1.5 cursor-pointer ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
          >
            {Object.entries(CRM_STATUS_CONFIG).map(([key, val]) => (
              <option key={key} value={key}>
                {val.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className="text-slate-400 block text-[11px] font-medium">Arama Denemesi:</span>
          <span className="text-slate-950 font-mono font-bold text-sm block mt-1.5">{contactAttempts} kez arandı</span>
        </div>

        <div>
          <span className="text-slate-400 block text-[11px] font-medium">Son Temas:</span>
          <span className="text-slate-700 font-medium block mt-1.5">
            {lastContactedAt ? new Date(lastContactedAt).toLocaleString("tr-TR") : "Henüz Aranmadı"}
          </span>
        </div>

        <div>
          <span className="text-slate-400 block text-[11px] font-medium">Sonraki Takip:</span>
          <span className="font-medium block mt-1.5">
            {nextFollowUpAt ? (
              <span className="text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                ⏰ {new Date(nextFollowUpAt).toLocaleString("tr-TR")}
              </span>
            ) : (
              "—"
            )}
          </span>
        </div>
      </div>

      {/* 4. Notes & Activity Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Notes Editor */}
        <div>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
            Hızlı Satış Notu Ekle
          </h3>
          <div className="space-y-2.5">
            <textarea
              rows={3}
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="Görüşme notu, teklif detayı, itiraz veya sekreter bilgisi..."
              className="w-full text-xs p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:outline-none focus:border-blue-500 transition"
            />
            <div className="flex justify-end">
              <button
                type="button"
                disabled={isSavingNote || !noteInput.trim()}
                onClick={handleSaveNote}
                className="h-9 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 active:bg-black text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
              >
                {isSavingNote ? "Kaydediliyor..." : "Notu Kaydet"}
              </button>
            </div>
          </div>
        </div>

        {/* Activity Timeline Stream */}
        <div>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
            Aktivite Geçmişi ({activities.length})
          </h3>
          {activities.length === 0 ? (
            <div className="bg-slate-50 rounded-xl p-6 text-slate-400 text-xs border border-slate-100 text-center">
              Henüz kaydedilmiş arama veya aktivite bulunmuyor.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {activities.map((act) => (
                <div
                  key={act.id}
                  className="bg-white border border-slate-200/80 rounded-xl p-3 text-xs flex items-start gap-3 shadow-2xs"
                >
                  <span className="text-sm mt-0.5">
                    {act.type === "call"
                      ? "📞"
                      : act.type === "note"
                      ? "📝"
                      : act.type === "whatsapp"
                      ? "💬"
                      : "🔄"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-900 font-medium leading-relaxed">
                      {act.content}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">
                      {new Date(act.created_at).toLocaleString("tr-TR")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}