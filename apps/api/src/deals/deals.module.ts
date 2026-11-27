import { Module } from "@nestjs/common";
import { DealsController } from "./deals.controller";
import { DealsService } from "./deals.service";
import { AutomationsModule } from "../automations/automations.module";

@Module({
  imports: [AutomationsModule],
  controllers: [DealsController],
  providers: [DealsService],
  exports: [DealsService],
})
export class DealsModule {}
