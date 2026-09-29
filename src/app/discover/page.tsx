import { getSearchHistory } from "@/services/discovery/orchestrator";
import { DiscoveryClient } from "./discovery-client";

export const dynamic = "force-dynamic";
// Discovery scans dozens of websites inside one server action.
export const maxDuration = 60;

export default async function DiscoverPage() {
  let history: Awaited<ReturnType<typeof getSearchHistory>> = [];
  try {
    history = await getSearchHistory(10);
  } catch (err) {
    console.warn("Could not load search history:", err);
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Yaytech Lead Engine
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
            Potansiyel Müşteri Keşfi & Tarama
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Google Haritalar üzerinden lokasyon ve sektöre göre yüksek potansiyelli yerel işletmeleri tara, eksikleri anında denetle ve öncelikli arama sırasına aktar.
          </p>
        </div>
      </div>

      <DiscoveryClient initialHistory={history} />
    </main>
  );
}
