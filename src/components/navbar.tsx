"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

export function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { href: "/", label: "Panel" },
    { href: "/discover", label: "Keşif" },
    { href: "/leads", label: "İşletmeler" },
  ];

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Real Logo + Tabs */}
        <div className="flex items-center gap-2 sm:gap-8 h-full min-w-0">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 shrink-0 py-2">
            <Image
              src="/logo.png"
              alt="Yaytech Studio"
              width={190}
              height={42}
              priority
              className="h-6 sm:h-9 w-auto object-contain"
            />
            <span className="h-4 w-px bg-slate-300 hidden md:block"></span>
            <span className="text-xs uppercase tracking-widest font-mono text-slate-500 font-semibold hidden md:inline">
              Lead Intelligence
            </span>
          </Link>

          {/* Clean Desktop/Mobile Navigation Tabs with Bottom Border Indicator */}
          <nav className="flex items-center gap-1 sm:gap-6 h-full">
            {navLinks.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`h-full flex items-center px-2 sm:px-1 text-xs sm:text-sm transition border-b-2 ${
                    isActive
                      ? "border-slate-950 text-slate-950 font-semibold"
                      : "border-transparent text-slate-500 hover:text-slate-900 font-medium"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Primary Call Action */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 font-mono pr-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>V1.0</span>
          </div>

          <Link
            href="/queue"
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition shadow-xs shrink-0"
          >
            <span className="hidden sm:inline">Arama Sırası</span>
            <span className="sm:hidden font-bold">Kokpit</span>
            <span className="font-mono text-xs opacity-90">→</span>
          </Link>
        </div>
      </div>
    </header>
  );
}


