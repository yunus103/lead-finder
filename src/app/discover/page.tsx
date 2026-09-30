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
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <h1 className="text-xl font-bold text-slate-950 tracking-tight">Keşif</h1>

      <DiscoveryClient initialHistory={history} />
    </main>
  );
}
