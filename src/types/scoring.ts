export type LeadPriority = "HOT" | "WARM" | "COLD" | "LOW";

export interface ScoreReason {
  label: string;
  points: number;
  type: "positive" | "negative";
  category: "website" | "reputation" | "reachability" | "penalty";
}

export interface ScoreCalculationResult {
  score: number; // Clamped to 0–100
  priority: LeadPriority;
  reasons: ScoreReason[];
}
