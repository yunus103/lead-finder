import * as cheerio from "cheerio";
import { WebsiteScanResult, AuditStatus } from "@/types/website";

const SCAN_TIMEOUT_MS = 5000;
const MAX_HTML_SIZE_BYTES = 500 * 1024; // 500 KB ceiling

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * Normalizes a raw URL to an absolute URL with protocol.
 */
export function ensureUrlWithProtocol(rawUrl: string, defaultProtocol = "https://"): string {
  const trimmed = rawUrl.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `${defaultProtocol}${trimmed}`;
}

/**
 * Scans a website using lightweight HTTP fetch and cheerio DOM inspection.
 * Captures status, response timing, metadata, technologies, socials, and contact details.
 */
export async function scanWebsite(rawUrl: string): Promise<WebsiteScanResult> {
  let targetUrl = ensureUrlWithProtocol(rawUrl, "https://");
  let isHttps = targetUrl.startsWith("https://");

  const startTime = performance.now();
  let response: Response | null = null;
  let status: AuditStatus = "unreachable";
  let httpStatus: number | null = null;
  let responseTimeMs = 0;
  let errorDetail: string | undefined;

  // 1. Attempt primary fetch (defaults to HTTPS)
  try {
    response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "tr,en;q=0.8",
      },
      signal: AbortSignal.timeout(SCAN_TIMEOUT_MS),
      redirect: "follow",
    });
    responseTimeMs = Math.round(performance.now() - startTime);
    httpStatus = response.status;
  } catch (err: unknown) {
    responseTimeMs = Math.round(performance.now() - startTime);
    const errMessage = err instanceof Error ? err.message : String(err);

    // If HTTPS fails with SSL/cert error or connection failure, attempt HTTP fallback
    if (isHttps) {
      try {
        const fallbackUrl = ensureUrlWithProtocol(rawUrl, "http://");
        const fallbackStart = performance.now();
        response = await fetch(fallbackUrl, {
          method: "GET",
          headers: {
            "User-Agent": USER_AGENT,
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
          signal: AbortSignal.timeout(SCAN_TIMEOUT_MS),
          redirect: "follow",
        });
        responseTimeMs = Math.round(performance.now() - fallbackStart);
        targetUrl = fallbackUrl;
        isHttps = false;
        httpStatus = response.status;
      } catch (fallbackErr: unknown) {
        const fallbackMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
        errorDetail = fallbackMsg;
      }
    } else {
      errorDetail = errMessage;
    }
  }

  // Handle network / response errors
  if (!response) {
    if (errorDetail?.includes("timeout") || errorDetail?.includes("aborted")) {
      status = "timeout";
    } else if (errorDetail?.includes("certificate") || errorDetail?.includes("SSL")) {
      status = "ssl_error";
    } else {
      status = "unreachable";
    }

    return {
      url: targetUrl,
      status,
      httpStatus,
      responseTimeMs,
      isHttps,
      title: null,
      metaDescription: null,
      h1: null,
      hasViewport: false,
      hasWhatsApp: false,
      hasCallButton: false,
      technologies: [],
      socialLinks: {},
      contactEmails: [],
      contactPhones: [],
      error: errorDetail || "Sunucuya bağlanılamadı.",
    };
  }

  if (response.ok) {
    status = "success";
  } else {
    status = "failed";
  }

  // Extract headers
  const headersRecord: Record<string, string> = {};
  response.headers.forEach((val, key) => {
    headersRecord[key.toLowerCase()] = val;
  });

  // 2. Read HTML and truncate to MAX_HTML_SIZE_BYTES
  let html = "";
  try {
    const rawText = await response.text();
    html = rawText.slice(0, MAX_HTML_SIZE_BYTES);
  } catch (readErr) {
    return {
      url: targetUrl,
      status: "unreachable",
      httpStatus,
      responseTimeMs,
      isHttps,
      title: null,
      metaDescription: null,
      h1: null,
      hasViewport: false,
      hasWhatsApp: false,
      hasCallButton: false,
      technologies: [],
      socialLinks: {},
      contactEmails: [],
      contactPhones: [],
      error: readErr instanceof Error ? readErr.message : "HTML okunamadı.",
    };
  }

  // 3. Parse HTML via cheerio
  const $ = cheerio.load(html);

  // Metadata
  const title = $("title").first().text().trim() || null;
  const metaDescription =
    $('meta[name="description"]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    null;
  const h1 = $("h1").first().text().trim().replace(/\s+/g, " ") || null;
  const hasViewport = $('meta[name="viewport"]').length > 0;

  // 4. Heuristic Technology Detection
  const technologies = detectTechnologies(html, $, headersRecord);

  // 5. Social Links Extraction
  const socialLinks = extractSocialLinks($);

  // 6. Contact Extraction (tel:, mailto:, and regex)
  const { emails, phones } = extractContacts(html, $);

  // 7. Practical sales actions
  const lowerHtml = html.toLowerCase();
  const hasWhatsApp =
    lowerHtml.includes("wa.me") ||
    lowerHtml.includes("api.whatsapp.com") ||
    lowerHtml.includes("whatsapp") ||
    $('a[href*="wa.me"]').length > 0;
  const hasCallButton = $('a[href^="tel:"]').length > 0;

  return {
    url: targetUrl,
    status,
    httpStatus,
    responseTimeMs,
    isHttps,
    title,
    metaDescription,
    h1,
    hasViewport,
    hasWhatsApp,
    hasCallButton,
    technologies,
    socialLinks,
    contactEmails: emails,
    contactPhones: phones,
    rawHtml: html,
    headers: headersRecord,
  };
}

/**
 * Heuristically identifies CMS, frameworks, and web tech from HTML, DOM, and HTTP headers.
 */
function detectTechnologies(
  html: string,
  $: cheerio.CheerioAPI,
  headers: Record<string, string>
): string[] {
  const techs = new Set<string>();
  const lowerHtml = html.toLowerCase();

  // WordPress & ecosystem
  const metaGenerator = $('meta[name="generator"]').attr("content")?.toLowerCase() || "";
  if (
    metaGenerator.includes("wordpress") ||
    lowerHtml.includes("/wp-content/") ||
    lowerHtml.includes("/wp-includes/")
  ) {
    techs.add("WordPress");
  }
  if (lowerHtml.includes("woocommerce") || lowerHtml.includes("wc-block")) {
    techs.add("WooCommerce");
  }
  if (lowerHtml.includes("elementor")) {
    techs.add("Elementor");
  }

  // Other Site Builders
  if (
    lowerHtml.includes("cdn.shopify.com") ||
    lowerHtml.includes("shopify.theme") ||
    metaGenerator.includes("shopify")
  ) {
    techs.add("Shopify");
  }
  if (
    lowerHtml.includes("wix.com") ||
    lowerHtml.includes("_wix_") ||
    metaGenerator.includes("wix")
  ) {
    techs.add("Wix");
  }
  if (
    lowerHtml.includes("squarespace.com") ||
    lowerHtml.includes("static1.squarespace.com") ||
    metaGenerator.includes("squarespace")
  ) {
    techs.add("Squarespace");
  }
  if (
    lowerHtml.includes("webflow.com") ||
    $("html").attr("data-wf-site") !== undefined ||
    metaGenerator.includes("webflow")
  ) {
    techs.add("Webflow");
  }

  // Modern JS Frameworks
  if (lowerHtml.includes("__next_data__") || lowerHtml.includes("/_next/")) {
    techs.add("Next.js");
  }
  if (
    lowerHtml.includes("react-root") ||
    lowerHtml.includes("data-reactroot") ||
    lowerHtml.includes("_reactlistening")
  ) {
    techs.add("React");
  }
  if (lowerHtml.includes("vue") || $("div[data-v-]").length > 0) {
    techs.add("Vue.js");
  }

  // UI Libraries
  if (lowerHtml.includes("bootstrap.min.css") || lowerHtml.includes("bootstrap.css")) {
    techs.add("Bootstrap");
  }
  if (lowerHtml.includes("tailwind") || lowerHtml.includes("tailwindcss")) {
    techs.add("Tailwind CSS");
  }
  if (lowerHtml.includes("jquery.min.js") || lowerHtml.includes("jquery-")) {
    techs.add("jQuery");
  }

  // Marketing & Analytics
  if (
    lowerHtml.includes("googletagmanager.com") ||
    lowerHtml.includes("gtag(") ||
    lowerHtml.includes("google-analytics.com")
  ) {
    techs.add("Google Tag Manager");
  }
  if (lowerHtml.includes("fbq(") || lowerHtml.includes("connect.facebook.net")) {
    techs.add("Facebook Pixel");
  }
  if (lowerHtml.includes("wa.me/") || lowerHtml.includes("api.whatsapp.com/send")) {
    techs.add("WhatsApp Widget");
  }

  // Server headers
  const server = headers["server"]?.toLowerCase();
  if (server) {
    if (server.includes("nginx")) techs.add("Nginx");
    if (server.includes("apache")) techs.add("Apache");
    if (server.includes("cloudflare")) techs.add("Cloudflare");
  }

  return Array.from(techs);
}

/**
 * Extracts social profile URLs from anchor tags.
 */
function extractSocialLinks($: cheerio.CheerioAPI): Record<string, string> {
  const socials: Record<string, string> = {};

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href")?.trim();
    if (!href) return;

    try {
      const parsed = new URL(href, "https://example.com");
      const host = parsed.hostname.toLowerCase();

      if (host.includes("instagram.com") && !socials.instagram) {
        if (!parsed.pathname.startsWith("/p/") && !parsed.pathname.startsWith("/explore")) {
          socials.instagram = href;
        }
      } else if (host.includes("facebook.com") && !socials.facebook) {
        socials.facebook = href;
      } else if (host.includes("linkedin.com") && !socials.linkedin) {
        socials.linkedin = href;
      } else if ((host.includes("twitter.com") || host.includes("x.com")) && !socials.twitter) {
        socials.twitter = href;
      } else if (host.includes("youtube.com") && !socials.youtube) {
        socials.youtube = href;
      }
    } catch {
      // Ignore invalid URL formats
    }
  });

  return socials;
}

