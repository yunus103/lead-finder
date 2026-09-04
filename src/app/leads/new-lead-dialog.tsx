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
        className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-3.5 py-2 rounded-lg transition shadow-sm"
      >
        + Test İşletme Ekle
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-900">Test İşletme Girişi</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Ana işletme oluşturma ve kademeli tekilleştirme mekanizmasını (Place ID, Telefon, Alan Adı, Instagram, İsim+Şehir) test edin.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-700 font-medium mb-1">
                  İşletme Adı *
                </label>
                <input
                  name="name"
                  required
                  placeholder="Örn: Kadıköy Diş Kliniği"
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">
                    Kaynak Sağlayıcı
                  </label>
                  <select
                    name="provider"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  >
                    <option value="google_maps">Google Haritalar</option>
                    <option value="google_search">Google Arama</option>
                    <option value="instagram">Instagram</option>
                    <option value="manual">Manuel Giriş</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">
                    Google Place ID
                  </label>
                  <input
                    name="external_id"
                    placeholder="ChIJ... (isteğe bağlı)"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">
                    Kategori / Sektör
                  </label>
                  <input
                    name="category"
                    placeholder="Örn: Diş Hekimi"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">
                    Telefon
                  </label>
                  <input
                    name="phone"
                    placeholder="0532 123 45 67"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">
                    Web Sitesi URL
                  </label>
                  <input
                    name="website"
                    placeholder="https://example.com"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">
                    Instagram Kullanıcı Adı
                  </label>
                  <input
                    name="instagram"
                    placeholder="@klinik_hesabi"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">
                    Şehir
                  </label>
                  <input
                    name="city"
                    placeholder="İstanbul"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-700 font-medium mb-1">
                    İlçe
                  </label>
                  <input
                    name="district"
                    placeholder="Kadıköy"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              {statusMessage && (
                <div
                  className={`text-xs p-2.5 rounded border ${
                    statusMessage.startsWith("Başarılı")
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-rose-50 border-rose-200 text-rose-800"
                  }`}
                >
                  {statusMessage}
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 transition"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs px-4 py-1.5 rounded transition shadow-sm"
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
