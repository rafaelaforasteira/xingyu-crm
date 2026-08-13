import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiHeader } from "@nestjs/swagger";
import { NotesService } from "./notes.service";
import { OrganizationId } from "../common/decorators/organization.decorator";
import { DemoUser, type DemoUser as DemoUserType } from "../common/decorators/demo-user.decorator";
import { CreateNoteDto, UpdateNoteDto, QueryNotesDto } from "./dto/note.dto";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/types";
import { PipelineAccessService } from "../pipelines/pipeline-access.service";

@ApiTags("notes")
@ApiHeader({ name: "X-Demo-User-Id", required: false })
@Controller("notes")
export class NotesController {
  constructor(private readonly notesService: NotesService, private readonly access: PipelineAccessService) {}

  @Get()
  @ApiOperation({ summary: "List notes" })
  async findAll(@OrganizationId() orgId: string, @CurrentUser() user: AuthenticatedUser, @Query() query: QueryNotesDto) {
    return this.notesService.findAll(orgId, query, await this.access.accessiblePipelineIds(user));
  }

  @Get(":id")
  async findOne(@OrganizationId() orgId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    await this.access.assertNoteAccess(user, id);
    return this.notesService.findOne(orgId, id);
  }

  @Post()
  async create(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Body() dto: CreateNoteDto,
    @CurrentUser() authUser: AuthenticatedUser,
  ) {
    if (dto.dealId) await this.access.assertDealAccess(authUser, dto.dealId);
    return this.notesService.create(orgId, dto, user.id);
  }

  @Patch(":id")
  async update(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Body() dto: UpdateNoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.access.assertNoteAccess(user, id);
    return this.notesService.update(orgId, id, dto);
  }

  @Delete(":id")
  async remove(@OrganizationId() orgId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    await this.access.assertNoteAccess(user, id);
    return this.notesService.remove(orgId, id);
  }
}
