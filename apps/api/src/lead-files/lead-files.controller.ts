import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags } from "@nestjs/swagger";
import { DemoUser, type DemoUser as DemoUserType } from "../common/decorators/demo-user.decorator";
import { OrganizationId } from "../common/decorators/organization.decorator";
import { SaveMessageAttachmentDto } from "./dto/lead-file.dto";
import { LeadFilesService } from "./lead-files.service";

@ApiTags("lead-files")
@ApiHeader({ name: "X-Demo-User-Id", required: false })
@Controller("deals/:dealId/files")
export class LeadFilesController {
  constructor(private readonly leadFilesService: LeadFilesService) {}

  @Get()
  @ApiOperation({ summary: "List curated files saved for a deal" })
  list(@OrganizationId() orgId: string, @Param("dealId") dealId: string) {
    return this.leadFilesService.list(orgId, dealId);
  }

  @Post("from-message")
  @ApiOperation({ summary: "Save an existing message attachment to deal files" })
  save(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Param("dealId") dealId: string,
    @Body() dto: SaveMessageAttachmentDto,
  ) {
    return this.leadFilesService.save(orgId, dealId, dto, user.id);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Remove only the curated lead file reference" })
  remove(
    @OrganizationId() orgId: string,
    @Param("dealId") dealId: string,
    @Param("id") id: string,
  ) {
    return this.leadFilesService.remove(orgId, dealId, id);
  }
}
