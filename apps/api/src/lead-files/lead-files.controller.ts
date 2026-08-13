import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags } from "@nestjs/swagger";
import { DemoUser, type DemoUser as DemoUserType } from "../common/decorators/demo-user.decorator";
import { OrganizationId } from "../common/decorators/organization.decorator";
import { SaveMessageAttachmentDto } from "./dto/lead-file.dto";
import { LeadFilesService } from "./lead-files.service";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/types";
import { PipelineAccessService } from "../pipelines/pipeline-access.service";

@ApiTags("lead-files")
@ApiHeader({ name: "X-Demo-User-Id", required: false })
@Controller("deals/:dealId/files")
export class LeadFilesController {
  constructor(private readonly leadFilesService: LeadFilesService, private readonly access: PipelineAccessService) {}

  @Get()
  @ApiOperation({ summary: "List curated files saved for a deal" })
  async list(@OrganizationId() orgId: string, @CurrentUser() user: AuthenticatedUser, @Param("dealId") dealId: string) {
    await this.access.assertDealAccess(user, dealId);
    return this.leadFilesService.list(orgId, dealId);
  }

  @Post("from-message")
  @ApiOperation({ summary: "Save an existing message attachment to deal files" })
  async save(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Param("dealId") dealId: string,
    @Body() dto: SaveMessageAttachmentDto,
    @CurrentUser() authUser: AuthenticatedUser,
  ) {
    await this.access.assertDealAccess(authUser, dealId);
    return this.leadFilesService.save(orgId, dealId, dto, user.id);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Remove only the curated lead file reference" })
  async remove(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Param("dealId") dealId: string,
    @Param("id") id: string,
    @CurrentUser() authUser: AuthenticatedUser,
  ) {
    await this.access.assertDealAccess(authUser, dealId);
    return this.leadFilesService.remove(orgId, dealId, id, user.id);
  }
}