/**
 * Extracts emails and phone numbers from links and page text.
 */
function extractContacts(
  html: string,
  $: cheerio.CheerioAPI
): { emails: string[]; phones: string[] } {
  const emailSet = new Set<string>();
  const phoneSet = new Set<string>();

  // 1. mailto: links
  $('a[href^="mailto:"]').each((_, el) => {
    const href = $(el).attr("href") || "";
    const email = href.replace(/^mailto:/i, "").split("?")[0].trim().toLowerCase();
    if (email && email.includes("@")) {
      emailSet.add(email);
    }
  });

  // 2. tel: links
  $('a[href^="tel:"]').each((_, el) => {
    const href = $(el).attr("href") || "";
    const phone = href.replace(/^tel:/i, "").replace(/[^\d+]/g, "").trim();
    if (phone.length >= 7) {
      phoneSet.add(phone);
    }
  });

  // 3. Fallback regex for text emails
  const bodyText = $("body").text();
  const textEmails = bodyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  if (textEmails) {
    for (const em of textEmails) {
      const clean = em.toLowerCase().trim();
      // Exclude asset file false-positives (e.g. user@2x.png)
      if (!/\.(png|jpg|jpeg|webp|svg|gif|js|css)$/i.test(clean)) {
        emailSet.add(clean);
        if (emailSet.size >= 5) break;
      }
    }
  }

  return {
    emails: Array.from(emailSet).slice(0, 5),
    phones: Array.from(phoneSet).slice(0, 5),
  };
}
