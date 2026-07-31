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
} from "./dto/pipeline-channel.dto";
import { PipelineChannelsService } from "./pipeline-channels.service";

@ApiTags("pipeline channels")
@ApiHeader({ name: "X-Demo-User-Id", required: false })
@ApiNotFoundResponse({ description: "Pipeline or connection was not found" })
@Controller("pipelines/:pipelineId/channels")
export class PipelineChannelsController {
  constructor(private readonly service: PipelineChannelsService) {}

  @Get("available")
  @ApiOperation({
    summary: "List existing integration accounts available to a pipeline",
  })
  available(@OrganizationId() organizationId: string, @Param("pipelineId") pipelineId: string) {
    return this.service.available(organizationId, pipelineId);
  }

  @Get()
  @ApiOperation({ summary: "List channel routes configured for a pipeline" })
  list(@OrganizationId() organizationId: string, @Param("pipelineId") pipelineId: string) {
    return this.service.list(organizationId, pipelineId);
  }

  @Post()
  @ApiOperation({
    summary: "Connect an existing integration account to a pipeline",
  })
  @ApiBadRequestResponse({ description: "A routing reference is invalid" })
  @ApiConflictResponse({ description: "The account is already connected" })
  connect(
    @OrganizationId() organizationId: string,
    @DemoUser() user: DemoUserType,
    @Param("pipelineId") pipelineId: string,
    @Body() dto: ConnectPipelineChannelDto,
  ) {
    return this.service.connect(organizationId, pipelineId, dto, user.id);
  }

  @Patch(":connectionId")
  @ApiOperation({ summary: "Edit the routing configuration for a channel" })
  @ApiBadRequestResponse({ description: "A routing reference is invalid" })
  update(
    @OrganizationId() organizationId: string,
    @DemoUser() user: DemoUserType,
    @Param("pipelineId") pipelineId: string,
    @Param("connectionId") connectionId: string,
    @Body() dto: UpdatePipelineChannelDto,
  ) {
    return this.service.update(organizationId, pipelineId, connectionId, dto, user.id);
  }

  @Patch(":connectionId/pause")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Pause a pipeline channel route" })
  pause(
    @OrganizationId() organizationId: string,
    @DemoUser() user: DemoUserType,
    @Param("pipelineId") pipelineId: string,
    @Param("connectionId") connectionId: string,
  ) {
    return this.service.pause(organizationId, pipelineId, connectionId, user.id);
  }

  @Patch(":connectionId/resume")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Resume a pipeline channel route" })
  @ApiConflictResponse({ description: "The integration account is inactive" })
  resume(
    @OrganizationId() organizationId: string,
    @DemoUser() user: DemoUserType,
    @Param("pipelineId") pipelineId: string,
    @Param("connectionId") connectionId: string,
  ) {
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
  test(
    @OrganizationId() organizationId: string,
    @DemoUser() user: DemoUserType,
    @Param("pipelineId") pipelineId: string,
    @Param("connectionId") connectionId: string,
  ) {
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
  simulate(
    @OrganizationId() organizationId: string,
    @DemoUser() user: DemoUserType,
    @Param("pipelineId") pipelineId: string,
    @Param("connectionId") connectionId: string,
    @Body() dto: SimulatePipelineLeadDto,
  ) {
    return this.service.simulate(organizationId, pipelineId, connectionId, dto, user.id);
  }

  @Delete(":connectionId")
  @ApiOperation({ summary: "Soft-disconnect an account from a pipeline" })
  disconnect(
    @OrganizationId() organizationId: string,
    @DemoUser() user: DemoUserType,
    @Param("pipelineId") pipelineId: string,
    @Param("connectionId") connectionId: string,
  ) {
    return this.service.disconnect(organizationId, pipelineId, connectionId, user.id);
  }
}
