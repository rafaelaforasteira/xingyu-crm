import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { AuthRole } from "@xingyu/database";
import { OrganizationId } from "../../common/decorators/organization.decorator";
import { RecoveryService } from "./recovery.service";
import { RecoveryQueryDto } from "./recovery-query.dto";
@ApiTags("tracking-recovery")
@Controller("tracking/recovery")
@Roles(AuthRole.ADMIN)
export class RecoveryController {
  constructor(private readonly recovery: RecoveryService) {}
  @Get("overview") overview(@OrganizationId() org: string, @Query() query: RecoveryQueryDto) {
    return this.recovery.overview(org, query);
  }
  @Get("opportunities") opportunities(
    @OrganizationId() org: string,
    @Query() query: RecoveryQueryDto,
  ) {
    return this.recovery.opportunities(org, query);
  }
  @Get("cases/:id") audit(@OrganizationId() org: string, @Param("id") id: string) {
    return this.recovery.caseAudit(org, id);
  }
}
