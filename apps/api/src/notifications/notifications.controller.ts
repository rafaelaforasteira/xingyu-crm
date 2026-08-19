import { Controller, Get, Patch, Param, Query } from "@nestjs/common";
import { ApiTags, ApiHeader, ApiCookieAuth, ApiOperation } from "@nestjs/swagger";
import { NotificationsService } from "./notifications.service";
import { OrganizationId } from "../common/decorators/organization.decorator";
import { DemoUser, type DemoUser as DemoUserType } from "../common/decorators/demo-user.decorator";
import { QueryNotificationsDto } from "./dto/notification.dto";

@ApiTags("notifications")
@ApiCookieAuth("xingyu_access_token")
@ApiHeader({ name: "X-Demo-User-Id", required: false, description: "Apenas DEMO_MODE local; não autentica." })
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "List notifications" })
  findAll(
    @OrganizationId() organizationId: string,
    @DemoUser() user: DemoUserType,
    @Query() query: QueryNotificationsDto,
  ) {
    return this.service.findAll(organizationId, query, user.id);
  }

  @Patch(":id/read")
  @ApiOperation({ summary: "Mark notification as read" })
  markRead(@OrganizationId() organizationId: string, @Param("id") id: string) {
    return this.service.markRead(organizationId, id);
  }

  @Patch("read-all")
  @ApiOperation({ summary: "Mark all notifications as read" })
  markAllRead(@OrganizationId() organizationId: string, @DemoUser() user: DemoUserType) {
    return this.service.markAllRead(organizationId, user.id);
  }

  @Patch(":id/archive")
  @ApiOperation({ summary: "Archive notification" })
  remove(@OrganizationId() organizationId: string, @Param("id") id: string) {
    return this.service.remove(organizationId, id);
  }
}
