import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiHeader } from "@nestjs/swagger";
import { MarketingService } from "./marketing.service";
import { OrganizationId } from "../common/decorators/organization.decorator";
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  QueryCampaignsDto,
  AttributionQueryDto,
} from "./dto/marketing.dto";

@ApiTags("marketing")
@ApiHeader({ name: "X-Demo-User-Id", required: false })
@Controller("marketing")
export class MarketingController {
  constructor(private readonly marketingService: MarketingService) {}

  @Get("campaigns")
  @ApiOperation({ summary: "List campaigns" })
  findAll(@OrganizationId() orgId: string, @Query() query: QueryCampaignsDto) {
    return this.marketingService.findAll(orgId, query);
  }

  @Get("campaigns/:id")
  findOne(@OrganizationId() orgId: string, @Param("id") id: string) {
    return this.marketingService.findOne(orgId, id);
  }

  @Post("campaigns")
  create(@OrganizationId() orgId: string, @Body() dto: CreateCampaignDto) {
    return this.marketingService.create(orgId, dto);
  }

  @Patch("campaigns/:id")
  update(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.marketingService.update(orgId, id, dto);
  }

  @Delete("campaigns/:id")
  remove(@OrganizationId() orgId: string, @Param("id") id: string) {
    return this.marketingService.remove(orgId, id);
  }

  @Get("attribution")
  @ApiOperation({ summary: "Attribution report by source/campaign" })
  attribution(@OrganizationId() orgId: string, @Query() query: AttributionQueryDto) {
    return this.marketingService.attribution(orgId, query);
  }
}
