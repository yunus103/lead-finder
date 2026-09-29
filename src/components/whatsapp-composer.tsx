"use client";

import { useState } from "react";
import { buildWhatsAppUrl } from "@/lib/outreach";
import { logWhatsAppAction } from "@/app/leads/actions";
import { CrmStatus } from "@/types/crm";

interface WhatsAppComposerProps {
  businessId: string;
  whatsappNumber: string;
  initialMessage: string;
  onSent?: (message: string, nextStatus?: CrmStatus) => void;
  onClose: () => void;
}

/**
 * Editable first-contact message. Opening WhatsApp logs the message to the activity timeline.
 */
export function WhatsAppComposer({ businessId, whatsappNumber, initialMessage, onSent, onClose }: WhatsAppComposerProps) {
  const [message, setMessage] = useState(initialMessage);
  const [copied, setCopied] = useState(false);

  const handleOpen = () => {
    logWhatsAppAction(businessId, message).then((res) => {
      if (res.success) onSent?.(message, "nextStatus" in res ? res.nextStatus : undefined);
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="col-span-full w-full basis-full bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-2.5 text-slate-900">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-emerald-900">WhatsApp mesajı (göndermeden önce düzenleyebilirsin)</span>
        <button type="button" onClick={onClose} className="text-xs text-slate-500 hover:text-slate-900 font-semibold">
          Kapat
        </button>
      </div>
      <textarea
        rows={7}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="w-full text-xs leading-relaxed p-3 rounded-lg border border-emerald-200 bg-white focus:outline-none focus:border-emerald-500"
      />
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="h-9 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
        >
          {copied ? "✓ Kopyalandı" : "Kopyala"}
        </button>
        <a
          href={buildWhatsAppUrl(whatsappNumber, message)}
          target="_blank"
          rel="noreferrer"
          onClick={handleOpen}
          className="h-9 px-4 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold transition inline-flex items-center gap-1.5"
        >
          💬 WhatsApp&apos;ta Aç
        </a>
      </div>
    </div>
  );
}
