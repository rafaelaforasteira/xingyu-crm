import { Module } from "@nestjs/common";
import { LeadFilesController } from "./lead-files.controller";
import { LeadFilesService } from "./lead-files.service";

@Module({
  controllers: [LeadFilesController],
  providers: [LeadFilesService],
})
export class LeadFilesModule {}
