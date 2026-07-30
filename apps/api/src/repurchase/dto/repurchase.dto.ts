import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsInt, Min } from "class-validator";
import { Type } from "class-transformer";
import { PaginationQueryDto } from "../../common/dto/pagination.dto";

export class QueryRepurchaseDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "Days since last purchase" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  daysSincePurchase?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ownerId?: string;
}

export class QueryReactivationDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "Days without activity" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  inactiveDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ownerId?: string;
}
