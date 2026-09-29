"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Business } from "@/types/business";
import { SiteHealth, WebsiteAudit } from "@/types/website";
import { auditHealth, describeSiteProblems, isOutdatedYear, SLOW_SERVER_MS } from "@/lib/site-analysis";
import { buildCallPitch } from "@/lib/outreach";
import { runPageSpeedAction, runWebsiteAuditAction } from "../actions";

interface WebsiteIntelligenceCardProps {
  business: Business;
  latestAudit: WebsiteAudit | null;
}

const HEALTH_LABEL: Record<SiteHealth, { text: string; tone: string; dot: string }> = {
  ok: { text: "Aktif", tone: "text-emerald-700", dot: "bg-emerald-500" },
  protected: { text: "Aktif (korumalı)", tone: "text-emerald-700", dot: "bg-emerald-500" },
  broken: { text: "Hata veriyor", tone: "text-rose-700", dot: "bg-rose-500" },
  parked: { text: "Boş / Park edilmiş", tone: "text-rose-700", dot: "bg-rose-500" },
  down: { text: "Açılmıyor", tone: "text-rose-700", dot: "bg-rose-500" },
};

function Tile({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3">
      <span className="text-slate-400 font-mono text-[10px] uppercase tracking-wider block mb-1">{label}</span>
      <span className={`font-semibold ${tone}`}>{value}</span>
    </div>
  );
}

