import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiHeader } from "@nestjs/swagger";
import { NotesService } from "./notes.service";
import { OrganizationId } from "../common/decorators/organization.decorator";
import { DemoUser, type DemoUser as DemoUserType } from "../common/decorators/demo-user.decorator";
import { CreateNoteDto, UpdateNoteDto, QueryNotesDto } from "./dto/note.dto";

@ApiTags("notes")
@ApiHeader({ name: "X-Demo-User-Id", required: false })
@Controller("notes")
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  @ApiOperation({ summary: "List notes" })
  findAll(@OrganizationId() orgId: string, @Query() query: QueryNotesDto) {
    return this.notesService.findAll(orgId, query);
  }

  @Get(":id")
  findOne(@OrganizationId() orgId: string, @Param("id") id: string) {
    return this.notesService.findOne(orgId, id);
  }

  @Post()
  create(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Body() dto: CreateNoteDto,
  ) {
    return this.notesService.create(orgId, dto, user.id);
  }

  @Patch(":id")
  update(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Body() dto: UpdateNoteDto,
  ) {
    return this.notesService.update(orgId, id, dto);
  }

  @Delete(":id")
  remove(@OrganizationId() orgId: string, @Param("id") id: string) {
    return this.notesService.remove(orgId, id);
  }
}
