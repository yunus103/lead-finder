import { PageSpeedResult } from "@/types/website";

const PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const PSI_TIMEOUT_MS = 50000;

interface PsiResponse {
  lighthouseResult?: {
    categories?: { performance?: { score?: number | null } };
    audits?: Record<string, { numericValue?: number }>;
  };
  error?: { message?: string };
}

/**
 * Runs Google PageSpeed Insights (mobile). Measured from Google's infrastructure,
 * so the numbers are credible in a sales conversation regardless of where this server runs.
 * Requires "PageSpeed Insights API" enabled on the Google Cloud key.
 */
export async function runPageSpeed(url: string): Promise<PageSpeedResult> {
  const apiKey = process.env.PAGESPEED_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
  const params = new URLSearchParams({ url, strategy: "mobile", category: "performance" });
  if (apiKey) params.set("key", apiKey);

  const res = await fetch(`${PSI_ENDPOINT}?${params.toString()}`, {
    signal: AbortSignal.timeout(PSI_TIMEOUT_MS),
  });
  const data = (await res.json()) as PsiResponse;

  if (!res.ok || data.error) {
    throw new Error(`PageSpeed hatası: ${data.error?.message || res.statusText}`);
  }

  const lh = data.lighthouseResult;
  const rawScore = lh?.categories?.performance?.score;
  if (rawScore === undefined || rawScore === null) {
    throw new Error("PageSpeed sonucu alınamadı (site Google tarafından açılamadı).");
  }

  const lcp = lh?.audits?.["largest-contentful-paint"]?.numericValue;
  const fcp = lh?.audits?.["first-contentful-paint"]?.numericValue;

  return {
    score: Math.round(rawScore * 100),
    lcpMs: lcp !== undefined ? Math.round(lcp) : null,
    fcpMs: fcp !== undefined ? Math.round(fcp) : null,
    checkedAt: new Date().toISOString(),
  };
}
