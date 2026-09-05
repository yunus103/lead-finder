import Link from "next/link";
import { getQueueLead, getQueueMeta } from "@/services/crm-service";
import { QueueDialer } from "./queue-dialer";

export const dynamic = "force-dynamic";

interface QueuePageProps {
  searchParams: Promise<{
    leadId?: string;
    category?: string;
    district?: string;
  }>;
}

export default async function QueuePage({ searchParams }: QueuePageProps) {
  const params = await searchParams;
  const category = params.category || undefined;
  const district = params.district || undefined;
  const leadId = params.leadId || undefined;

  const [lead, meta] = await Promise.all([
    getQueueLead(leadId, { category, district }),
    getQueueMeta({ category, district }),
  ]);

  if (!lead) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center text-2xl mb-4">
          🎉
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Arama Sırası Tamamlandı!
        </h1>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          {category || district
            ? `Seçtiğiniz filtreye ait (${[category, district].filter(Boolean).join(" • ")}) aranacak aktif aday kalmadı.`
            : "Tüm öncelikli adaylar arandı veya takip takvimine alındı."}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
          {(category || district) && (
            <Link
              href="/queue"
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition shadow-xs"
            >
              Filtreleri Temizle & Tüm Adayları Getir
            </Link>
          )}
          <Link
            href="/discover"
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition shadow-xs"
          >
            Yeni İşletmeler Keşfet →
          </Link>
          <Link
            href="/leads"
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition"
          >
            İşletmeler Tablosuna Git
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="py-2">
      <QueueDialer
        key={lead.id}
        lead={lead}
        meta={meta}
        activeCategory={category}
        activeDistrict={district}
      />
    </main>
  );
}