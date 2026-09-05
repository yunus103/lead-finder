"use client";

import { useState } from "react";
import { ingestLeadAction } from "./actions";

export function NewLeadDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setStatusMessage(null);

    const formData = new FormData(e.currentTarget);
    const res = await ingestLeadAction(formData);

    setLoading(false);
    if (res.success) {
      if (res.isNew) {
        setStatusMessage("Başarılı: Yeni ana işletme kaydı oluşturuldu!");
      } else {
        const matchLabel =
          res.matchedBy === "phone"
            ? "Telefon"
            : res.matchedBy === "website_domain"
            ? "Web Sitesi Alan Adı"
            : res.matchedBy === "instagram"
            ? "Instagram"
            : res.matchedBy === "google_place_id"
            ? "Google Place ID"
            : "İsim ve Şehir";
        setStatusMessage(`Başarılı: Mevcut işletme [${matchLabel}] ile eşleşti ve eksik veriler zenginleştirildi!`);
      }
      setTimeout(() => {
        setIsOpen(false);
        setStatusMessage(null);
      }, 2000);
    } else {
      setStatusMessage(`Hata: ${res.error}`);
    }
  }

  return (
    <div>
      <button
        onClick={() => setIsOpen(true)}
        className="h-10 px-4 bg-slate-950 hover:bg-slate-800 active:bg-black text-white font-bold text-xs rounded-xl transition shadow-xs inline-flex items-center gap-1.5"
      >
        + Yeni Aday Ekle
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200/90 rounded-2xl max-w-lg w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-950">Yeni İşletme Kaydı Ekle</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              İşletme bilgilerini girin. Sistem otomatik tekilleştirme ve öncelik puanlama motorunu devreye sokacaktır.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs text-slate-700 font-semibold mb-1">
                  İşletme Adı *
                </label>
                <input
                  name="name"
                  required
                  placeholder="Örn: Kadıköy Diş Kliniği"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-700 font-semibold mb-1">Telefon</label>
                  <input
                    name="phone"
                    placeholder="Örn: 05321234567"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-700 font-semibold mb-1">Kategori / Sektör</label>
                  <input
                    name="category"
                    placeholder="Örn: Diş Hekimi, Avukat"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-700 font-semibold mb-1">İl (City)</label>
                  <input
                    name="city"
                    placeholder="Örn: İstanbul"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-700 font-semibold mb-1">İlçe (District)</label>
                  <input
                    name="district"
                    placeholder="Örn: Kadıköy"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-700 font-semibold mb-1">Web Sitesi URL</label>
                  <input
                    name="website_url"
                    placeholder="Örn: https://example.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-700 font-semibold mb-1">Instagram (@kullanıcı)</label>
                  <input
                    name="instagram"
                    placeholder="Örn: @klinikadi"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-700 font-semibold mb-1">Google Puanı (Rating)</label>
                  <input
                    name="rating"
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    placeholder="Örn: 4.8"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-700 font-semibold mb-1">Yorum Sayısı</label>
                  <input
                    name="review_count"
                    type="number"
                    min="0"
                    placeholder="Örn: 45"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {statusMessage && (
                <div
                  className={`text-xs p-3 rounded-xl border ${
                    statusMessage.startsWith("Başarılı")
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-rose-50 border-rose-200 text-rose-800"
                  }`}
                >
                  {statusMessage}
                </div>
              )}

              <div className="flex justify-end items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-950 transition"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-xs"
                >
                  {loading ? "Kaydediliyor..." : "İşletmeyi Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
