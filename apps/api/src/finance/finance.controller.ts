import { Controller, Get, Query } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags } from "@nestjs/swagger";
import { OrganizationId } from "../common/decorators/organization.decorator";
import { FinanceService } from "./finance.service";
import { Permissions } from "../auth/decorators/permissions.decorator";

@ApiTags("finance")
@ApiHeader({ name: "X-Demo-User-Id", required: false })
@Controller("finance")
@Permissions("finance.view")
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get("workspace")
  @ApiOperation({ summary: "Financial, accounting and commission workspace" })
  workspace(
    @OrganizationId() organizationId: string,
    @Query("period") period?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.finance.workspace(organizationId, { period, from, to });
  }
}
