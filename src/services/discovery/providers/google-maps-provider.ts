import { DiscoveryProvider } from "@/types/business";
import { IDiscoveryProvider, RawDiscoveredLead } from "../types";

interface GooglePlaceNew {
  id: string;
  displayName?: {
    text: string;
    languageCode?: string;
  };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
  types?: string[];
  businessStatus?: "OPERATIONAL" | "CLOSED_TEMPORARILY" | "CLOSED_PERMANENTLY";
}

interface GooglePlacesSearchResponse {
  places?: GooglePlaceNew[];
  nextPageToken?: string;
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

export class GoogleMapsProvider implements IDiscoveryProvider {
  readonly name: DiscoveryProvider = "google_maps";

  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GOOGLE_PLACES_API_KEY || "";
  }

  async discover(params: {
    location: string;
    district?: string;
    sector: string;
    limit?: number;
  }): Promise<RawDiscoveredLead[]> {
    if (!this.apiKey) {
      console.warn("GoogleMapsProvider: GOOGLE_PLACES_API_KEY is not set. Skipping real Maps query.");
      return [];
    }

    const queryParts = [params.district, params.location, params.sector].filter(Boolean);
    const textQuery = queryParts.join(" ");

    const targetLimit = Math.min(60, Math.max(20, params.limit || 20));
    const allPlaces: GooglePlaceNew[] = [];
    let pageToken: string | undefined = undefined;

    // Field mask includes nextPageToken to support 20/40/60 lead discovery
    const fieldMask = [
      "places.id",
      "places.displayName",
      "places.formattedAddress",
      "places.nationalPhoneNumber",
      "places.websiteUri",
      "places.googleMapsUri",
      "places.rating",
      "places.userRatingCount",
      "places.types",
      "places.businessStatus",
      "nextPageToken",
    ].join(",");

    try {
      while (allPlaces.length < targetLimit) {
        const bodyPayload: Record<string, unknown> = {
          textQuery,
          languageCode: "tr",
          maxResultCount: 20,
        };
        if (pageToken) {
          bodyPayload.pageToken = pageToken;
        }

        const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": this.apiKey,
            "X-Goog-FieldMask": fieldMask,
          },
          body: JSON.stringify(bodyPayload),
        });

        const data = (await response.json()) as GooglePlacesSearchResponse;

        if (!response.ok || data.error) {
          if (allPlaces.length > 0) break;
          const errorMsg = data.error?.message || response.statusText;
          console.error("Google Places API Error:", errorMsg);
          throw new Error(`Google Places API Hatası (${response.status}): ${errorMsg}`);
        }

        if (!data.places || data.places.length === 0) {
          break;
        }

        allPlaces.push(...data.places);

        if (!data.nextPageToken || allPlaces.length >= targetLimit) {
          break;
        }

        pageToken = data.nextPageToken;
        await new Promise((resolve) => setTimeout(resolve, 150));
      }

      if (allPlaces.length === 0) {
        return [];
      }

      // Closed businesses are never leads.
      const openPlaces = allPlaces.filter((p) => !p.businessStatus || p.businessStatus === "OPERATIONAL");

      return openPlaces.map((place) => ({
        name: place.displayName?.text?.trim() || "İsimsiz İşletme",
        category: params.sector,
        address: place.formattedAddress || null,
        city: params.location,
        district: params.district || null,
        phone: place.nationalPhoneNumber || null,
        website: place.websiteUri || null,
        instagram: null, // Google Places does not provide Instagram; enriched in later phases
        rating: place.rating ?? null,
        review_count: place.userRatingCount ?? 0,
        external_id: place.id, // Stable Google Place ID
        source_url: place.googleMapsUri || null,
        raw_data: place as unknown as Record<string, unknown>,
      }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("GoogleMapsProvider failed to execute discover:", message);
      throw error;
    }
  }
}
