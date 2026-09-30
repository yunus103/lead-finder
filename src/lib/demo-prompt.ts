import { Business } from "@/types/business";
import type { PlaceDetails, PlaceReview } from "@/services/discovery/providers/google-maps-provider";
import { Angle, getPhoneInfo } from "./outreach";
import { demoUrl } from "./demo-slug";

const MAX_REVIEWS = 6;
const MIN_REVIEW_RATING = 4;

/** Falsy lines are dropped, so empty fields never reach the prompt. */
type Line = string | false | null | undefined | 0;

export interface DemoPromptInput {
  business: Business;
  templateId: string;
  slug: string;
  mapsUrl: string | null;
  angle: Angle;
  /** null when the lead has no Google place id. */
  details: PlaceDetails | null;
}

// Factual phrasing for the agent; the customer-facing wording is the agent's job.
const ANGLE_TEXT: Record<Angle, string> = {
  instagram_only: "web sitesi yok; Google profilinde web sitesi yerine Instagram görünüyor.",
  no_website: "web sitesi yok.",
  down: "Google profilindeki web sitesi açılmıyor.",
  parked: "web sitesi adresinde site yerine boş / yer tutucu bir sayfa açılıyor.",
  ssl: "mevcut sitede sertifika sorunu var, tarayıcı 'Güvenli değil' uyarısı veriyor.",
  mobile: "mevcut site mobil uyumlu değil.",
  outdated: "mevcut site uzun süredir güncellenmemiş görünüyor.",
  slow: "mevcut site mobilde yavaş açılıyor (Google PageSpeed puanı düşük).",
  generic: "mevcut site var, belirgin bir sorun yok; daha modern ve mobil odaklı bir alternatif olarak sunulacak.",
};

/** "Ayşe Kaya" → "Ayşe K.", as TEMPLATE.md asks. */
function shortName(fullName: string): string {
  const [first, ...rest] = fullName.split(/\s+/).filter(Boolean);
  const last = rest.at(-1);
  return last ? `${first} ${last.charAt(0).toLocaleUpperCase("tr")}.` : first || "";
}

function reviewLine(r: PlaceReview): string {
  const text = r.text.replace(/\s+/g, " ");
  return `- ${shortName(r.author)} (${r.rating}★): "${text}"`;
}

export function buildDemoPrompt(input: DemoPromptInput): string {
  const { business: b, templateId, slug, mapsUrl, angle, details } = input;
  const whatsapp = getPhoneInfo(b.phone).whatsappNumber;
  const instagram = b.instagram_normalized || b.instagram;
  const hours = details?.weekdayHours ?? [];
  const reviews = (details?.reviews ?? [])
    .filter((r) => r.rating >= MIN_REVIEW_RATING && r.text)
    .slice(0, MAX_REVIEWS);

  const facts: Line[] = [
    `- Ad: ${b.name}`,
    b.category && `- Kategori: ${b.category}`,
    b.phone && `- Telefon: ${b.phone}${whatsapp ? ` (WhatsApp: ${whatsapp})` : ""}`,
    b.address && `- Adres: ${b.address}`,
    (b.district || b.city) && `- İlçe / şehir: ${[b.district, b.city].filter(Boolean).join(" / ")}`,
    mapsUrl && `- Google Maps: ${mapsUrl}`,
    instagram && `- Instagram: @${instagram}`,
    b.website
      ? `- Mevcut web sitesi: ${b.website}`
      : b.website_status === "NO_WEBSITE" && "- Mevcut web sitesi: yok",
    b.rating && `- Google puanı: ${b.rating} (${b.review_count} yorum)`,
  ];

  const missing = [
    !whatsapp && "WhatsApp numarası",
    !instagram && "Instagram",
    hours.length === 0 && "açılış saatleri",
    reviews.length === 0 && "Google yorumları",
  ].filter(Boolean);

  const notes = b.notes?.trim().replace(/\s*\n\s*/g, " / ");

  const sections: (Line[] | false)[] = [
    [
      `Yeni demo: ${templateId} template'i, slug: ${slug}`,
      `Link: ${demoUrl(slug)}`,
      "yaytech-demos/CLAUDE.md'deki demo prosedürünü uygula.",
    ],
    [`İşletme (lead-finder, leadId: ${b.id}):`, ...facts],
    hours.length > 0 && ["Açılış saatleri (Google):", ...hours.map((h) => `- ${h}`)],
    reviews.length > 0 && ["Google yorumları (gerçek, Google'dan):", ...reviews.map(reviewLine)],
    [
      `Satış açısı: ${ANGLE_TEXT[angle]}`,
      notes && `Notlar: ${notes}`,
      missing.length > 0 && `Lead-finder'da olmayanlar (bana sor): ${missing.join(", ")}.`,
    ],
  ];

  return sections
    .filter((s): s is (string | false | null | undefined | 0)[] => Array.isArray(s))
    .map((s) => s.filter(Boolean).join("\n"))
    .join("\n\n");
}
