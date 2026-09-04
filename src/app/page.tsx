import Link from "next/link";
import { checkSupabaseConnection } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const connection = await checkSupabaseConnection();

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="border border-slate-200 bg-white p-8 rounded-xl shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 pb-6 mb-6">
          <div>
            <span className="text-xs font-semibold tracking-wider text-emerald-600 uppercase">
              Aşama 01 & 02 — Temel Altyapı & İşletme Yönetimi
            </span>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight mt-1">
              Yaytech Lead Intelligence
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Dahili potansiyel müşteri keşif ve satış yönetim platformu
            </p>
          </div>
          <div className="text-right">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                connection.connected
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}
            >
              <span
                className={`w-2 h-2 mr-2 rounded-full ${
                  connection.connected ? "bg-emerald-500" : "bg-rose-500"
                }`}
              />
              {connection.connected ? "Veritabanı Hazır" : "Veritabanı Bağlantısı Yok"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="border border-slate-200 bg-slate-50/80 p-4 rounded-lg">
            <div className="text-xs text-slate-500 font-medium">Uygulama İskeleti</div>
            <div className="text-sm font-semibold text-slate-900 mt-1">Next.js 15 (App Router)</div>
            <div className="text-xs text-emerald-600 font-medium mt-2">Aktif</div>
          </div>

          <div className="border border-slate-200 bg-slate-50/80 p-4 rounded-lg">
            <div className="text-xs text-slate-500 font-medium">Stil & Tip Güvenliği</div>
            <div className="text-sm font-semibold text-slate-900 mt-1">Tailwind CSS + TypeScript</div>
            <div className="text-xs text-emerald-600 font-medium mt-2">Aktif</div>
          </div>

          <div className="border border-slate-200 bg-slate-50/80 p-4 rounded-lg">
            <div className="text-xs text-slate-500 font-medium">PostgreSQL / Supabase</div>
            <div className="text-sm font-semibold text-slate-900 mt-1">
              {connection.connected ? "Bağlandı" : "Kontrol Edin"}
            </div>
            <div
              className={`text-xs mt-2 ${
                connection.connected ? "text-emerald-600 font-medium" : "text-rose-600"
              }`}
            >
              {connection.connected ? "Tablolar ve İndeksler Aktif" : connection.message}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
              İşletme Yönetimi
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Tekilleştirilmiş ana işletme kayıtları ve çok kaynaklı veri bağlama.
            </p>
          </div>
          <Link
            href="/leads"
            className="inline-flex items-center px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition shadow-sm"
          >
            İşletmelere Git →
          </Link>
        </div>
      </div>
    </main>
  );
}
