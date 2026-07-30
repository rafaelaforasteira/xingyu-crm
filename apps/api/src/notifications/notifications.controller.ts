import { Controller, Get, Patch, Param, Query } from "@nestjs/common";
import { ApiTags, ApiHeader } from "@nestjs/swagger";
import { NotificationsService } from "./notifications.service";
import { OrganizationId } from "../common/decorators/organization.decorator";
import { DemoUser, type DemoUser as DemoUserType } from "../common/decorators/demo-user.decorator";
import { QueryNotificationsDto } from "./dto/notification.dto";

@ApiTags("notifications")
@ApiHeader({ name: "X-Demo-User-Id", required: false })
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  findAll(
    @OrganizationId() organizationId: string,
    @DemoUser() user: DemoUserType,
    @Query() query: QueryNotificationsDto,
  ) {
    return this.service.findAll(organizationId, query, user.id);
  }

  @Patch(":id/read")
  markRead(@OrganizationId() organizationId: string, @Param("id") id: string) {
    return this.service.markRead(organizationId, id);
  }

  @Patch("read-all")
  markAllRead(@OrganizationId() organizationId: string, @DemoUser() user: DemoUserType) {
    return this.service.markAllRead(organizationId, user.id);
  }

  @Patch(":id/archive")
  remove(@OrganizationId() organizationId: string, @Param("id") id: string) {
    return this.service.remove(organizationId, id);
  }
}
