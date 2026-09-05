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
        className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium rounded-lg transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
      >
        {isPending ? (
          <>
            <span className="inline-block w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
            Yenileniyor...
          </>
        ) : (
          "Tüm Skorları Güncelle"
        )}
      </button>
    </div>
  );
}
