import Link from "next/link";
import { getDashboardData } from "@/services/dashboard-service";

export const dynamic = "force-dynamic";

function formatTimeAgo(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return "Az önce";
    if (diffMinutes < 60) return `${diffMinutes} dk önce`;
    if (diffHours < 24) return `${diffHours} sa önce`;
    if (diffDays === 1) return "Dün";
    return date.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
  } catch {
    return isoString;
  }
}

function formatFollowUpDate(isoString: string): { label: string; isOverdue: boolean } {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const isOverdue = date < now;
    const timeStr = date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    const dateStr = date.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });

    return {
      label: `${dateStr} ${timeStr}`,
      isOverdue,
    };
  } catch {
    return { label: isoString, isOverdue: false };
  }
}

export default async function HomePage() {
  const data = await getDashboardData();
  const { pipeline, dueFollowUps, hotQueueLeads, recentActivities } = data;

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Header & Primary Daily CTA */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                ● Canlı Satış Paneli
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Yaytech Studio Dahili Arama Aracı
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-2">
              Günlük Satış & Arama Komutası
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Aranmayı bekleyen adayları inceleyin, zamanı gelen geri aramaları tamamlayın ve
              yüksek öncelikli işletmelerle iletişime geçin.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/queue"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm shadow-md transition transform hover:-translate-y-0.5"
            >
              <span>📞 Güne Başla / Arama Sırası</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-700/80 text-xs font-bold">
                {pipeline.toCall} Aday
              </span>
              <span>→</span>
            </Link>

            <Link
              href="/discover"
              className="inline-flex items-center gap-1.5 px-4 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm transition"
            >
              <span>🔍 Yeni Keşfet</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Urgent Due Follow-ups Banner */}
      {dueFollowUps.length > 0 && (
        <section className="bg-amber-50/70 border-2 border-amber-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
              <h2 className="text-base font-bold text-amber-950 tracking-tight">
                Zamanı Gelen Takip Aramaları ({dueFollowUps.length})
              </h2>
            </div>
            <Link
              href="/leads?crmTab=follow_ups"
              className="text-xs font-semibold text-amber-800 hover:text-amber-950 underline underline-offset-2"
            >
              Tüm Takipleri Gör →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {dueFollowUps.map((lead) => {
              const timing = formatFollowUpDate(lead.next_follow_up_at);
              return (
                <div
                  key={lead.id}
                  className="bg-white border border-amber-200/90 rounded-xl p-4 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                        {[lead.category, lead.district].filter(Boolean).join(" • ") || "İşletme"}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          timing.isOverdue
                            ? "bg-rose-100 text-rose-700 border border-rose-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {timing.isOverdue ? "⚠️ Gecikmiş" : timing.label}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 line-clamp-1 mb-1">
                      {lead.name}
                    </h3>

                    {lead.notes && (
                      <p className="text-xs text-slate-600 line-clamp-2 italic bg-slate-50 p-2 rounded-lg border border-slate-100 mb-3">
                        &ldquo;{lead.notes}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 mt-2">
                    <span className="text-xs font-semibold text-slate-700">
                      {lead.phone || "Telefon Yok"}
                    </span>

                    <Link
                      href={`/queue?leadId=${lead.id}`}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-semibold transition"
                    >
                      Hemen Ara →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. Pipeline Metrics Bar */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Satış Boru Hattı & Havuz Durumu
          </h2>
          <Link
            href="/leads"
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
          >
            Adaylar Tablosu →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Link
            href="/leads?crmTab=to_call"
            className="bg-white border border-slate-200 hover:border-emerald-300 p-4 rounded-xl shadow-xs transition group"
          >
            <div className="text-xs font-medium text-slate-500 group-hover:text-emerald-700">
              📞 Aranacaklar
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">
              {pipeline.toCall}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium mt-1">
              {pipeline.hotUntouchedCount} HOT Aday
            </div>
          </Link>

          <Link
            href="/leads?crmTab=follow_ups"
            className="bg-white border border-slate-200 hover:border-amber-300 p-4 rounded-xl shadow-xs transition group"
          >
            <div className="text-xs font-medium text-slate-500 group-hover:text-amber-700">
              ⏰ Geri Aramalar
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">
              {pipeline.followUps}
            </div>
            <div className="text-[11px] text-amber-600 font-medium mt-1">
              {pipeline.dueFollowUpsCount} Zamanı Geldi
            </div>
          </Link>

          <Link
            href="/leads?crmTab=opportunities"
            className="bg-white border border-slate-200 hover:border-indigo-300 p-4 rounded-xl shadow-xs transition group"
          >
            <div className="text-xs font-medium text-slate-500 group-hover:text-indigo-700">
              🔥 Sıcak Fırsatlar
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">
              {pipeline.opportunities}
            </div>
            <div className="text-[11px] text-indigo-600 font-medium mt-1">İlgilendi / Toplantı</div>
          </Link>

          <Link
            href="/leads?crmTab=all"
            className="bg-white border border-slate-200 hover:border-emerald-300 p-4 rounded-xl shadow-xs transition group"
          >
            <div className="text-xs font-medium text-slate-500 group-hover:text-emerald-700">
              🤝 Kazanılan (Won)
            </div>
            <div className="text-2xl font-bold text-emerald-600 mt-1 tracking-tight">
              {pipeline.won}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">Başarılı Satış</div>
          </Link>

          <Link
            href="/leads?crmTab=all"
            className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs transition"
          >
            <div className="text-xs font-medium text-slate-500">Ulaşılan / Red</div>
            <div className="text-2xl font-bold text-slate-700 mt-1 tracking-tight">
              {pipeline.contacted + pipeline.lost}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-1">
              {pipeline.contacted} Ulaşıldı • {pipeline.lost} Red
            </div>
          </Link>

          <Link
            href="/leads"
            className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs transition"
          >
            <div className="text-xs font-medium text-slate-500">Toplam Kayıtlı</div>
            <div className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">
              {pipeline.total}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-1">
              {pipeline.excluded} Dışlanan
            </div>
          </Link>
        </div>
      </section>

      {/* 4. Two-Column Operational Desk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Top Priority Leads Ready to Dial */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  🔥 Aranmaya Hazır HOT Adaylar
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Web sitesi fırsatı yüksek ve henüz aranmamış öncelikli adaylar
                </p>
              </div>
              <Link
                href="/queue"
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
              >
                Sıraya Başla →
              </Link>
            </div>

            {hotQueueLeads.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Sırada bekleyen HOT aday yok. Yeni işletmeler keşfedebilir veya diğer kategorileri arayabilirsiniz.
              </div>
            ) : (
              <div className="space-y-3">
                {hotQueueLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 rounded-xl p-3.5 transition flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                          {lead.lead_score} PUAN
                        </span>
                        <span className="text-[11px] text-slate-500 truncate">
                          {[lead.category, lead.district].filter(Boolean).join(" • ")}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900 truncate">
                        {lead.name}
                      </h3>
                      <div className="text-xs font-medium text-slate-600 mt-0.5">
                        {lead.phone || "Telefon Yok"}
                      </div>
                    </div>

                    <Link
                      href={`/queue?leadId=${lead.id}`}
                      className="shrink-0 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition"
                    >
                      Arama Yap →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 text-center">
            <Link
              href="/queue"
              className="text-xs font-semibold text-slate-700 hover:text-slate-900"
            >
              Tüm Adayları Arama Sırasında Aç ({pipeline.toCall}) →
            </Link>
          </div>
        </section>

        {/* Right Column: Live Recent Activities */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  ⚡ Son Arama & İletişim Hareketleri
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Yapılan son aramalar, sonuçlar ve kaydedilen notlar
                </p>
              </div>
              <span className="text-xs font-medium text-slate-400">Canlı Akış</span>
            </div>

            {recentActivities.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Henüz arama veya CRM hareketi kaydedilmedi.
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivities.map((act) => {
                  const isCall = act.type === "call";
                  const isInterested = act.outcome === "interested" || act.outcome === "meeting";
                  const isCallback = act.outcome === "callback";
                  const isNoAnswer = act.outcome === "no_answer";

                  return (
                    <div
                      key={act.id}
                      className="border border-slate-100 bg-white rounded-xl p-3 shadow-2xs flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              isInterested
                                ? "bg-emerald-100 text-emerald-800"
                                : isCallback
                                ? "bg-amber-100 text-amber-800"
                                : isNoAnswer
                                ? "bg-slate-100 text-slate-700"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {act.outcome === "no_answer"
                              ? "📵 Cevap Yok"
                              : act.outcome === "callback"
                              ? "⏰ Geri Ara"
                              : act.outcome === "interested"
                              ? "🔥 İlgilendi"
                              : act.outcome === "meeting"
                              ? "🤝 Toplantı"
                              : act.outcome === "rejected"
                              ? "❌ Red"
                              : isCall
                              ? "📞 Arama"
                              : "📝 İşlem"}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {formatTimeAgo(act.created_at)}
                          </span>
                        </div>

                        <Link
                          href={`/leads/${act.business_id}`}
                          className="text-xs font-bold text-slate-900 hover:text-emerald-700 line-clamp-1 transition"
                        >
                          {act.business_name}
                        </Link>

                        {act.content && (
                          <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">
                            {act.content}
                          </p>
                        )}
                      </div>

                      <Link
                        href={`/leads/${act.business_id}`}
                        className="shrink-0 text-[11px] font-medium text-slate-400 hover:text-slate-700 p-1.5"
                        title="İşletme Kokpitine Git"
                      >
                        İncele ↗
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Sistem: Aktif</span>
            <Link href="/discover" className="font-semibold text-slate-700 hover:text-slate-900">
              Keşif & Tarama Geçmişi →
            </Link>
          </div>
        </section>
      </div>

      {/* 5. Quick Workflow Launch Footer */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
        <Link
          href="/discover"
          className="border border-slate-200 bg-white hover:border-slate-300 p-5 rounded-xl shadow-xs transition group"
        >
          <div className="text-2xl mb-2">🔍</div>
          <div className="font-bold text-sm text-slate-900 group-hover:text-emerald-600 transition">
            Yeni Müşteri Keşfet
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Google Haritalar üzerinden lokasyon ve sektöre göre yeni işletmeleri tara ve puanla.
          </div>
        </Link>

        <Link
          href="/queue"
          className="border border-slate-200 bg-white hover:border-emerald-300 p-5 rounded-xl shadow-xs transition group"
        >
          <div className="text-2xl mb-2">⚡</div>
          <div className="font-bold text-sm text-slate-900 group-hover:text-emerald-600 transition">
            Arama Sırası (Power Hour)
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Sıfır kaydırma ekranında hazır satış açılışı ile tek tıkla ara ve sonraki adaya geç.
          </div>
        </Link>

        <Link
          href="/leads"
          className="border border-slate-200 bg-white hover:border-slate-300 p-5 rounded-xl shadow-xs transition group"
        >
          <div className="text-2xl mb-2">📋</div>
          <div className="font-bold text-sm text-slate-900 group-hover:text-emerald-600 transition">
            Aday Havuzunu Yönet
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Filtreler, durum sekmeleri, dışlama yönetimi ve detaylı web sitesi denetimleri.
          </div>
        </Link>
      </section>
    </main>
  );
}
