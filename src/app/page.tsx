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

  const todayFormatted = new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Header & Primary Daily CTA */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
                Canlı Satış Paneli
              </span>
              <span className="text-xs font-mono text-slate-500 capitalize">
                {todayFormatted}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
              Günlük Satış & Arama Komutası
            </h1>

            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
              Bugün havuzda aranmayı bekleyen <strong className="text-slate-900 font-semibold">{pipeline.toCall}</strong> aday ve zamanı gelen{" "}
              <strong className="text-slate-900 font-semibold">{pipeline.dueFollowUpsCount}</strong> takip araması var.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/queue"
              className="inline-flex items-center gap-3 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm shadow-sm transition hover:shadow-md"
            >
              <span>📞 Güne Başla / Arama Sırası</span>
              <span className="px-2.5 py-0.5 rounded-md bg-blue-700 text-xs font-mono font-extrabold tracking-wide">
                {pipeline.toCall} Aday
              </span>
              <span className="font-mono text-sm">→</span>
            </Link>

            <Link
              href="/discover"
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-semibold text-sm transition shadow-sm"
            >
              <span>🔍 Yeni Keşfet</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Urgent Due Follow-ups Banner */}
      {dueFollowUps.length > 0 && (
        <section className="bg-amber-50/70 border border-amber-200/90 border-l-4 border-l-amber-500 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <h2 className="text-base font-bold text-amber-950 tracking-tight">
                Zamanı Gelen Takip Aramaları ({dueFollowUps.length})
              </h2>
            </div>
            <Link
              href="/leads?crmTab=follow_ups"
              className="text-xs font-bold text-amber-900 hover:underline underline-offset-4"
            >
              Tüm Takipleri Gör →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dueFollowUps.map((lead) => {
              const timing = formatFollowUpDate(lead.next_follow_up_at);
              return (
                <div
                  key={lead.id}
                  className="bg-white border border-amber-200 rounded-xl p-5 shadow-2xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-xs font-semibold text-slate-500 truncate">
                        {[lead.category, lead.district].filter(Boolean).join(" • ") || "İşletme"}
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                          timing.isOverdue
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {timing.isOverdue ? "⚠️ Gecikmiş" : timing.label}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-950 line-clamp-1 mb-2">
                      {lead.name}
                    </h3>

                    {lead.notes && (
                      <p className="text-xs text-slate-600 line-clamp-2 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100 mb-4">
                        &ldquo;{lead.notes}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                    <span className="font-mono text-xs font-bold text-slate-800">
                      {lead.phone || "Telefon Yok"}
                    </span>

                    <Link
                      href={`/queue?leadId=${lead.id}`}
                      className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold transition shadow-2xs"
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

      {/* 3. Pipeline Metrics Bar (4 Spacious Core Metric Cards + Elegant Summary Strip) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Satış Boru Hattı & Havuz Durumu
          </h2>
          <Link
            href="/leads"
            className="text-xs font-bold text-blue-600 hover:text-blue-700"
          >
            Adaylar Tablosu →
          </Link>
        </div>

        {/* 4 Core Primary Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: To Call */}
          <Link
            href="/leads?crmTab=to_call"
            className="bg-white border border-slate-200/90 hover:border-blue-300 p-6 rounded-2xl shadow-xs transition group flex flex-col justify-between h-36"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 group-hover:text-blue-600 transition">
                📞 Aranacaklar
              </span>
              <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-md">
                {pipeline.hotUntouchedCount} HOT Aday
              </span>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-950 tracking-tight">
              {pipeline.toCall}
            </div>
            <div className="text-xs font-medium text-slate-500">
              Henüz aranmamış aktif adaylar
            </div>
          </Link>

          {/* Card 2: Follow-ups */}
          <Link
            href="/leads?crmTab=follow_ups"
            className="bg-white border border-slate-200/90 hover:border-amber-300 p-6 rounded-2xl shadow-xs transition group flex flex-col justify-between h-36"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 group-hover:text-amber-600 transition">
                ⏰ Geri Aramalar
              </span>
              <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md">
                {pipeline.dueFollowUpsCount} Zamanı Geldi
              </span>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-950 tracking-tight">
              {pipeline.followUps}
            </div>
            <div className="text-xs font-medium text-slate-500">
              Randevu & takip bekleyenler
            </div>
          </Link>

          {/* Card 3: Opportunities */}
          <Link
            href="/leads?crmTab=opportunities"
            className="bg-white border border-slate-200/90 hover:border-purple-300 p-6 rounded-2xl shadow-xs transition group flex flex-col justify-between h-36"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 group-hover:text-purple-600 transition">
                🔥 Sıcak Fırsatlar
              </span>
              <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200/80 px-2 py-0.5 rounded-md">
                Aktif Süreç
              </span>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-950 tracking-tight">
              {pipeline.opportunities}
            </div>
            <div className="text-xs font-medium text-slate-500">
              İlgilendi ve teklif aşamasında
            </div>
          </Link>

          {/* Card 4: Won */}
          <Link
            href="/leads?crmTab=all"
            className="bg-white border border-slate-200/90 hover:border-emerald-300 p-6 rounded-2xl shadow-xs transition group flex flex-col justify-between h-36"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 group-hover:text-emerald-600 transition">
                🤝 Kazanılan (Won)
              </span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md">
                Başarılı Satış
              </span>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-emerald-600 tracking-tight">
              {pipeline.won}
            </div>
            <div className="text-xs font-medium text-slate-500">
              Anlaşma sağlanan müşteriler
            </div>
          </Link>
        </div>

        {/* Secondary Metric Bar */}
        <div className="bg-white border border-slate-200/90 rounded-xl px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-slate-600">
            <div>
              <span className="text-slate-400">Toplam Havuz: </span>
              <span className="font-mono font-bold text-slate-950">{pipeline.total}</span>
            </div>
            <div className="h-3 w-px bg-slate-200 hidden sm:block" />
            <div>
              <span className="text-slate-400">İletişim Kuruldu: </span>
              <span className="font-mono font-bold text-slate-800">{pipeline.contacted}</span>
            </div>
            <div className="h-3 w-px bg-slate-200 hidden sm:block" />
            <div>
              <span className="text-slate-400">Reddedilen: </span>
              <span className="font-mono font-bold text-slate-800">{pipeline.lost}</span>
            </div>
            <div className="h-3 w-px bg-slate-200 hidden sm:block" />
            <div>
              <span className="text-slate-400">Dışlanan / Uygunsuz: </span>
              <span className="font-mono font-bold text-slate-800">{pipeline.excluded}</span>
            </div>
          </div>

          <Link
            href="/leads"
            className="font-bold text-blue-600 hover:text-blue-700 hover:underline underline-offset-4"
          >
            Tüm Havuzu Yönet →
          </Link>
        </div>
      </section>

      {/* 4. Two-Column Operational Desk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Top Priority Leads Ready to Dial */}
        <section className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-950 tracking-tight">
                  🔥 Aranmaya Hazır HOT Adaylar
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Web sitesi fırsatı yüksek ve henüz aranmamış öncelikli adaylar
                </p>
              </div>
              <Link
                href="/queue"
                className="text-xs font-bold text-blue-600 hover:text-blue-700"
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
                    className="border border-slate-200/80 hover:border-slate-300 bg-slate-50/40 hover:bg-slate-50/80 rounded-xl p-4 transition flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md font-mono text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          {lead.lead_score} PUAN
                        </span>
                        <span className="text-xs font-medium text-slate-500 truncate">
                          {[lead.category, lead.district].filter(Boolean).join(" • ")}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-950 truncate">
                        {lead.name}
                      </h3>
                      <div className="font-mono text-xs font-medium text-slate-600">
                        {lead.phone || "Telefon Yok"}
                      </div>
                    </div>

                    <Link
                      href={`/queue?leadId=${lead.id}`}
                      className="shrink-0 h-10 px-5 rounded-lg bg-slate-950 hover:bg-slate-800 active:bg-black text-white text-xs font-bold shadow-xs inline-flex items-center gap-1.5 transition"
                    >
                      <span>Arama Yap</span>
                      <span className="font-mono text-sm">→</span>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-5 mt-5 border-t border-slate-100 text-center">
            <Link
              href="/queue"
              className="text-xs font-bold text-slate-700 hover:text-slate-950"
            >
              Tüm Adayları Arama Sırasında Aç ({pipeline.toCall}) →
            </Link>
          </div>
        </section>

        {/* Right Column: Live Recent Activities */}
        <section className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-950 tracking-tight">
                  ⚡ Son Arama & İletişim Hareketleri
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Yapılan son aramalar, sonuçlar ve kaydedilen notlar
                </p>
              </div>
              <span className="text-xs font-mono font-medium text-slate-400">Canlı Akış</span>
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
                      className="border border-slate-200/80 bg-white rounded-xl p-3.5 shadow-2xs flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                              isInterested
                                ? "bg-blue-100 text-blue-800 border border-blue-200"
                                : isCallback
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : isNoAnswer
                                ? "bg-slate-100 text-slate-700 border border-slate-200"
                                : "bg-slate-100 text-slate-800 border border-slate-200"
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
                          <span className="text-xs text-slate-400 font-mono">
                            {formatTimeAgo(act.created_at)}
                          </span>
                        </div>

                        <Link
                          href={`/leads/${act.business_id}`}
                          className="text-xs font-bold text-slate-900 hover:text-blue-600 line-clamp-1 transition block"
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
                        className="shrink-0 text-xs font-bold text-slate-500 hover:text-slate-950 p-1 transition"
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

          <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Sistem: Aktif
            </span>
            <Link href="/discover" className="font-bold text-slate-700 hover:text-slate-950">
              Keşif & Tarama Geçmişi →
            </Link>
          </div>
        </section>
      </div>

      {/* 5. Quick Workflow Launch Footer */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <Link
          href="/discover"
          className="border border-slate-200/90 bg-white hover:border-slate-300 p-6 rounded-2xl shadow-xs transition group"
        >
          <div className="text-2xl mb-3">🔍</div>
          <div className="font-bold text-sm text-slate-950 group-hover:text-blue-600 transition">
            Yeni Müşteri Keşfet
          </div>
          <div className="text-xs text-slate-500 mt-1 leading-relaxed">
            Google Haritalar üzerinden lokasyon ve sektöre göre yeni işletmeleri tara ve puanla.
          </div>
        </Link>

        <Link
          href="/queue"
          className="border border-slate-200/90 bg-white hover:border-slate-300 p-6 rounded-2xl shadow-xs transition group"
        >
          <div className="text-2xl mb-3">⚡</div>
          <div className="font-bold text-sm text-slate-950 group-hover:text-blue-600 transition">
            Arama Sırası (Power Hour)
          </div>
          <div className="text-xs text-slate-500 mt-1 leading-relaxed">
            Sıfır kaydırma ekranında hazır satış açılışı ile tek tıkla ara ve sonraki adaya geç.
          </div>
        </Link>

        <Link
          href="/leads"
          className="border border-slate-200/90 bg-white hover:border-slate-300 p-6 rounded-2xl shadow-xs transition group"
        >
          <div className="text-2xl mb-3">📋</div>
          <div className="font-bold text-sm text-slate-950 group-hover:text-blue-600 transition">
            Aday Havuzunu Yönet
          </div>
          <div className="text-xs text-slate-500 mt-1 leading-relaxed">
            Filtreler, durum sekmeleri, dışlama yönetimi ve detaylı web sitesi denetimleri.
          </div>
        </Link>
      </section>
    </main>
  );
}
