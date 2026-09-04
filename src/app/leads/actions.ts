"use server";

import { revalidatePath } from "next/cache";
import { ingestBusiness } from "@/services/business-service";
import { IngestBusinessInput } from "@/types/business";

export async function ingestLeadAction(formData: FormData) {
  const name = formData.get("name") as string;
  const category = (formData.get("category") as string) || undefined;
  const phone = (formData.get("phone") as string) || undefined;
  const website = (formData.get("website") as string) || undefined;
  const instagram = (formData.get("instagram") as string) || undefined;
  const city = (formData.get("city") as string) || undefined;
  const district = (formData.get("district") as string) || undefined;
  const address = (formData.get("address") as string) || undefined;
  const external_id = (formData.get("external_id") as string) || undefined;
  const provider = (formData.get("provider") as IngestBusinessInput["provider"]) || "manual";

  if (!name || !name.trim()) {
    return { success: false, error: "Business name is required." };
  }

  try {
    const result = await ingestBusiness({
      name,
      category,
      phone,
      website,
      instagram,
      city,
      district,
      address,
      provider,
      external_id,
      rating: 4.5,
      review_count: 12,
    });

    revalidatePath("/leads");
    return {
      success: true,
      isNew: result.isNew,
      matchedBy: result.matchedBy,
      businessId: result.business.id,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}
