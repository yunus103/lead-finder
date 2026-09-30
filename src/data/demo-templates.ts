export interface DemoTemplate {
  id: string;
  label: string;
  /** Matched case-insensitively against the lead's category to preselect the template. */
  categories: string[];
}

export const DEMO_TEMPLATES: DemoTemplate[] = [
  { id: "pilates", label: "Pilates stüdyosu", categories: ["pilates", "yoga", "reformer"] },
];

export function matchDemoTemplate(category: string | null): DemoTemplate | null {
  const c = (category || "").toLocaleLowerCase("tr");
  return DEMO_TEMPLATES.find((t) => t.categories.some((k) => c.includes(k))) ?? null;
}
