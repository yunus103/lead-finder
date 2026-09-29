import * as cheerio from "cheerio";
import { Agent, fetch as undiciFetch } from "undici";
import { AuditStatus, SiteHealth, SslIssue, WebsiteScanResult } from "@/types/website";
import { classifyWebPresence, parseHost } from "@/lib/web-presence";

const SCAN_TIMEOUT_MS = 9000;
const MAX_HTML_SIZE_BYTES = 600 * 1024;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const REQUEST_HEADERS = {
  "User-Agent": USER_AGENT,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
};

const strictAgent = new Agent({ connect: { timeout: SCAN_TIMEOUT_MS } });
// Used only after a TLS failure: lets us read sites whose certificate a real browser
// would still accept (incomplete chain) or show with a warning (expired/invalid).
const insecureAgent = new Agent({
  connect: { timeout: SCAN_TIMEOUT_MS, rejectUnauthorized: false },
});

const CHAIN_ERROR_CODES = new Set([
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "UNABLE_TO_GET_ISSUER_CERT",
  "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
]);
const EXPIRED_ERROR_CODES = new Set(["CERT_HAS_EXPIRED", "CERT_NOT_YET_VALID"]);

const PLACEHOLDER_PATTERNS = [
  "alan adı satılık",
  "alan adı satılıktır",
  "bu alan adı",
  "domain is for sale",
  "this domain is for sale",
  "buy this domain",
  "domain parking",
  "parked domain",
  "hesap askıya alındı",
  "hesabı askıya alınmıştır",
  "account suspended",
  "account has been suspended",
  "this account has been suspended",
  "yapım aşamasında",
  "çok yakında hizmetinizde",
  "under construction",
  "coming soon",
  "index of /",
  "welcome to nginx",
  "apache2 ubuntu default page",
  "apache2 debian default page",
  "default web site page",
  "plesk default page",
  "web server's default page",
  "hosting hizmeti aktif",
  "future home of something quite cool",
];

export function ensureUrlWithProtocol(rawUrl: string, defaultProtocol = "https://"): string {
  const trimmed = rawUrl.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `${defaultProtocol}${trimmed}`;
}

interface AttemptSuccess {
  ok: true;
  finalUrl: string;
  httpStatus: number;
  headers: Record<string, string>;
  html: string;
  responseTimeMs: number;
}

interface AttemptFailure {
  ok: false;
  code: string;
  message: string;
  responseTimeMs: number;
}

type AttemptResult = AttemptSuccess | AttemptFailure;

function extractErrorCode(err: unknown): { code: string; message: string } {
  const e = err as { name?: string; code?: string; message?: string; cause?: { code?: string; message?: string } };
  if (e?.name === "TimeoutError" || e?.name === "AbortError") {
    return { code: "TIMEOUT", message: "Zaman aşımı" };
  }
  const code = e?.cause?.code || e?.code || "UNKNOWN";
  const message = e?.cause?.message || e?.message || String(err);
  if (code === "UND_ERR_CONNECT_TIMEOUT" || code === "UND_ERR_HEADERS_TIMEOUT" || code === "UND_ERR_BODY_TIMEOUT") {
    return { code: "TIMEOUT", message };
  }
  return { code, message };
}

function isTlsError(code: string): boolean {
  return (
    CHAIN_ERROR_CODES.has(code) ||
    EXPIRED_ERROR_CODES.has(code) ||
    code.startsWith("ERR_TLS") ||
    code.startsWith("ERR_SSL") ||
    code.includes("CERT") ||
    code === "DEPTH_ZERO_SELF_SIGNED_CERT" ||
    code === "SELF_SIGNED_CERT_IN_CHAIN" ||
    code === "EPROTO"
  );
}

function classifySslIssue(code: string): SslIssue {
  if (CHAIN_ERROR_CODES.has(code)) return "chain";
  if (EXPIRED_ERROR_CODES.has(code)) return "expired";
  return "invalid";
}

