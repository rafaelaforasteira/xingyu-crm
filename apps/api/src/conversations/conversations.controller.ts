import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { ApiTags, ApiOperation, ApiHeader, ApiConsumes, ApiBody } from "@nestjs/swagger";
import { memoryStorage } from "multer";
import { ConversationsService } from "./conversations.service";
import { OrganizationId } from "../common/decorators/organization.decorator";
import { DemoUser, type DemoUser as DemoUserType } from "../common/decorators/demo-user.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/types";
import { PipelineAccessService } from "../pipelines/pipeline-access.service";
import { uploadMaxBytes } from "../common/upload/upload.util";
import {
  CreateConversationDto,
  UpdateConversationDto,
  QueryConversationsDto,
  QueryMessagesDto,
  SendMessageDto,
} from "./dto/conversation.dto";

@ApiTags("conversations")
@ApiHeader({ name: "X-Demo-User-Id", required: false })
@Controller("conversations")
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService, private readonly access: PipelineAccessService) {}

  @Get()
  @ApiOperation({ summary: "List conversations (light inbox payload)" })
  async findAll(@OrganizationId() orgId: string, @CurrentUser() user: AuthenticatedUser, @Query() query: QueryConversationsDto) {
    return this.conversationsService.findAll(orgId, query, await this.access.accessiblePipelineIds(user), await this.access.conversationWhere(user));
  }

  @Get(":id/context")
  @ApiOperation({
    summary: "Lead context panel summary",
    description:
      "Returns counts and summaries only. Use notes/tasks/orders APIs with entity ids from this payload for full lists.",
  })
  async getContext(@OrganizationId() orgId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    await this.access.assertConversationAccess(user, id);
    return this.conversationsService.getContext(orgId, id);
  }

  @Get(":id/messages")
  @ApiOperation({ summary: "List messages with cursor pagination" })
  async listMessages(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Query() query: QueryMessagesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.access.assertConversationAccess(user, id);
    return this.conversationsService.listMessages(orgId, id, query);
  }

  @Patch(":id/read")
  @ApiOperation({ summary: "Mark conversation as read" })
  async markAsRead(@OrganizationId() orgId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    await this.access.assertConversationAccess(user, id);
    return this.conversationsService.markAsRead(orgId, id);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get conversation detail (no message history)" })
  async findOne(@OrganizationId() orgId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    await this.access.assertConversationAccess(user, id);
    return this.conversationsService.findOne(orgId, id);
  }

  @Post()
  @ApiOperation({ summary: "Create conversation" })
  create(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Body() dto: CreateConversationDto,
  ) {
    return this.conversationsService.create(orgId, dto, user.id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update conversation" })
  async update(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Body() dto: UpdateConversationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.access.assertConversationAccess(user, id);
    if (dto.assigneeId !== undefined) {
      const pipelineId = await this.access.conversationPipelineId(user, id);
      if (pipelineId) await this.access.assertEligibleUser(user, pipelineId, dto.assigneeId);
    }
    return this.conversationsService.update(orgId, id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Soft-delete conversation" })
  async remove(@OrganizationId() orgId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    await this.access.assertConversationAccess(user, id);
    return this.conversationsService.remove(orgId, id);
  }

  @Post(":id/messages")
  @ApiOperation({
    summary: "Send message (text and/or CRM-only attachments)",
    description:
      "Attachments are stored in the CRM only. They are not forwarded to WhatsApp/Meta in this phase.",
  })
  @ApiConsumes("application/json", "multipart/form-data")
  @ApiBody({ type: SendMessageDto })
  @UseInterceptors(
    FilesInterceptor("files", 10, {
      storage: memoryStorage(),
      limits: { fileSize: uploadMaxBytes(), files: 10 },
    }),
  )
  async sendMessage(
    @OrganizationId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: SendMessageDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    await this.access.assertConversationAccess(user, id);
    return this.conversationsService.sendMessage(
      orgId,
      id,
      dto,
      user.id,
      files ?? [],
    );
  }
}
