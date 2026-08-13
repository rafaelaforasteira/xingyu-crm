import { Module } from "@nestjs/common";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";
import { PipelinesModule } from "../pipelines/pipelines.module";

@Module({
  imports: [PipelinesModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
