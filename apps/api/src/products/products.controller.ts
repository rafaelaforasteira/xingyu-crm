import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiHeader } from "@nestjs/swagger";
import { ProductsService } from "./products.service";
import { OrganizationId } from "../common/decorators/organization.decorator";
import { CreateProductDto, UpdateProductDto, QueryProductsDto } from "./dto/product.dto";

@ApiTags("products")
@ApiHeader({ name: "X-Demo-User-Id", required: false })
@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: "List products" })
  findAll(@OrganizationId() orgId: string, @Query() query: QueryProductsDto) {
    return this.productsService.findAll(orgId, query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get product" })
  findOne(@OrganizationId() orgId: string, @Param("id") id: string) {
    return this.productsService.findOne(orgId, id);
  }

  @Post()
  @ApiOperation({ summary: "Create product" })
  create(@OrganizationId() orgId: string, @Body() dto: CreateProductDto) {
    return this.productsService.create(orgId, dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update product" })
  update(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(orgId, id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Soft-delete product" })
  remove(@OrganizationId() orgId: string, @Param("id") id: string) {
    return this.productsService.remove(orgId, id);
  }
}
