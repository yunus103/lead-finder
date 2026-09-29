export type AuditType = "lightweight" | "deep";
export type AuditStatus = "success" | "failed" | "timeout" | "ssl_error" | "unreachable";

/**
 * ok        → page loads with real content
 * protected → server answers but blocks bots (Cloudflare/403/429) — site is alive
 * broken    → server answers with an error page (404/500/502…)
 * parked    → 200 but placeholder: domain for sale, suspended hosting, "coming soon", empty page
 * down      → no answer at all (DNS, refused, timeout)
 */
export type SiteHealth = "ok" | "protected" | "broken" | "parked" | "down";

/**
 * expired / invalid → browsers show a "Not secure" warning (real sales point)
 * chain             → incomplete intermediate chain; browsers usually repair it, only strict clients fail
 */
export type SslIssue = "expired" | "invalid" | "chain";

export interface PageSpeedResult {
  score: number; // 0–100, Google Lighthouse mobile performance
  lcpMs: number | null;
  fcpMs: number | null;
  checkedAt: string;
}

export interface DeepAuditData {
  hasWhatsApp: boolean;
  hasCallButton: boolean;
  isMobileResponsive: boolean;
  speedLabel: string;
  salesPitch: string;
  problems: string[];
  // Fields below were added later; older audit rows may not have them.
  health?: SiteHealth;
  healthDetail?: string | null;
  sslIssue?: SslIssue | null;
  errorCode?: string | null;
  copyrightYear?: number | null;
  pageSpeed?: PageSpeedResult | null;
}

export interface WebsiteAudit {
  id: string;
  business_id: string;
  audit_type: AuditType;
  url: string;
  status: AuditStatus;
  http_status: number | null;
  response_time_ms: number | null;
  is_https: boolean;
  title: string | null;
  meta_description: string | null;
  h1: string | null;
  has_viewport: boolean;
  technologies: string[];
  social_links: Record<string, string>;
  contact_emails: string[];
  contact_phones: string[];
  deep_audit_data: DeepAuditData;
  created_at: string;
}

export interface WebsiteScanResult {
  url: string;
  status: AuditStatus;
  health: SiteHealth;
  healthDetail: string | null;
  httpStatus: number | null;
  responseTimeMs: number;
  isHttps: boolean;
  sslIssue: SslIssue | null;
  errorCode: string | null;
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  hasViewport: boolean;
  hasWhatsApp: boolean;
  hasCallButton: boolean;
  copyrightYear: number | null;
  technologies: string[];
  socialLinks: Record<string, string>;
  contactEmails: string[];
  contactPhones: string[];
  /** Set when the domain redirects to a social profile / marketplace page instead of a real site. */
  redirectPlatform: string | null;
}
