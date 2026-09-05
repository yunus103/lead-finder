"use client";

import { useState, useTransition } from "react";
import { Business } from "@/types/business";
import { ScoreReason } from "@/types/scoring";
import { recalculateScoreAction } from "../actions";

interface LeadScoreCardProps {
  business: Business;
}

export function LeadScoreCard({ business }: LeadScoreCardProps) {
  const [score, setScore] = useState(business.lead_score || 0);
  const [priority, setPriority] = useState(business.priority || "LOW");
  const [reasons, setReasons] = useState<ScoreReason[]>(business.score_reasons || []);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleRecalculate = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await recalculateScoreAction(business.id);
      if (res.success && res.result) {
        setScore(res.result.score);
        setPriority(res.result.priority);
        setReasons(res.result.reasons);
        setFeedback("Skor başarıyla güncellendi.");
      } else {
        setFeedback(res.error || "Skor hesaplanırken bir hata oluştu.");
      }
    });
  };

  const getPriorityStyle = (p: string) => {
    switch (p) {
      case "HOT":
        return {
          badge: "bg-rose-50 text-rose-700 border-rose-200",
          progress: "bg-rose-600",
          text: "YÜKSEK ÖNCELİK (HOT)",
        };
      case "WARM":
        return {
          badge: "bg-amber-50 text-amber-700 border-amber-200",
          progress: "bg-amber-500",
          text: "ORTA ÖNCELİK (WARM)",
        };
      case "COLD":
        return {
          badge: "bg-blue-50 text-blue-700 border-blue-200",
          progress: "bg-blue-500",
          text: "DÜŞÜK ÖNCELİK (COLD)",
        };
      default:
        return {
          badge: "bg-slate-100 text-slate-700 border-slate-200",
          progress: "bg-slate-400",
          text: "ÖNCELİKSİZ (LOW)",
        };
    }
  };

  const style = getPriorityStyle(priority);

  return (
    <div className="border border-slate-200 bg-white rounded-xl p-6 mb-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 tracking-wide uppercase">
              Aday Öncelik Skoru (Lead Score)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Deterministik satış uygunluğu ve arama önceliği değerlendirmesi (0–100)
            </p>
          </div>
        </div>

        <button
          onClick={handleRecalculate}
          disabled={isPending}
          className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50 transition shadow-sm disabled:opacity-50 flex items-center gap-1.5 self-start sm:self-auto"
        >
          {isPending ? (
            <>
              <span className="inline-block w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
              Hesaplanıyor...
            </>
          ) : (
            "Puanı Yeniden Hesapla"
          )}
        </button>
      </div>

      {feedback && (
        <div className="mb-4 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
          {feedback}
        </div>
      )}

      {/* Main Score Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Score & Gauge */}
        <div className="flex items-center gap-4 bg-slate-50/80 border border-slate-200 rounded-xl p-4">
          <div className="text-center">
            <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
              {score}
            </span>
            <span className="text-slate-400 text-xs block">/ 100</span>
          </div>

          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${style.badge}`}>
                {style.text}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${style.progress}`}
                style={{ width: `${Math.min(100, Math.max(5, score))}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Reasons / Explainability List */}
        <div className="md:col-span-2">
          <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-2.5">
            Neden Bu Skor? ({reasons.length} Kriter)
          </h4>

          {reasons.length === 0 ? (
            <p className="text-xs text-slate-400 italic">
              Henüz puan kriteri kaydedilmedi. &quot;Puanı Yeniden Hesapla&quot; butonuna basarak ilk puanı oluşturabilirsiniz.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {reasons.map((reason, idx) => (
                <div
                  key={idx}
                  className={`flex items-start justify-between p-2 rounded-lg border ${
                    reason.type === "positive"
                      ? "bg-emerald-50/40 border-emerald-100 text-slate-800"
                      : "bg-rose-50/40 border-rose-100 text-slate-800"
                  }`}
                >
                  <span className="flex items-center gap-1.5 leading-snug">
                    <span
                      className={`font-bold ${
                        reason.type === "positive" ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {reason.type === "positive" ? "✓" : "−"}
                    </span>
                    <span>{reason.label}</span>
                  </span>
                  <span
                    className={`font-mono text-[11px] font-semibold ml-2 whitespace-nowrap ${
                      reason.type === "positive" ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {reason.points > 0 ? `+${reason.points}` : reason.points}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
