"use client";

import { useState, useTransition } from "react";
import { Business } from "@/types/business";
import { WebsiteAudit } from "@/types/website";
import { runLightweightScanAction, runDeepAuditAction } from "../actions";

interface WebsiteIntelligenceCardProps {
  business: Business;
  latestAudit: WebsiteAudit | null;
}

export function WebsiteIntelligenceCard({
  business,
  latestAudit: initialAudit,
}: WebsiteIntelligenceCardProps) {
  const [audit, setAudit] = useState<WebsiteAudit | null>(initialAudit);
  const [isScanning, startScan] = useTransition();
  const [isDeepAuditing, startDeepAudit] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );
  const [copiedPitch, setCopiedPitch] = useState(false);

  const handleLightweightScan = () => {
    setFeedback(null);
    startScan(async () => {
      const res = await runLightweightScanAction(business.id);
      if (res.success && res.audit) {
        setAudit(res.audit);
        setFeedback({ type: "success", message: "Hızlı tarama tamamlandı." });
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Tarama sırasında bir hata oluştu.",
        });
      }
    });
  };

  const handleDeepAudit = () => {
    setFeedback(null);
    startDeepAudit(async () => {
      const res = await runDeepAuditAction(business.id);
      if (res.success && res.audit) {
        setAudit(res.audit);
        setFeedback({ type: "success", message: "Satış analizi tamamlandı." });
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Analiz sırasında hata oluştu.",
        });
      }
    });
  };

  const handleCopyPitch = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 2500);
  };

  const hasWebsite = Boolean(business.website);
  const deepData = audit?.deep_audit_data;

  return (
    <div className="border border-slate-200 bg-white rounded-xl p-6 mb-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900 tracking-wide uppercase">
              Web Sitesi Satış İstihbaratı
            </h2>
            {audit && (
              <span className="text-[10px] bg-slate-100 text-slate-600 font-mono px-2 py-0.5 rounded border border-slate-200">
                {audit.audit_type === "deep" ? "Kapsamlı Satış Analizi" : "Hızlı Tarama"}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {hasWebsite
              ? `Hedef: ${business.website}`
              : "Bu işletmenin kayıtlı bir web sitesi bulunmuyor."}
          </p>
        </div>

        {/* Action Buttons */}
        {hasWebsite && (
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleLightweightScan}
              disabled={isScanning || isDeepAuditing}
              className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50 transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
            >
              {isScanning ? (
                <>
                  <span className="inline-block w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
                  Taranıyor...
                </>
              ) : (
                "Hızlı Tara"
              )}
            </button>
            <button
              onClick={handleDeepAudit}
              disabled={isScanning || isDeepAuditing}
              className="px-3 py-1.5 bg-emerald-600 border border-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
            >
              {isDeepAuditing ? (
                <>
                  <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Analiz Ediliyor...
                </>
              ) : (
                "Kapsamlı Satış Analizi"
              )}
            </button>
          </div>
        )}
      </div>

      {/* Feedback Message */}
      {feedback && (
        <div
          className={`mb-4 p-3 rounded-lg text-xs border ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Content */}
      {!hasWebsite ? (
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-5 text-xs text-amber-900 space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm text-amber-950">
            <span>🎯</span> Doğrudan Satış Fırsatı: Web Sitesi Yok
          </div>
          <p className="text-slate-700 leading-relaxed">
            İşletmenin Google profilinde web sitesi kayıtlı değil. Yerel aramalardan gelen müşterileri
            doğrudan rakiplerine kaptırıyor.
          </p>
          <div className="bg-white/80 border border-amber-200 rounded-lg p-3 text-xs text-slate-800 font-medium">
            <strong>Önerilen Açılış Cümlesi:</strong> &ldquo;Hocam merhaba, Google Haritalar profilinizde
            {business.review_count ? ` ${business.review_count} yorumunuz ve` : ""} yüksek puanınız var
            ancak müşterilerin detayları ve randevuyu inceleyebileceği bir web siteniz bulunmuyor. Bu
            kaybı önlemek için Yaytech olarak işletmenize özel profesyonel bir web sitesi kuralım.&rdquo;
          </div>
        </div>
      ) : !audit ? (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center text-xs">
          <p className="text-slate-600 font-medium mb-1">Web Sitesi Taraması Henüz Yapılmadı</p>
          <p className="text-slate-500 mb-4 max-w-md mx-auto">
            İşletmenin web sitesi hızını, mobil uyumunu ve soğuk arama satış açılışını oluşturmak için
            yukarıdaki butonlardan birine basın.
          </p>
          <button
            onClick={handleLightweightScan}
            disabled={isScanning || isDeepAuditing}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 transition"
          >
            Hızlı Taramayı Çalıştır
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Key Sales Signals Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            {/* Reachability */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <span className="text-slate-500 block text-[11px] mb-1">Durum</span>
              <span
                className={`font-semibold inline-flex items-center gap-1 ${
                  audit.status === "success"
                    ? "text-emerald-700"
                    : audit.status === "timeout"
                    ? "text-amber-700"
                    : "text-rose-700"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    audit.status === "success"
                      ? "bg-emerald-500"
                      : audit.status === "timeout"
                      ? "bg-amber-500"
                      : "bg-rose-500"
                  }`}
                ></span>
                {audit.status === "success"
                  ? `${audit.http_status || 200} Aktif`
                  : audit.status === "timeout"
                  ? "Zaman Aşımı"
                  : audit.status === "ssl_error"
                  ? "SSL Hatası"
                  : "Çökmüş"}
              </span>
            </div>

            {/* Load Speed */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <span className="text-slate-500 block text-[11px] mb-1">Yükleme Hızı</span>
              <span
                className={`font-semibold ${
                  (audit.response_time_ms || 0) > 1500
                    ? "text-rose-600"
                    : (audit.response_time_ms || 0) > 800
                    ? "text-amber-600"
                    : "text-emerald-700"
                }`}
              >
                {audit.response_time_ms ? `${audit.response_time_ms} ms` : "—"}
              </span>
            </div>

            {/* Mobile Viewport */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <span className="text-slate-500 block text-[11px] mb-1">Mobil Uyum</span>
              <span
                className={`font-semibold ${
                  audit.has_viewport ? "text-emerald-700" : "text-rose-600"
                }`}
              >
                {audit.has_viewport ? "Uyumlu" : "Mobil Uyumsuz"}
              </span>
            </div>

            {/* WhatsApp */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <span className="text-slate-500 block text-[11px] mb-1">Hızlı WhatsApp</span>
              <span
                className={`font-semibold ${
                  deepData?.hasWhatsApp ? "text-emerald-700" : "text-rose-600"
                }`}
              >
                {deepData?.hasWhatsApp ? "Mevcut" : "Buton Yok"}
              </span>
            </div>

            {/* SSL Warning */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <span className="text-slate-500 block text-[11px] mb-1">Güvenlik</span>
              <span
                className={`font-semibold ${
                  audit.is_https ? "text-emerald-700" : "text-rose-600"
                }`}
              >
                {audit.is_https ? "HTTPS Güvenli" : "Güvenli Değil"}
              </span>
            </div>
          </div>

          {/* Tailored Cold-Call Pitch Card */}
          {deepData?.salesPitch && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-5 text-xs text-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-2">
                  <span>📞</span> Aramada Kullanılacak Satış Açılışı
                </h4>
                <button
                  onClick={() => handleCopyPitch(deepData.salesPitch)}
                  className="text-[11px] font-medium text-emerald-700 hover:text-emerald-900 bg-white border border-emerald-200 px-2.5 py-1 rounded-md shadow-2xs"
                >
                  {copiedPitch ? "Kopyalandı ✓" : "Metni Kopyala"}
                </button>
              </div>
              <p className="text-slate-800 leading-relaxed font-medium bg-white/70 border border-emerald-200/60 rounded-lg p-3">
                &ldquo;{deepData.salesPitch}&rdquo;
              </p>

              {deepData.problems && deepData.problems.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide block">
                    Müşteriye Sunulacak Net Sorunlar:
                  </span>
                  <ul className="space-y-1 text-slate-700">
                    {deepData.problems.map((prob, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-rose-600 font-bold">✕</span>
                        <span>{prob}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Infrastructure & Contacts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Tech Stack */}
            <div className="border border-slate-200 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-slate-800 text-xs uppercase tracking-wider">
                Web Sitesi Altyapısı
              </h4>
              {audit.technologies && audit.technologies.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {audit.technologies.map((tech) => (
                    <span
                      key={tech}
                      className="bg-slate-100 border border-slate-200 text-slate-800 px-2 py-0.5 rounded text-[11px] font-medium"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 italic">Özel HTML veya belirsiz altyapı.</p>
              )}
            </div>

            {/* Extracted Contacts */}
            <div className="border border-slate-200 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-slate-800 text-xs uppercase tracking-wider">
                Siteden Çıkarılan İletişim Kanalları
              </h4>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Telefon:</span>
                  {audit.contact_phones && audit.contact_phones.length > 0 ? (
                    <span className="font-mono text-slate-900 font-medium">
                      {audit.contact_phones.join(", ")}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">—</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">E-posta:</span>
                  {audit.contact_emails && audit.contact_emails.length > 0 ? (
                    <span className="font-mono text-slate-900">
                      {audit.contact_emails.join(", ")}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">—</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
