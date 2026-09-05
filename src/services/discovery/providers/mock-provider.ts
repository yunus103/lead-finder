import { DiscoveryProvider } from "@/types/business";
import { IDiscoveryProvider, RawDiscoveredLead } from "../types";

export class MockDiscoveryProvider implements IDiscoveryProvider {
  readonly name: DiscoveryProvider;

  constructor(providerName: DiscoveryProvider = "manual") {
    this.name = providerName;
  }

  async discover(params: {
    location: string;
    district?: string;
    sector: string;
    limit?: number;
  }): Promise<RawDiscoveredLead[]> {
    const loc = params.district ? `${params.district}, ${params.location}` : params.location;

    // Returns mock businesses simulating real provider discovery
    return [
      {
        name: `${params.location} ${params.sector} Merkezi`,
        category: params.sector,
        address: `${loc}, Atatürk Cad. No: 12`,
        city: params.location,
        district: params.district || "Merkez",
        phone: "0532 999 11 22",
        website: `https://${params.sector.toLowerCase().replace(/\s+/g, "")}-merkezi.com`,
        instagram: `@${params.sector.toLowerCase().replace(/\s+/g, "")}_ist`,
        rating: 4.7,
        review_count: 38,
        external_id: `mock_${this.name}_001`,
        source_url: `https://mock-${this.name}.example.com/lead1`,
        raw_data: { simulated: true, provider: this.name, query: params },
      },
      {
        name: `Özel ${params.district || params.location} ${params.sector}`,
        category: params.sector,
        address: `${loc}, Bağdat Cad. No: 88`,
        city: params.location,
        district: params.district || "Merkez",
        phone: "0542 888 33 44",
        website: null, // Business without website (HOT prospect candidate)
        instagram: `@ozel_${params.district || "ist"}_${params.sector.toLowerCase().replace(/\s+/g, "")}`,
        rating: 4.9,
        review_count: 92,
        external_id: `mock_${this.name}_002`,
        source_url: `https://mock-${this.name}.example.com/lead2`,
        raw_data: { simulated: true, provider: this.name, query: params },
      },
    ];
  }
}
