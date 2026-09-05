"use client";

import { useTransition, useState } from "react";
import { recalculateAllScoresAction } from "./actions";

export function RecalculateAllButton() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const handleClick = () => {
    setMessage(null);
    startTransition(async () => {
      const res = await recalculateAllScoresAction();
      if (res.success) {
        setMessage(`${res.count} işletmenin skoru güncellendi.`);
        setTimeout(() => setMessage(null), 4000);
      } else {
        setMessage(res.error || "Hata oluştu.");
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      {message && (
        <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
          {message}
        </span>
      )}
      <button
        onClick={handleClick}
        disabled={isPending}
        className="h-10 px-4 bg-white border border-slate-200/90 hover:border-slate-300 text-slate-700 hover:text-slate-950 text-xs font-bold rounded-xl transition shadow-xs disabled:opacity-50 inline-flex items-center gap-2"
      >
        {isPending ? (
          <>
            <span className="inline-block w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
            Yenileniyor...
          </>
        ) : (
          "⚡ Skorları Güncelle"
        )}
      </button>
    </div>
  );
}
