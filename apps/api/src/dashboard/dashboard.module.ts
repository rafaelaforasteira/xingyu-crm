import { Module } from "@nestjs/common";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";
import { PipelinesModule } from "../pipelines/pipelines.module";
import { GoalsController } from "./goals.controller";
import { GoalsService } from "./goals.service";

@Module({
  imports: [PipelinesModule],
  controllers: [DashboardController, GoalsController],
  providers: [DashboardService, GoalsService],
})
export class DashboardModule {}
