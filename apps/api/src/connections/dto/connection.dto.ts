import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { PaginationQueryDto } from "../../common/dto/pagination.dto";
import { CONNECTION_STATUS_GROUPS, type ConnectionStatusGroup } from "../connection-status";

export class CreateConnectionDto {
  @ApiProperty({ enum: ["WHATSAPP"] })
  @IsIn(["WHATSAPP"])
  type!: "WHATSAPP";

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ example: "fake" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  provider?: string;
}

class ConnectionNameDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;
}

export class UpdateConnectionDto extends PartialType(ConnectionNameDto) {}

export class ListConnectionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: CONNECTION_STATUS_GROUPS, default: "ALL" })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.toUpperCase() : value))
  @IsIn(CONNECTION_STATUS_GROUPS)
  status?: ConnectionStatusGroup = "ALL";
}

export class UpdateConnectionRoutingDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  enabledPipelineIds!: string[];

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  defaultPipelineId!: string;
}

export class UpdateConnectionAccessDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  teamIds!: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  userIds?: string[];
}
