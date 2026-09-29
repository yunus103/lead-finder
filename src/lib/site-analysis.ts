import { WebsiteStatus } from "@/types/business";
import { DeepAuditData, SiteHealth, WebsiteAudit, WebsiteScanResult } from "@/types/website";

/** Audit columns without row identity — what a scan produces before it is persisted. */
export type AuditFields = Omit<WebsiteAudit, "id" | "business_id" | "audit_type" | "created_at">;

/** Server TTFB threshold. High on purpose: scans run far from Turkish hosts, network adds ~1s. */
export const SLOW_SERVER_MS = 3000;
export const OUTDATED_YEARS = 3;

export function websiteStatusFromHealth(health: SiteHealth): WebsiteStatus {
  return health === "ok" || health === "protected" ? "HAS_WEBSITE" : "UNREACHABLE";
}

export function isOutdatedYear(year: number | null | undefined): boolean {
  return !!year && year <= new Date().getFullYear() - OUTDATED_YEARS;
}

/** Health for audits saved before the health field existed. */
export function auditHealth(audit: Pick<WebsiteAudit, "status" | "deep_audit_data">): SiteHealth {
  if (audit.deep_audit_data?.health) return audit.deep_audit_data.health;
  if (audit.status === "success") return "ok";
  if (audit.status === "failed") return "broken";
  return "down";
}

export function scanToAuditFields(scan: WebsiteScanResult): AuditFields {
  const deepAuditData: DeepAuditData = {
    hasWhatsApp: scan.hasWhatsApp,
    hasCallButton: scan.hasCallButton,
    isMobileResponsive: scan.hasViewport,
    speedLabel: scan.responseTimeMs > SLOW_SERVER_MS ? "Yavaş sunucu" : "Normal",
    salesPitch: "",
    problems: [],
    health: scan.health,
    healthDetail: scan.healthDetail,
    sslIssue: scan.sslIssue,
    errorCode: scan.errorCode,
    copyrightYear: scan.copyrightYear,
    pageSpeed: null,
  };

  const fields: AuditFields = {
    url: scan.url,
    status: scan.status,
    http_status: scan.httpStatus,
    response_time_ms: scan.responseTimeMs,
    is_https: scan.isHttps,
    title: scan.title,
    meta_description: scan.metaDescription,
    h1: scan.h1,
    has_viewport: scan.hasViewport,
    technologies: scan.technologies,
    social_links: scan.socialLinks,
    contact_emails: scan.contactEmails,
    contact_phones: scan.contactPhones,
    deep_audit_data: deepAuditData,
  };
  deepAuditData.problems = describeSiteProblems(fields);
  return fields;
}

/**
 * Concrete, customer-facing problems found on the site. Empty when the site is fine
 * or when it could not be inspected (protected by bot filters).
 */
export function describeSiteProblems(audit: Pick<AuditFields, "status" | "deep_audit_data" | "has_viewport" | "is_https" | "response_time_ms" | "technologies">): string[] {
  const d = audit.deep_audit_data;
  const health = auditHealth(audit);
  const problems: string[] = [];

  if (health === "down") {
    problems.push(`Site açılmıyor: ${d?.healthDetail || "sunucuya ulaşılamadı"}. Google'dan tıklayan müşteri boş sayfaya düşüyor.`);
    return problems;
  }
  if (health === "broken") {
    problems.push(`${d?.healthDetail || "Site hata sayfası gösteriyor"}. Ziyaretçi işletmeye dair hiçbir bilgi göremiyor.`);
    return problems;
  }
  if (health === "parked") {
    problems.push(`Alan adında gerçek bir site yok: ${d?.healthDetail || "yer tutucu sayfa"}.`);
    return problems;
  }
  if (health === "protected") return problems;

  if (d?.sslIssue === "expired") {
    problems.push("SSL sertifikasının süresi dolmuş: tarayıcılar siteye girmeden önce kırmızı 'Güvenli değil' uyarısı gösteriyor.");
  } else if (d?.sslIssue === "invalid") {
    problems.push("SSL sertifikası geçersiz: tarayıcılar ziyaretçiyi 'Bağlantınız gizli değil' uyarısıyla karşılıyor.");
  } else if (!audit.is_https) {
    problems.push("Site HTTPS değil: Chrome adres çubuğunda 'Güvenli değil' yazıyor.");
  }

  if (!audit.has_viewport) {
    problems.push("Mobil uyumlu değil: telefonda sayfa küçülüp masaüstü görünümünde açılıyor, yazılar okunmuyor.");
  }

  if (isOutdatedYear(d?.copyrightYear)) {
    problems.push(`Site uzun süredir güncellenmemiş görünüyor (telif yılı ${d?.copyrightYear}).`);
  }

  const ps = d?.pageSpeed;
  if (ps && ps.score < 50) {
    problems.push(
      `Google mobil hız puanı ${ps.score}/100${ps.lcpMs ? `; ana içerik ${(ps.lcpMs / 1000).toFixed(1)} saniyede yükleniyor` : ""}.`
    );
  } else if (!ps && (audit.response_time_ms || 0) > SLOW_SERVER_MS) {
    problems.push("Sunucu çok geç yanıt veriyor; sayfa açılmadan ziyaretçi geri dönüyor.");
  }

  if (audit.technologies?.includes("Flash")) {
    problems.push("Sitede Flash kullanılıyor; modern tarayıcılar bu içeriği hiç göstermiyor.");
  }

  if (d && !d.hasWhatsApp) {
    problems.push("WhatsApp butonu yok: ziyaretçi tek tıkla mesaj atıp randevu/fiyat soramıyor.");
  }
  if (d && !d.hasCallButton) {
    problems.push("Telefon numarası tıklanabilir değil: mobilde tek dokunuşla arama yapılamıyor.");
  }

  return problems;
}
