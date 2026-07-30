import { Module } from "@nestjs/common";
import { PipelineChannelsController } from "./pipeline-channels.controller";
import { PipelineChannelsService } from "./pipeline-channels.service";
import { PipelinesController } from "./pipelines.controller";
import { PipelinesService } from "./pipelines.service";

@Module({
  controllers: [PipelinesController, PipelineChannelsController],
  providers: [PipelinesService, PipelineChannelsService],
  exports: [PipelinesService, PipelineChannelsService],
})
export class PipelinesModule {}
