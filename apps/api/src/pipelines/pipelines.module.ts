import { Global, Module } from "@nestjs/common";
import { PipelineChannelsController } from "./pipeline-channels.controller";
import { PipelineChannelsService } from "./pipeline-channels.service";
import { PipelinesController } from "./pipelines.controller";
import { PipelinesService } from "./pipelines.service";
import { PipelineAccessController } from "./pipeline-access.controller";
import { PipelineAccessService } from "./pipeline-access.service";

@Global()
@Module({
  controllers: [PipelineAccessController, PipelinesController, PipelineChannelsController],
  providers: [PipelineAccessService, PipelinesService, PipelineChannelsService],
  exports: [PipelineAccessService, PipelinesService, PipelineChannelsService],
})
export class PipelinesModule {}
