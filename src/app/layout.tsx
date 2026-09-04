import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yaytech Lead Intelligence",
  description: "Internal lead discovery and sales management tool for Yaytech Studio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
