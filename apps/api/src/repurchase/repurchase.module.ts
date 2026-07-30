import { Module } from "@nestjs/common";
import { RepurchaseController } from "./repurchase.controller";
import { RepurchaseService } from "./repurchase.service";

@Module({
  controllers: [RepurchaseController],
  providers: [RepurchaseService],
  exports: [RepurchaseService],
})
export class RepurchaseModule {}
