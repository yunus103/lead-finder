import { WebsiteStatus } from "@/types/business";
import { AuditFields, auditHealth, isOutdatedYear } from "./site-analysis";

// Edit these to change how you introduce yourself in every generated message.
export const OUTREACH_SENDER = {
  name: "Yunus",
  studio: "Yaytech Studio",
};

export type PhoneType = "mobile" | "landline" | "corporate" | "unknown";

export interface PhoneInfo {
  type: PhoneType;
  /** Digits with country code (e.g. 905321234567) — usable for tel: and wa.me. */
  e164: string | null;
  /** WhatsApp is only reachable on mobile numbers. */
  whatsappNumber: string | null;
}

export function getPhoneInfo(phone: string | null | undefined): PhoneInfo {
  if (!phone) return { type: "unknown", e164: null, whatsappNumber: null };
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);

  // 444 X XXX style nationwide numbers are always corporate.
  if (/^444\d{4}$/.test(digits)) return { type: "corporate", e164: null, whatsappNumber: null };

  let national: string | null = null;
  if (digits.length === 12 && digits.startsWith("90")) national = "0" + digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) national = digits;
  else if (digits.length === 10 && !digits.startsWith("0")) national = "0" + digits;

  if (!national) return { type: "unknown", e164: digits.length >= 10 ? digits : null, whatsappNumber: null };

  const e164 = "90" + national.slice(1);
  if (national.startsWith("05")) return { type: "mobile", e164, whatsappNumber: e164 };
  if (/^08[05]0|^0900/.test(national)) return { type: "corporate", e164, whatsappNumber: null };
  if (/^0[234]/.test(national)) return { type: "landline", e164, whatsappNumber: null };
  return { type: "unknown", e164, whatsappNumber: null };
}

export const PHONE_TYPE_LABEL: Record<PhoneType, string> = {
  mobile: "Cep",
  landline: "Sabit hat",
  corporate: "Kurumsal (0850/444)",
  unknown: "Bilinmiyor",
};

export interface OutreachContext {
  name: string;
  category: string | null;
  district: string | null;
  rating: number | null;
  review_count: number;
  website_status: WebsiteStatus;
  instagram: string | null;
  audit?: Pick<AuditFields, "status" | "has_viewport" | "is_https" | "deep_audit_data"> | null;
}

export type Angle =
  | "instagram_only"
  | "no_website"
  | "down"
  | "parked"
  | "ssl"
  | "mobile"
  | "outdated"
  | "slow"
  | "generic";

export function pickAngle(ctx: OutreachContext): Angle {
  if (ctx.website_status === "NO_WEBSITE") return ctx.instagram ? "instagram_only" : "no_website";

  const audit = ctx.audit;
  if (ctx.website_status === "UNREACHABLE") {
    return audit && auditHealth(audit) === "parked" ? "parked" : "down";
  }
  if (!audit) return "generic";

  const d = audit.deep_audit_data;
  if (d?.sslIssue === "expired" || d?.sslIssue === "invalid") return "ssl";
  if (!audit.has_viewport) return "mobile";
  if (isOutdatedYear(d?.copyrightYear)) return "outdated";
  if (d?.pageSpeed && d.pageSpeed.score < 50) return "slow";
  if (!audit.is_https) return "ssl";
  return "generic";
}

function benefitFor(category: string | null): string {
  const c = (category || "").toLocaleLowerCase("tr");
  if (/diş|klinik|doktor|hekim|veteriner|diyetisyen|psikolog|fizyoterap|güzellik|kuaför|berber|salon|estetik|spa|masaj|tırnak|lazer|pilates|yoga/.test(c)) {
    return "randevu";
  }
  if (/restoran|restaurant|kafe|cafe|kahve|pastane|fırın|lokanta|meyhane|pizza|burger|döner|kebap|balık/.test(c)) {
    return "menü ve rezervasyon";
  }
  if (/otel|pansiyon|apart|konaklama/.test(c)) return "rezervasyon";
  return "fiyat ve bilgi";
}

