export type AuditType = "lightweight" | "deep";
export type AuditStatus = "success" | "failed" | "timeout" | "ssl_error" | "unreachable";

export interface DeepAuditData {
  hasWhatsApp: boolean;
  hasCallButton: boolean;
  isMobileResponsive: boolean;
  speedLabel: string;
  salesPitch: string;
  problems: string[];
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
  httpStatus: number | null;
  responseTimeMs: number;
  isHttps: boolean;
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  hasViewport: boolean;
  hasWhatsApp: boolean;
  hasCallButton: boolean;
  technologies: string[];
  socialLinks: Record<string, string>;
  contactEmails: string[];
  contactPhones: string[];
  rawHtml?: string;
  headers?: Record<string, string>;
  error?: string;
}
