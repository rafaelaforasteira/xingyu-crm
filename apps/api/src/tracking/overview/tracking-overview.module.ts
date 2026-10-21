import { Module } from "@nestjs/common";
import { IntegrationsModule } from "../../integrations/integrations.module";
import { TrackingOverviewController } from "./tracking-overview.controller";
import { TrackingOverviewService } from "./tracking-overview.service";

@Module({
  imports: [IntegrationsModule],
  controllers: [TrackingOverviewController],
  providers: [TrackingOverviewService],
})
export class TrackingOverviewModule {}
