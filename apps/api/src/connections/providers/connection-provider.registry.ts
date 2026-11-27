import { BadRequestException, Injectable } from "@nestjs/common";
import type { ConnectionProvider } from "./connection-provider.types";
import { EvolutionWhatsAppProvider } from "./evolution-whatsapp.provider";
import { FakeWhatsAppProvider } from "./fake-whatsapp.provider";

@Injectable()
export class ConnectionProviderRegistry {
  constructor(
    private readonly fake: FakeWhatsAppProvider,
    private readonly evolution: EvolutionWhatsAppProvider,
  ) {}

  defaultProvider() {
    const configured = process.env.CONNECTION_PROVIDER?.trim().toLowerCase();
    if (configured) return configured;
    return process.env.NODE_ENV === "production" ? "whatsapp" : "fake";
  }

  get(name?: string | null): ConnectionProvider {
    const provider = (name || this.defaultProvider()).trim().toLowerCase();
    if (provider === "fake") {
      const explicitlyFake = process.env.CONNECTION_PROVIDER?.trim().toLowerCase() === "fake";
      if (process.env.NODE_ENV === "production" && !explicitlyFake) {
        throw new BadRequestException("Fake connection provider is disabled in production");
      }
      return this.fake;
    }
    if (provider === "evolution" || provider === "whatsapp") {
      return this.evolution;
    }
    throw new BadRequestException("Connection provider is not configured");
  }
}
