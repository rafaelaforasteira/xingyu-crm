import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { PrismaService } from "../prisma/prisma.service";
import { Public } from "../auth/decorators/public.decorator";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Health check" })
  async check() {
    const startedAt = performance.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({
        status: "degraded",
        service: "xingyu-api",
        database: "down",
        message: "Banco de dados indisponível.",
        timestamp: new Date().toISOString(),
      });
    }

    return {
      status: "ok",
      service: "xingyu-api",
      database: "up",
      databaseLatencyMs: Math.round((performance.now() - startedAt) * 100) / 100,
      demoMode: process.env.DEMO_MODE === "true",
      environment: process.env.NODE_ENV ?? "development",
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get("ready")
  @ApiOperation({ summary: "Readiness probe" })
  ready() {
    return { ready: true };
  }
}