function observation(ctx: OutreachContext, angle: Angle): string {
  const d = ctx.audit?.deep_audit_data;
  // "X bölgesindeki" avoids Turkish vowel-harmony suffixes on arbitrary district names.
  const where = ctx.district ? `${ctx.district} bölgesindeki` : "bölgenizdeki";
  switch (angle) {
    case "instagram_only":
      return "Google profilinizde web sitesi olarak Instagram hesabınız görünüyor; sizi Google'da arayan müşteriler bilgi alabileceği bir sayfaya ulaşamıyor.";
    case "no_website":
      return `Google Haritalar'da ${where} işletmelere bakarken sizi gördüm; profilinizde henüz bir web sitesi yok.`;
    case "down":
      return `Google profilinizdeki web sitesi bağlantısı şu an açılmıyor${d?.healthDetail ? ` (${d.healthDetail.toLocaleLowerCase("tr")})` : ""}; tıklayan müşteriler boş sayfaya düşüyor.`;
    case "parked":
      return "Google profilinizdeki web sitesi adresinde şu an siteniz yerine boş bir yer tutucu sayfa açılıyor.";
    case "ssl":
      return "Sitenize girerken tarayıcı 'Güvenli değil' uyarısı veriyor; bu da ziyaretçileri tedirgin edip geri döndürüyor.";
    case "mobile":
      return "Sitenize telefondan baktım; mobilde masaüstü görünümüyle açılıyor, yazılar okunmayacak kadar küçük kalıyor.";
    case "outdated":
      return `Sitenizin uzun süredir güncellenmediğini fark ettim (en son ${d?.copyrightYear} tarihli görünüyor).`;
    case "slow":
      return `Google'ın kendi hız testinde sitenizin mobil puanı ${d?.pageSpeed?.score}/100 çıktı; telefondan girenlerin çoğu sayfa açılmadan çıkıyor.`;
    case "generic":
      return "Web sitenizi inceledim; telefondan gelen ziyaretçiyi müşteriye çevirmeyi kolaylaştıracak birkaç basit iyileştirme gördüm.";
  }
}

function offer(ctx: OutreachContext, angle: Angle): string {
  const benefit = benefitFor(ctx.category);
  if (angle === "instagram_only" || angle === "no_website" || angle === "parked") {
    return `Müşterilerin ${benefit} için doğrudan size yazabileceği, telefonda hızlı açılan sade bir site hazırlayabilirim.`;
  }
  if (angle === "down") return "Sorunun kaynağını bulup sitenizi tekrar yayına alabilirim.";
  return "Bunu kısa sürede düzeltip sitenizi modern ve mobil uyumlu hale getirebilirim.";
}

function compliment(ctx: OutreachContext): string | null {
  if (ctx.rating && ctx.rating >= 4.3 && ctx.review_count >= 15) {
    return `${ctx.review_count} yorum ve ${ctx.rating.toLocaleString("tr-TR")} puanla müşterileriniz sizden gerçekten memnun görünüyor.`;
  }
  return null;
}

/**
 * First-contact WhatsApp message. Deliberately short, one concrete observation,
 * ends with a question and contains no link (links in cold messages look like spam
 * and get numbers restricted).
 */
export function buildWhatsAppMessage(ctx: OutreachContext): string {
  const angle = pickAngle(ctx);
  const lines = [
    "Merhaba, iyi günler.",
    `Ben ${OUTREACH_SENDER.name}, ${OUTREACH_SENDER.studio} olarak yerel işletmelere web sitesi hazırlıyorum.`,
    observation(ctx, angle),
  ];
  const praise = compliment(ctx);
  if (praise) lines.push(praise);
  lines.push(offer(ctx, angle));
  lines.push("Uygun olursa size özel kısa bir örnek hazırlayıp göndereyim mi?");
  return lines.join("\n");
}

/** Spoken opening for a cold call — same observation, phrased for the phone. */
export function buildCallPitch(ctx: OutreachContext): string {
  const angle = pickAngle(ctx);
  const praise = compliment(ctx);
  return [
    `Merhaba, iyi günler. Ben ${OUTREACH_SENDER.name}, ${OUTREACH_SENDER.studio}'dan arıyorum; yerel işletmelere web sitesi yapıyorum.`,
    observation(ctx, angle),
    praise,
    offer(ctx, angle),
    "Size iki dakikada nasıl olacağını anlatabilir miyim?",
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildWhatsAppUrl(number: string, text: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
