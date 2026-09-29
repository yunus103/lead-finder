import { normalizeInstagram } from "./normalization";

export type WebPresenceKind = "website" | "social" | "platform" | "none";

export interface WebPresence {
  kind: WebPresenceKind;
  /** Human readable platform name when kind is social/platform (e.g. "Instagram", "Doktortakvimi"). */
  platform: string | null;
  /** Extracted Instagram handle when the "website" is actually an Instagram profile. */
  instagram: string | null;
}

// Hosts that Google Maps often lists as "website" but are not a site the business owns.
// Any of these means the business has no real website → strongest sales opportunity.
const SOCIAL_HOSTS: Record<string, string> = {
  "instagram.com": "Instagram",
  "facebook.com": "Facebook",
  "fb.com": "Facebook",
  "m.facebook.com": "Facebook",
  "tiktok.com": "TikTok",
  "twitter.com": "X",
  "x.com": "X",
  "youtube.com": "YouTube",
  "linkedin.com": "LinkedIn",
  "linktr.ee": "Linktree",
  "wa.me": "WhatsApp",
  "api.whatsapp.com": "WhatsApp",
  "whatsapp.com": "WhatsApp",
  "t.me": "Telegram",
};

const PLATFORM_HOSTS: Record<string, string> = {
  "business.site": "Google Business Site",
  "sites.google.com": "Google Sites",
  "g.page": "Google Profil",
  "maps.app.goo.gl": "Google Haritalar",
  "goo.gl": "Google Kısa Link",
  "google.com": "Google",
  "doktortakvimi.com": "Doktortakvimi",
  "randevum.com": "Randevum",
  "fresha.com": "Fresha",
  "booksy.com": "Booksy",
  "setmore.com": "Setmore",
  "calendly.com": "Calendly",
  "armut.com": "Armut",
  "sahibinden.com": "Sahibinden",
  "yemeksepeti.com": "Yemeksepeti",
  "getir.com": "Getir",
  "trendyol.com": "Trendyol",
  "hepsiburada.com": "Hepsiburada",
  "n11.com": "n11",
  "ciceksepeti.com": "Çiçeksepeti",
  "booking.com": "Booking",
  "tripadvisor.com": "Tripadvisor",
  "tripadvisor.com.tr": "Tripadvisor",
  "airbnb.com": "Airbnb",
  "etsy.com": "Etsy",
  "wixsite.com": "Wix (ücretsiz alt alan adı)",
  "blogspot.com": "Blogspot",
  "wordpress.com": "WordPress.com (ücretsiz)",
  "tr.pinterest.com": "Pinterest",
  "pinterest.com": "Pinterest",
};

function matchHost(host: string, table: Record<string, string>): string | null {
  for (const [domain, label] of Object.entries(table)) {
    if (host === domain || host.endsWith(`.${domain}`)) return label;
  }
  return null;
}

export function parseHost(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  try {
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return new URL(withProto).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Classifies the URL Google (or the user) lists as a business "website".
 * Social profiles and marketplace/booking pages are treated as "no real website".
 */
export function classifyWebPresence(rawUrl: string | null | undefined): WebPresence {
  if (!rawUrl || !rawUrl.trim()) return { kind: "none", platform: null, instagram: null };

  const host = parseHost(rawUrl);
  if (!host) return { kind: "none", platform: null, instagram: null };

  const social = matchHost(host, SOCIAL_HOSTS);
  if (social) {
    return {
      kind: "social",
      platform: social,
      instagram: social === "Instagram" ? normalizeInstagram(rawUrl) : null,
    };
  }

  const platform = matchHost(host, PLATFORM_HOSTS);
  if (platform) return { kind: "platform", platform, instagram: null };

  return { kind: "website", platform: null, instagram: null };
}
