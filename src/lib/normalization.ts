import { WebsiteStatus } from "@/types/business";

/**
 * Normalizes a phone number to digits only.
 * Strips formatting characters: spaces, brackets, hyphens, plus signs.
 */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return null; // Ignore invalid fragments

  // Normalize Turkish standard numbers: e.g. 0532... -> 90532...
  if (digits.length === 11 && digits.startsWith("05")) {
    return "90" + digits.slice(1);
  }
  if (digits.length === 10 && digits.startsWith("5")) {
    return "90" + digits;
  }

  return digits;
}

/**
 * Normalizes a website URL to its root domain (lowercase, no www, no protocol, no paths).
 * Example: https://www.example.com/about?v=1 -> example.com
 */
export function normalizeDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim().toLowerCase();
  if (!trimmed) return null;

  try {
    const withProto = trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;
    const parsed = new URL(withProto);
    let host = parsed.hostname.toLowerCase();
    if (host.startsWith("www.")) {
      host = host.slice(4);
    }
    return host || null;
  } catch {
    // If URL parsing fails, perform regex cleanup
    const cleaned = trimmed
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      .split("?")[0];
    return cleaned || null;
  }
}

/**
 * Normalizes an Instagram handle or profile URL to a clean username.
 * Example: https://instagram.com/my_business/?hl=en -> my_business
 * Example: @my_business -> my_business
 */
export function normalizeInstagram(handleOrUrl: string | null | undefined): string | null {
  if (!handleOrUrl) return null;
  let cleaned = handleOrUrl.trim().toLowerCase();
  if (!cleaned) return null;

  // Remove leading @
  if (cleaned.startsWith("@")) {
    cleaned = cleaned.slice(1);
  }

  // Remove URL wrapper if full link provided
  cleaned = cleaned
    .replace(/^https?:\/\/(www\.)?instagram\.com\//, "")
    .split("/")[0]
    .split("?")[0];

  // Instagram usernames: letters, numbers, underscores, periods
  const match = cleaned.match(/^[a-z0-9._]+$/);
  return match ? cleaned : null;
}

/**
 * Normalizes business name for loose comparison (lowercase, trimmed whitespace, normalized punctuation).
 */
export function normalizeName(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, "") // strip punctuation while keeping unicode letters/numbers
    .replace(/\s+/g, " ");
}

/**
 * Determines initial website status based on presence of URL.
 */
export function initialWebsiteStatus(website: string | null | undefined): WebsiteStatus {
  if (!website || !website.trim()) {
    return "NO_WEBSITE";
  }
  return "UNKNOWN";
}
