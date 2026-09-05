import { getSearchHistory } from "@/services/discovery/orchestrator";
import { DiscoveryClient } from "./discovery-client";

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  let history: Awaited<ReturnType<typeof getSearchHistory>> = [];
  try {
    history = await getSearchHistory(10);
  } catch (err) {
    console.warn("Could not load search history:", err);
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="border-b border-slate-200 pb-6 mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Potansiyel Müşteri Keşfi
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Google Haritalar üzerinden yüksek potansiyelli yerel işletmeleri keşfedin ve arama sırasına aktarın.
        </p>
      </div>

      <DiscoveryClient initialHistory={history} />
    </main>
  );
}
