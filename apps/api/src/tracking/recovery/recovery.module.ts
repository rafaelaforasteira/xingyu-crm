import { Module } from "@nestjs/common";
import { RecoveryController } from "./recovery.controller";
import { RecoveryService } from "./recovery.service";
import { RECOVERY_DATA_SOURCE } from "./recovery-data-source";
import { DemoShopifyRecoveryDataSource } from "./demo-shopify-recovery.source";
@Module({
  controllers: [RecoveryController],
  providers: [
    RecoveryService,
    { provide: RECOVERY_DATA_SOURCE, useClass: DemoShopifyRecoveryDataSource },
  ],
})
export class RecoveryModule {}
