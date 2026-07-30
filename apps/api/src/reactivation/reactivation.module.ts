import { Module } from "@nestjs/common";
import { ReactivationController } from "./reactivation.controller";
import { ReactivationService } from "./reactivation.service";

@Module({
  controllers: [ReactivationController],
  providers: [ReactivationService],
})
export class ReactivationModule {}
