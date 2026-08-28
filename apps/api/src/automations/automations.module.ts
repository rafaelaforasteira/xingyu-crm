import { Module } from "@nestjs/common";
import { ConnectionsModule } from "../connections/connections.module";
import { AutomationsController } from "./automations.controller";
import { AutomationsWebhookController } from "./automations-webhook.controller";
import { AutomationsService } from "./automations.service";
import { AutomationEngineService } from "./automation-engine.service";
import { AutomationActionsService } from "./runtime/automation-actions.service";
import { AutomationQueueService } from "./runtime/automation-queue.service";
import { AutomationRuntimeService } from "./runtime/automation-runtime.service";
import { AutomationWorkerService } from "./runtime/automation-worker.service";
import { DomainEventsService } from "./runtime/domain-events.service";

@Module({
  imports: [ConnectionsModule],
  controllers: [AutomationsController, AutomationsWebhookController],
  providers: [
    AutomationsService,
    AutomationEngineService,
    DomainEventsService,
    AutomationQueueService,
    AutomationActionsService,
    AutomationRuntimeService,
    AutomationWorkerService,
  ],
  exports: [AutomationsService, AutomationEngineService, DomainEventsService],
})
export class AutomationsModule {}
