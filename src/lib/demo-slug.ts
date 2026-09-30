// Mirrors the slug rules enforced by yaytech-demos/scripts/new-site.mjs.

const MAX_LENGTH = 40;
const RESERVED = new Set(["www", "app", "api", "mail", "demo", "admin", "static"]);
// Generic words dropped from business names ("SVD Pilates Stüdyo" → "svd-pilates").
const FILLER = new Set(["studyo", "studio", "salonu", "merkezi", "ltd", "sti", "tic", "san"]);

const TR_MAP: Record<string, string> = { ş: "s", ı: "i", ğ: "g", ü: "u", ö: "o", ç: "c" };

function toAscii(text: string): string {
  return text
    .toLocaleLowerCase("tr")
    .replace(/[şığüöç]/g, (ch) => TR_MAP[ch])
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function clean(words: string[]): string {
  return words.join("-").slice(0, MAX_LENGTH).replace(/^-+|-+$/g, "");
}

export function slugFromName(name: string): string {
  const words = toAscii(name).split(/[^a-z0-9]+/).filter(Boolean);
  const meaningful = words.filter((w) => !FILLER.has(w));
  return clean(meaningful.length > 0 ? meaningful : words);
}

/** Returns an error message, or null when the slug is valid. */
export function validateSlug(slug: string): string | null {
  if (!slug) return "Slug boş olamaz.";
  if (slug.length > MAX_LENGTH) return `En fazla ${MAX_LENGTH} karakter.`;
  if (!/^[a-z0-9-]+$/.test(slug)) return "Sadece küçük harf, rakam ve - kullanılabilir.";
  if (slug.startsWith("-") || slug.endsWith("-")) return "Başında veya sonunda - olamaz.";
  if (RESERVED.has(slug)) return "Bu isim ayrılmış.";
  return null;
}

export function demoUrl(slug: string): string {
  return `https://${slug}.yaytechstudio.com`;
}
