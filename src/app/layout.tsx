import type { Metadata } from "next";
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
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
