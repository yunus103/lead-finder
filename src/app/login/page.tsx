import type { Metadata } from "next";
import Image from "next/image";
import { login } from "./actions";

export const metadata: Metadata = { title: "Giriş · Yaytech Lead Intelligence" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next = "/", error } = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <form
        action={login}
        className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-5"
      >
        <Image src="/logo.png" alt="Yaytech Studio" width={190} height={42} priority className="h-9 w-auto mx-auto" />

        <input type="hidden" name="next" value={next} />
        <label className="block text-sm font-medium text-slate-700">
          Şifre
          <input
            type="password"
            name="password"
            required
            autoFocus
            autoComplete="current-password"
            className="w-full mt-2 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          />
        </label>

        {error && <p className="text-sm text-red-600">Şifre yanlış.</p>}

        <button
          type="submit"
          className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition"
        >
          Giriş yap
        </button>
      </form>
    </main>
  );
}
