export type CrmStatus =
  | "NEW"
  | "QUALIFIED"
  | "TO_CALL"
  | "CONTACTED"
  | "FOLLOW_UP"
  | "INTERESTED"
  | "MEETING"
  | "PROPOSAL"
  | "WON"
  | "LOST";

export interface CrmStatusConfig {
  label: string;
  bg: string;
  text: string;
  border: string;
  dot: string;
}

export const CRM_STATUS_CONFIG: Record<CrmStatus, CrmStatusConfig> = {
  NEW: {
    label: "Yeni Aday",
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-200",
    dot: "bg-slate-400",
  },
  QUALIFIED: {
    label: "Nitelikli",
    bg: "bg-sky-50",
    text: "text-sky-700",
    border: "border-sky-200",
    dot: "bg-sky-500",
  },
  TO_CALL: {
    label: "Aranacak",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    dot: "bg-blue-500",
  },
  CONTACTED: {
    label: "Ulaşıldı",
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
    dot: "bg-indigo-500",
  },
  FOLLOW_UP: {
    label: "Geri Aranacak",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  INTERESTED: {
    label: "İlgileniyor",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  MEETING: {
    label: "Toplantı Ayarlandı",
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
    dot: "bg-purple-500",
  },
  PROPOSAL: {
    label: "Teklif İletildi",
    bg: "bg-teal-50",
    text: "text-teal-700",
    border: "border-teal-200",
    dot: "bg-teal-500",
  },
  WON: {
    label: "Kazanıldı",
    bg: "bg-green-100",
    text: "text-green-800",
    border: "border-green-300",
    dot: "bg-green-600",
  },
  LOST: {
    label: "Olumsuz / Red",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    dot: "bg-rose-500",
  },
};

export type ActivityType = "call" | "status_change" | "note" | "follow_up" | "whatsapp";

export type CallOutcome =
  | "no_answer"
  | "callback"
  | "interested"
  | "meeting"
  | "proposal"
  | "rejected"
  | "excluded";

export interface LeadActivity {
  id: string;
  business_id: string;
  type: ActivityType;
  outcome?: CallOutcome | string | null;
  content: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export type ExclusionReason =
  | "chain"
  | "invalid_number"
  | "existing_client"
  | "irrelevant_sector"
  | "other";

export const EXCLUSION_REASONS: { value: ExclusionReason; label: string }[] = [
  { value: "chain", label: "Zincir / Şube / Büyük Marka" },
  { value: "invalid_number", label: "Geçersiz / Ulaşılamayan Numara" },
  { value: "existing_client", label: "Mevcut Müşteri / Tanıdık" },
  { value: "irrelevant_sector", label: "Alakasız Sektör / Uygun Değil" },
  { value: "other", label: "Diğer Sebepler" },
];