function detectCharset(contentType: string | undefined, head: Uint8Array): string {
  const fromHeader = contentType?.match(/charset=["']?([\w-]+)/i)?.[1];
  if (fromHeader) return fromHeader.toLowerCase();
  const sniff = Buffer.from(head.subarray(0, 2048)).toString("latin1");
  const fromMeta = sniff.match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1];
  return fromMeta?.toLowerCase() || "utf-8";
}

function decodeHtml(bytes: Uint8Array, contentType: string | undefined): string {
  const charset = detectCharset(contentType, bytes);
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

async function readCappedBody(body: ReadableStream<Uint8Array> | null): Promise<Uint8Array> {
  if (!body) return new Uint8Array();
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < MAX_HTML_SIZE_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.byteLength;
  }
  reader.cancel().catch(() => {});
  return Buffer.concat(chunks).subarray(0, MAX_HTML_SIZE_BYTES);
}

async function attemptFetch(url: string, insecure: boolean): Promise<AttemptResult> {
  const start = performance.now();
  try {
    const res = await undiciFetch(url, {
      method: "GET",
      headers: REQUEST_HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(SCAN_TIMEOUT_MS),
      dispatcher: insecure ? insecureAgent : strictAgent,
    });
    const responseTimeMs = Math.round(performance.now() - start);

    const headers: Record<string, string> = {};
    res.headers.forEach((val, key) => {
      headers[key.toLowerCase()] = val;
    });

    const bytes = await readCappedBody(res.body as ReadableStream<Uint8Array> | null);
    return {
      ok: true,
      finalUrl: res.url || url,
      httpStatus: res.status,
      headers,
      html: decodeHtml(bytes, headers["content-type"]),
      responseTimeMs,
    };
  } catch (err) {
    const { code, message } = extractErrorCode(err);
    return { ok: false, code, message, responseTimeMs: Math.round(performance.now() - start) };
  }
}

/**
 * Tries the URL the way a browser would, falling back through the failure modes that
 * made the old scanner report working sites as "unreachable":
 * TLS error → retry ignoring the certificate (and remember the issue),
 * DNS failure on bare domain → retry with www.,
 * connection failure on https → retry plain http.
 */
async function fetchLikeBrowser(rawUrl: string): Promise<{ result: AttemptResult; sslIssue: SslIssue | null }> {
  const primary = ensureUrlWithProtocol(rawUrl);
  let sslIssue: SslIssue | null = null;

  let result = await attemptFetch(primary, false);
  if (result.ok) return { result, sslIssue };

  if (isTlsError(result.code)) {
    sslIssue = classifySslIssue(result.code);
    result = await attemptFetch(primary, true);
    if (result.ok) return { result, sslIssue };
  }

  if (result.code === "TIMEOUT") return { result, sslIssue };

  if (result.code === "ENOTFOUND") {
    const host = parseHost(primary);
    // Only worth a second lookup when DNS answered quickly; a slow resolver would double the wait.
    if (host && !host.startsWith("www.") && result.responseTimeMs < 3000) {
      const wwwUrl = primary.replace(/^(https?:\/\/)(www\.)?/i, "$1www.");
      const wwwResult = await attemptFetch(wwwUrl, true);
      if (wwwResult.ok) return { result: wwwResult, sslIssue };
    }
    return { result, sslIssue };
  }

  if (primary.startsWith("https://")) {
    const httpResult = await attemptFetch(primary.replace(/^https:\/\//i, "http://"), true);
    if (httpResult.ok) return { result: httpResult, sslIssue };
  }

  return { result, sslIssue };
}

function healthFromHttp(status: number, headers: Record<string, string>): SiteHealth {
  if (status >= 200 && status < 400) return "ok";
  if ([401, 403, 405, 406, 429].includes(status)) return "protected";
  const isCloudflare = headers["server"]?.toLowerCase().includes("cloudflare") || !!headers["cf-mitigated"];
  if (status === 503 && isCloudflare) return "protected";
  return "broken";
}

function detectPlaceholder($: cheerio.CheerioAPI, html: string): string | null {
  const title = $("title").first().text().toLocaleLowerCase("tr");
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const haystack = `${title} ${bodyText.slice(0, 3000).toLocaleLowerCase("tr")}`;

  const hit = PLACEHOLDER_PATTERNS.find((p) => haystack.includes(p));
  // Short-circuit only on short pages: a real site may mention "coming soon" in a product section.
  if (hit && bodyText.length < 2500) return `Yer tutucu sayfa ("${hit}")`;

  const hasScripts = /<script[\s>]/i.test(html);
  if (bodyText.length < 40 && !hasScripts && $("img").length === 0) return "Boş sayfa";
  return null;
}

function detectCopyrightYear(text: string): number | null {
  const currentYear = new Date().getFullYear();
  const regex = /(?:©|\(c\)|copyright|telif)\s*(?:\d{4}\s*[-–]\s*)?((?:19|20)\d{2})/gi;
  let latest: number | null = null;
  for (const match of text.matchAll(regex)) {
    const year = parseInt(match[1], 10);
    if (year >= 1995 && year <= currentYear + 1 && (latest === null || year > latest)) {
      latest = year;
    }
  }
  return latest;
}

function failureStatus(code: string): { status: AuditStatus; detail: string } {
  if (code === "TIMEOUT") return { status: "timeout", detail: `${SCAN_TIMEOUT_MS / 1000} saniyede yanıt vermedi` };
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") return { status: "unreachable", detail: "Alan adı bulunamadı (DNS kaydı yok)" };
  if (code === "ECONNREFUSED") return { status: "unreachable", detail: "Sunucu bağlantıyı reddediyor" };
  if (code === "ECONNRESET") return { status: "unreachable", detail: "Sunucu bağlantıyı kesiyor" };
  if (isTlsError(code)) return { status: "ssl_error", detail: "SSL sertifikası bozuk, site açılmıyor" };
  return { status: "unreachable", detail: "Sunucuya bağlanılamadı" };
}

function emptyResult(url: string): Omit<WebsiteScanResult, "status" | "health" | "healthDetail" | "responseTimeMs"> {
  return {
    url,
    httpStatus: null,
    isHttps: url.startsWith("https://"),
    sslIssue: null,
    errorCode: null,
    title: null,
    metaDescription: null,
    h1: null,
    hasViewport: false,
    hasWhatsApp: false,
    hasCallButton: false,
    copyrightYear: null,
    technologies: [],
    socialLinks: {},
    contactEmails: [],
    contactPhones: [],
    redirectPlatform: null,
  };
}

/**
 * Scans a website with a browser-like HTTP client and cheerio DOM inspection.
 */
export async function scanWebsite(rawUrl: string): Promise<WebsiteScanResult> {
  const requestedUrl = ensureUrlWithProtocol(rawUrl);
  const { result, sslIssue } = await fetchLikeBrowser(rawUrl);

  if (!result.ok) {
    const { status, detail } = failureStatus(result.code);
    return {
      ...emptyResult(requestedUrl),
      status,
      health: "down",
      healthDetail: detail,
      responseTimeMs: result.responseTimeMs,
      sslIssue,
      errorCode: result.code,
    };
  }

  const finalPresence = classifyWebPresence(result.finalUrl);
  const redirectPlatform = finalPresence.kind === "social" || finalPresence.kind === "platform" ? finalPresence.platform : null;

  const $ = cheerio.load(result.html);
  let health = healthFromHttp(result.httpStatus, result.headers);
  let healthDetail: string | null =
    health === "protected"
      ? `Bot koruması (HTTP ${result.httpStatus}) — site çalışıyor`
      : health === "broken"
      ? `Site hata sayfası gösteriyor (HTTP ${result.httpStatus})`
      : null;

  if (health === "ok") {
    const placeholder = detectPlaceholder($, result.html);
    if (placeholder) {
      health = "parked";
      healthDetail = placeholder;
    }
  }

  const title = $("title").first().text().trim().replace(/\s+/g, " ") || null;
  const metaDescription =
    $('meta[name="description"]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    null;
  const h1 = $("h1").first().text().trim().replace(/\s+/g, " ") || null;
  const hasViewport = /width\s*=\s*device-width/i.test($('meta[name="viewport"]').attr("content") || "");

  const lowerHtml = result.html.toLowerCase();
  const anchors = extractAnchorSignals($);
  const hasWhatsApp =
    anchors.hasWhatsApp || lowerHtml.includes("wa.me/") || lowerHtml.includes("api.whatsapp.com/send");
  const { emails, phones } = extractContacts($, anchors);

  let status: AuditStatus = health === "ok" || health === "parked" ? "success" : "failed";
  if (sslIssue && sslIssue !== "chain" && result.finalUrl.startsWith("https://")) {
    // The page loads, but browsers warn visitors before showing it.
    status = "ssl_error";
  }

  return {
    url: result.finalUrl,
    status,
    health,
    healthDetail,
    httpStatus: result.httpStatus,
    responseTimeMs: result.responseTimeMs,
    isHttps: result.finalUrl.startsWith("https://"),
    sslIssue,
    errorCode: null,
    title,
    metaDescription,
    h1,
    hasViewport,
    hasWhatsApp,
    hasCallButton: anchors.hasCallButton,
    copyrightYear: detectCopyrightYear($("body").text()),
    technologies: detectTechnologies(lowerHtml, $, result.headers),
    socialLinks: anchors.socialLinks,
    contactEmails: emails,
    contactPhones: phones,
    redirectPlatform,
  };
}

interface AnchorSignals {
  hasWhatsApp: boolean;
  hasCallButton: boolean;
  socialLinks: Record<string, string>;
  mailtos: string[];
  tels: string[];
}

function extractAnchorSignals($: cheerio.CheerioAPI): AnchorSignals {
  const signals: AnchorSignals = { hasWhatsApp: false, hasCallButton: false, socialLinks: {}, mailtos: [], tels: [] };

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href")?.trim();
    if (!href) return;
    const lower = href.toLowerCase();

    if (lower.startsWith("tel:")) {
      signals.hasCallButton = true;
      signals.tels.push(href.slice(4));
      return;
    }
    if (lower.startsWith("mailto:")) {
      signals.mailtos.push(href.slice(7));
      return;
    }
    if (/wa\.me\/|api\.whatsapp\.com|web\.whatsapp\.com\/send|^whatsapp:/.test(lower)) {
      signals.hasWhatsApp = true;
      return;
    }

    try {
      const parsed = new URL(href, "https://example.com");
      const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
      const s = signals.socialLinks;
      if (host.endsWith("instagram.com") && !s.instagram && !/^\/(p|reel|explore)\//.test(parsed.pathname)) {
        s.instagram = href;
      } else if (host.endsWith("facebook.com") && !s.facebook && !parsed.pathname.startsWith("/sharer")) {
        s.facebook = href;
      } else if (host.endsWith("linkedin.com") && !s.linkedin) {
        s.linkedin = href;
      } else if ((host === "twitter.com" || host === "x.com") && !s.twitter && !parsed.pathname.startsWith("/intent")) {
        s.twitter = href;
      } else if (host.endsWith("youtube.com") && !s.youtube) {
        s.youtube = href;
      } else if (host.endsWith("tiktok.com") && !s.tiktok) {
        s.tiktok = href;
      }
    } catch {
      // Ignore invalid URL formats
    }
  });

  return signals;
}

function extractContacts(
  $: cheerio.CheerioAPI,
  anchors: AnchorSignals
): { emails: string[]; phones: string[] } {
  const emailSet = new Set<string>();
  const phoneSet = new Set<string>();

  for (const raw of anchors.mailtos) {
    const email = decodeURIComponent(raw).split("?")[0].trim().toLowerCase();
    if (email.includes("@")) emailSet.add(email);
  }
  for (const raw of anchors.tels) {
    const phone = raw.replace(/[^\d+]/g, "");
    if (phone.length >= 7) phoneSet.add(phone);
  }

  const textEmails = $("body").text().match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  for (const em of textEmails) {
    const clean = em.toLowerCase().trim();
    if (!/\.(png|jpg|jpeg|webp|svg|gif|js|css)$/i.test(clean) && !clean.includes("example.")) {
      emailSet.add(clean);
    }
    if (emailSet.size >= 5) break;
  }

  return {
    emails: Array.from(emailSet).slice(0, 5),
    phones: Array.from(phoneSet).slice(0, 5),
  };
}

/**
 * Heuristically identifies CMS, frameworks, and web tech from HTML, DOM, and HTTP headers.
 */
function detectTechnologies(
  lowerHtml: string,
  $: cheerio.CheerioAPI,
  headers: Record<string, string>
): string[] {
  const techs = new Set<string>();
  const metaGenerator = $('meta[name="generator"]').attr("content")?.toLowerCase() || "";

  if (metaGenerator.includes("wordpress") || lowerHtml.includes("/wp-content/") || lowerHtml.includes("/wp-includes/")) {
    techs.add("WordPress");
  }
  if (lowerHtml.includes("woocommerce")) techs.add("WooCommerce");
  if (lowerHtml.includes("elementor")) techs.add("Elementor");
  if (lowerHtml.includes("cdn.shopify.com") || metaGenerator.includes("shopify")) techs.add("Shopify");
  if (lowerHtml.includes("static.wixstatic.com") || lowerHtml.includes("_wix_") || metaGenerator.includes("wix")) {
    techs.add("Wix");
  }
  if (lowerHtml.includes("static1.squarespace.com") || metaGenerator.includes("squarespace")) techs.add("Squarespace");
  if ($("html").attr("data-wf-site") !== undefined || metaGenerator.includes("webflow")) techs.add("Webflow");
  if (metaGenerator.includes("joomla") || lowerHtml.includes("/media/jui/")) techs.add("Joomla");
  if (lowerHtml.includes("ikas") && lowerHtml.includes("cdn.myikas.com")) techs.add("ikas");
  if (lowerHtml.includes("ideasoft")) techs.add("IdeaSoft");
  if (lowerHtml.includes("ticimax")) techs.add("Ticimax");

  if (lowerHtml.includes("__next_data__") || lowerHtml.includes("/_next/static")) techs.add("Next.js");
  if (lowerHtml.includes("data-reactroot") || lowerHtml.includes("react-dom")) techs.add("React");
  if (lowerHtml.includes("vue.min.js") || lowerHtml.includes("vue.js") || $("[data-v-app]").length > 0) {
    techs.add("Vue.js");
  }

  if (lowerHtml.includes("bootstrap.min.css") || lowerHtml.includes("bootstrap.css")) techs.add("Bootstrap");
  if (lowerHtml.includes("jquery")) techs.add("jQuery");
  if (lowerHtml.includes("swfobject") || lowerHtml.includes(".swf")) techs.add("Flash");

  if (lowerHtml.includes("googletagmanager.com") || lowerHtml.includes("google-analytics.com")) {
    techs.add("Google Analytics/GTM");
  }
  if (lowerHtml.includes("fbq(") || lowerHtml.includes("connect.facebook.net")) techs.add("Facebook Pixel");

  const server = headers["server"]?.toLowerCase();
  if (server) {
    if (server.includes("nginx")) techs.add("Nginx");
    if (server.includes("apache")) techs.add("Apache");
    if (server.includes("litespeed")) techs.add("LiteSpeed");
    if (server.includes("cloudflare")) techs.add("Cloudflare");
    if (server.includes("microsoft-iis")) techs.add("IIS");
  }

  return Array.from(techs);
}
