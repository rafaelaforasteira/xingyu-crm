import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { DemoUser, type DemoUser as DemoUserType } from "../common/decorators/demo-user.decorator";
import { OrganizationId } from "../common/decorators/organization.decorator";
import {
  ConnectPipelineChannelDto,
  SimulatePipelineLeadDto,
  UpdatePipelineChannelDto,
  UpdateChannelOwnershipDto,
} from "./dto/pipeline-channel.dto";
import { PipelineChannelsService } from "./pipeline-channels.service";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/types";
import { PipelineAccessService } from "./pipeline-access.service";
import { AuthRole } from "@xingyu/database";
import { Roles } from "../auth/decorators/roles.decorator";

@ApiTags("pipeline channels")
@ApiHeader({ name: "X-Demo-User-Id", required: false })
@ApiNotFoundResponse({ description: "Pipeline or connection was not found" })
@Controller("pipelines/:pipelineId/channels")
@Roles(AuthRole.ADMIN)
export class PipelineChannelsController {
  constructor(
    private readonly service: PipelineChannelsService,
    private readonly access: PipelineAccessService,
  ) {}

  @Get("available")
  @ApiOperation({
    summary: "List existing integration accounts available to a pipeline",
  })
  async available(
    @OrganizationId() organizationId: string,
    @CurrentUser() authUser: AuthenticatedUser,
    @Param("pipelineId") pipelineId: string,
  ) {
    await this.access.assertAccess(authUser, pipelineId);
    return this.service.available(organizationId, pipelineId);
  }

  @Get()
  @ApiOperation({ summary: "List channel routes configured for a pipeline" })
  async list(
    @OrganizationId() organizationId: string,
    @CurrentUser() authUser: AuthenticatedUser,
    @Param("pipelineId") pipelineId: string,
  ) {
    await this.access.assertAccess(authUser, pipelineId);
    return this.service.list(organizationId, pipelineId);
  }

  @Post()
  @ApiOperation({
    summary: "Connect an existing integration account to a pipeline",
  })
  @ApiBadRequestResponse({ description: "A routing reference is invalid" })
  @ApiConflictResponse({ description: "The account is already connected" })
  async connect(
    @OrganizationId() organizationId: string,
    @DemoUser() user: DemoUserType,
    @Param("pipelineId") pipelineId: string,
    @Body() dto: ConnectPipelineChannelDto,
    @CurrentUser() authUser: AuthenticatedUser,
  ) {
    await this.access.assertAccess(authUser, pipelineId);
    return this.service.connect(organizationId, pipelineId, dto, user.id);
  }

  @Patch(":connectionId")
  @ApiOperation({ summary: "Edit the routing configuration for a channel" })
  @ApiBadRequestResponse({ description: "A routing reference is invalid" })
  async update(
    @OrganizationId() organizationId: string,
    @DemoUser() user: DemoUserType,
    @Param("pipelineId") pipelineId: string,
    @Param("connectionId") connectionId: string,
    @Body() dto: UpdatePipelineChannelDto,
    @CurrentUser() authUser: AuthenticatedUser,
  ) {
    await this.access.assertAccess(authUser, pipelineId);
    return this.service.update(organizationId, pipelineId, connectionId, dto, user.id);
  }

  @Patch(":connectionId/pause")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Pause a pipeline channel route" })
  async pause(
    @OrganizationId() organizationId: string,
    @DemoUser() user: DemoUserType,
    @Param("pipelineId") pipelineId: string,
    @Param("connectionId") connectionId: string,
    @CurrentUser() authUser: AuthenticatedUser,
  ) {
    await this.access.assertAccess(authUser, pipelineId);
    return this.service.pause(organizationId, pipelineId, connectionId, user.id);
  }

  @Patch(":connectionId/ownership")
  @ApiOperation({ summary: "Configure organization, pipeline, or personal channel ownership" })
  async updateOwnership(
    @OrganizationId() organizationId: string,
    @DemoUser() user: DemoUserType,
    @Param("pipelineId") pipelineId: string,
    @Param("connectionId") connectionId: string,
    @Body() dto: UpdateChannelOwnershipDto,
    @CurrentUser() authUser: AuthenticatedUser,
  ) {
    await this.access.assertAccess(authUser, pipelineId);
    return this.service.updateOwnership(organizationId, pipelineId, connectionId, dto, user.id);
  }

  @Patch(":connectionId/resume")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Resume a pipeline channel route" })
  @ApiConflictResponse({ description: "The integration account is inactive" })
  async resume(
    @OrganizationId() organizationId: string,
    @DemoUser() user: DemoUserType,
    @Param("pipelineId") pipelineId: string,
    @Param("connectionId") connectionId: string,
    @CurrentUser() authUser: AuthenticatedUser,
  ) {
    await this.access.assertAccess(authUser, pipelineId);
    return this.service.resume(organizationId, pipelineId, connectionId, user.id);
  }

  @Post(":connectionId/test")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Run a local DEMO health check without external provider calls",
  })
  @ApiConflictResponse({
    description: "The route is paused or the integration account is inactive",
  })
  async test(
    @OrganizationId() organizationId: string,
    @DemoUser() user: DemoUserType,
    @Param("pipelineId") pipelineId: string,
    @Param("connectionId") connectionId: string,
    @CurrentUser() authUser: AuthenticatedUser,
  ) {
    await this.access.assertAccess(authUser, pipelineId);
    return this.service.test(organizationId, pipelineId, connectionId, user.id);
  }

  @Post(":connectionId/simulate")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Simulate an inbound DEMO lead and persist the configured local CRM entities",
  })
  @ApiOkResponse({
    description:
      "Created or matched contact and any conversation, inbound message, and deal enabled by the route",
  })
  @ApiBadRequestResponse({
    description: "The simulated lead or a routing reference is invalid",
  })
  @ApiConflictResponse({
    description: "The route/account is inactive or duplicateStrategy rejects the contact",
  })
  async simulate(
    @OrganizationId() organizationId: string,
    @DemoUser() user: DemoUserType,
    @Param("pipelineId") pipelineId: string,
    @Param("connectionId") connectionId: string,
    @Body() dto: SimulatePipelineLeadDto,
    @CurrentUser() authUser: AuthenticatedUser,
  ) {
    await this.access.assertAccess(authUser, pipelineId);
    return this.service.simulate(organizationId, pipelineId, connectionId, dto, user.id);
  }

  @Delete(":connectionId")
  @ApiOperation({ summary: "Soft-disconnect an account from a pipeline" })
  async disconnect(
    @OrganizationId() organizationId: string,
    @DemoUser() user: DemoUserType,
    @Param("pipelineId") pipelineId: string,
    @Param("connectionId") connectionId: string,
    @CurrentUser() authUser: AuthenticatedUser,
  ) {
    await this.access.assertAccess(authUser, pipelineId);
    return this.service.disconnect(organizationId, pipelineId, connectionId, user.id);
  }
}
