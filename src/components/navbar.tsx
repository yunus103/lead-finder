import Link from "next/link";

export function Navbar() {
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-emerald-600 font-bold text-lg tracking-tight">Yaytech</span>
            <span className="text-slate-800 font-semibold text-sm">Lead Intelligence</span>
          </Link>
          <nav className="flex space-x-2">
            <Link
              href="/"
              className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-3 py-1.5 rounded-lg text-sm font-medium transition"
            >
              Panel
            </Link>
            <Link
              href="/discover"
              className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-3 py-1.5 rounded-lg text-sm font-medium transition"
            >
              Keşif Yap
            </Link>
            <Link
              href="/leads"
              className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-3 py-1.5 rounded-lg text-sm font-medium transition"
            >
              İşletmeler
            </Link>
            <Link
              href="/queue"
              className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 px-3 py-1.5 rounded-lg text-sm font-semibold transition flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Arama Sırası</span>
            </Link>
          </nav>
        </div>
        <div className="flex items-center space-x-2 text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Dahili Sistem (V1)</span>
        </div>
      </div>
    </header>
  );
}
