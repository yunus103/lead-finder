import { checkSupabaseConnection } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const connection = await checkSupabaseConnection();

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <div className="border border-slate-800 bg-slate-900/50 p-8 rounded-xl shadow-xl backdrop-blur">
        <div className="flex items-center justify-between border-b border-slate-800 pb-6 mb-6">
          <div>
            <span className="text-xs font-semibold tracking-wider text-emerald-400 uppercase">
              Phase 01 — Foundation
            </span>
            <h1 className="text-3xl font-bold text-white tracking-tight mt-1">
              Yaytech Lead Intelligence
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Internal lead discovery and sales management system
            </p>
          </div>
          <div className="text-right">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                connection.connected
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                  : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
              }`}
            >
              <span
                className={`w-2 h-2 mr-2 rounded-full ${
                  connection.connected ? "bg-emerald-400" : "bg-rose-400"
                }`}
              />
              {connection.connected ? "Database Ready" : "Database Disconnected"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="border border-slate-800 bg-slate-950/60 p-4 rounded-lg">
            <div className="text-xs text-slate-400">Framework</div>
            <div className="text-sm font-semibold text-slate-200 mt-1">Next.js 15 (App Router)</div>
            <div className="text-xs text-emerald-400 mt-2">Active</div>
          </div>

          <div className="border border-slate-800 bg-slate-950/60 p-4 rounded-lg">
            <div className="text-xs text-slate-400">Styling & Types</div>
            <div className="text-sm font-semibold text-slate-200 mt-1">Tailwind CSS + TypeScript</div>
            <div className="text-xs text-emerald-400 mt-2">Active</div>
          </div>

          <div className="border border-slate-800 bg-slate-950/60 p-4 rounded-lg">
            <div className="text-xs text-slate-400">PostgreSQL / Supabase</div>
            <div className="text-sm font-semibold text-slate-200 mt-1">
              {connection.connected ? "Connected" : "Check Config"}
            </div>
            <div
              className={`text-xs mt-2 ${
                connection.connected ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {connection.message}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
            Next Milestone
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            <strong>Phase 02 — Business Management:</strong> Canonical Business schema, deduplication
            foundation, and lead listing views.
          </p>
        </div>
      </div>
    </main>
  );
}