export function WebsiteIntelligenceCard({ business, latestAudit }: WebsiteIntelligenceCardProps) {
  const router = useRouter();
  const [audit, setAudit] = useState<WebsiteAudit | null>(latestAudit);
  const [isScanning, startScan] = useTransition();
  const [isSpeedTesting, startSpeedTest] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [copiedPitch, setCopiedPitch] = useState(false);
  const autoScanStarted = useRef(false);

  const hasWebsite = Boolean(business.website);

  const handleScan = () => {
    setFeedback(null);
    startScan(async () => {
      const res = await runWebsiteAuditAction(business.id);
      if (!res.success) {
        setFeedback({ type: "error", message: res.error || "Tarama sırasında bir hata oluştu." });
        return;
      }
      setAudit(res.audit);
      // Score, status and header live in other components; refresh them from the server.
      router.refresh();
    });
  };

  const handleSpeedTest = () => {
    setFeedback(null);
    startSpeedTest(async () => {
      const res = await runPageSpeedAction(business.id);
      if (res.success && res.audit) {
        setAudit(res.audit);
        setFeedback({ type: "success", message: "Google hız testi tamamlandı." });
        router.refresh();
      } else {
        setFeedback({
          type: "error",
          message: `${res.error || "Hız testi başarısız."} (Google Cloud'da "PageSpeed Insights API" etkin olmalı.)`,
        });
      }
    });
  };

  // Scan automatically when there is no audit yet, or the audit predates the current scanner
  // (older audits often reported working sites as unreachable).
  useEffect(() => {
    if (autoScanStarted.current || !hasWebsite) return;
    if (!audit || !audit.deep_audit_data?.health) {
      autoScanStarted.current = true;
      handleScan();
    }
  }, []);

  const handleCopyPitch = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 2500);
  };

  const pitch = buildCallPitch({ ...business, audit });
  const d = audit?.deep_audit_data;
  const health = audit ? auditHealth(audit) : null;
  const inspected = health === "ok";
  const problems = audit ? describeSiteProblems(audit) : [];
  const busy = isScanning || isSpeedTesting;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-6 mb-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4 mb-5">
        <div>
          <h2 className="text-xs font-mono font-bold tracking-widest text-slate-400 uppercase">
            Web Sitesi Satış İstihbaratı
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {hasWebsite
              ? `Hedef: ${business.website}`
              : "Bu işletmenin gerçek bir web sitesi bulunmuyor."}
            {audit && (
              <span className="text-slate-400"> • Son tarama {new Date(audit.created_at).toLocaleString("tr-TR")}</span>
            )}
          </p>
        </div>

        {hasWebsite && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleScan}
              disabled={busy}
              className="h-9 px-3.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition shadow-2xs disabled:opacity-50 flex items-center gap-1.5"
            >
              {isScanning ? (
                <>
                  <span className="inline-block w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
                  Taranıyor...
                </>
              ) : (
                "Yeniden Tara"
              )}
            </button>
            {inspected && (
              <button
                onClick={handleSpeedTest}
                disabled={busy}
                title="Google PageSpeed Insights ile mobil hız puanını ölçer (~20-40 sn)"
                className="h-9 px-3.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSpeedTesting ? (
                  <>
                    <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Google test ediyor...
                  </>
                ) : (
                  "Google Hız Testi"
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {feedback && (
        <div
          className={`mb-4 p-3 rounded-xl text-xs border ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {hasWebsite && !audit ? (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-xs">
          <span className="inline-block w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mb-3"></span>
          <p className="text-slate-700 font-bold text-sm">Web sitesi taranıyor...</p>
          <p className="text-slate-500 mt-1">Erişim, SSL, mobil uyum ve iletişim butonları kontrol ediliyor.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {audit && health && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3">
                <span className="text-slate-400 font-mono text-[10px] uppercase tracking-wider block mb-1">Durum</span>
                <span className={`font-semibold inline-flex items-center gap-1.5 ${HEALTH_LABEL[health].tone}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${HEALTH_LABEL[health].dot}`}></span>
                  {HEALTH_LABEL[health].text}
                </span>
                {d?.healthDetail && <span className="block text-[10px] text-slate-500 mt-1">{d.healthDetail}</span>}
              </div>

              {inspected && (
                <>
                  {d?.pageSpeed ? (
                    <Tile
                      label="Google Mobil Hız"
                      value={`${d.pageSpeed.score}/100${d.pageSpeed.lcpMs ? ` • ${(d.pageSpeed.lcpMs / 1000).toFixed(1)}s` : ""}`}
                      tone={d.pageSpeed.score < 50 ? "text-rose-600" : d.pageSpeed.score < 80 ? "text-amber-600" : "text-emerald-700"}
                    />
                  ) : (
                    <Tile
                      label="Sunucu Yanıtı"
                      value={(audit.response_time_ms || 0) > SLOW_SERVER_MS ? "Yavaş" : "Normal"}
                      tone={(audit.response_time_ms || 0) > SLOW_SERVER_MS ? "text-rose-600" : "text-emerald-700"}
                    />
                  )}
                  <Tile
                    label="Mobil Uyum"
                    value={audit.has_viewport ? "Uyumlu" : "Mobil Uyumsuz"}
                    tone={audit.has_viewport ? "text-emerald-700" : "text-rose-600"}
                  />
                  <Tile
                    label="WhatsApp / Arama"
                    value={`${d?.hasWhatsApp ? "WA var" : "WA yok"} • ${d?.hasCallButton ? "Tel var" : "Tel yok"}`}
                    tone={d?.hasWhatsApp ? "text-emerald-700" : "text-amber-700"}
                  />
                  <Tile
                    label="Güvenlik"
                    value={
                      d?.sslIssue === "expired"
                        ? "Sertifika süresi dolmuş"
                        : d?.sslIssue === "invalid"
                        ? "Sertifika geçersiz"
                        : audit.is_https
                        ? "HTTPS"
                        : "HTTPS yok"
                    }
                    tone={
                      d?.sslIssue === "expired" || d?.sslIssue === "invalid" || !audit.is_https
                        ? "text-rose-600"
                        : "text-emerald-700"
                    }
                  />
                </>
              )}
            </div>
          )}

          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-5 text-xs text-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-mono font-bold text-blue-950 uppercase tracking-wider flex items-center gap-2">
                <span>📞</span> Aramada Kullanılacak Açılış
              </h4>
              <button
                onClick={() => handleCopyPitch(pitch)}
                className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 bg-white border border-blue-200 px-2.5 py-1 rounded-lg shadow-2xs transition"
              >
                {copiedPitch ? "Kopyalandı ✓" : "Metni Kopyala"}
              </button>
            </div>
            <p className="text-slate-800 leading-relaxed font-medium bg-white border border-blue-100/80 rounded-xl p-3.5 shadow-2xs">
              &ldquo;{pitch}&rdquo;
            </p>

            {problems.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide block">
                  Müşteriye Söylenebilecek Somut Sorunlar:
                </span>
                <ul className="space-y-1.5 text-slate-700">
                  {problems.map((prob) => (
                    <li key={prob} className="flex items-start gap-2">
                      <span className="text-rose-600 font-bold">✕</span>
                      <span>{prob}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {inspected && problems.length === 0 && (
              <p className="text-slate-600">Belirgin bir teknik sorun bulunamadı; bu işletme düşük öncelikli.</p>
            )}
          </div>

          {audit && inspected && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="border border-slate-200/80 rounded-xl p-4 space-y-2">
                <h4 className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                  Web Sitesi Altyapısı
                </h4>
                {audit.technologies && audit.technologies.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {audit.technologies.map((tech) => (
                      <span
                        key={tech}
                        className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded-md text-[11px] font-medium"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">Özel HTML veya belirsiz altyapı.</p>
                )}
                {d?.copyrightYear && (
                  <p className={isOutdatedYear(d.copyrightYear) ? "text-rose-600 font-semibold" : "text-slate-500"}>
                    Telif yılı: {d.copyrightYear}
                  </p>
                )}
              </div>

              <div className="border border-slate-200/80 rounded-xl p-4 space-y-2">
                <h4 className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                  Siteden Çıkarılan İletişim Kanalları
                </h4>
                <div className="space-y-1.5">
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">Telefon:</span>
                    <span className="font-mono text-slate-900 font-medium text-right">
                      {audit.contact_phones?.length ? audit.contact_phones.join(", ") : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">E-posta:</span>
                    <span className="font-mono text-slate-900 text-right break-all">
                      {audit.contact_emails?.length ? audit.contact_emails.join(", ") : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
