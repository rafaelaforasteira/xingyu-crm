import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { PaginationQueryDto } from "../../common/dto/pagination.dto";

export class CreateTeamDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;
}

export class UpdateTeamDto extends PartialType(CreateTeamDto) {}

export class TeamMembersDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  userIds!: string[];
}

export class ArchiveTeamDto {
  @ApiPropertyOptional({ enum: ["detach", "move"] })
  @IsOptional()
  @IsIn(["detach", "move"])
  memberAction?: "detach" | "move";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetTeamId?: string;
}

export class CreateTagDto {
  @ApiProperty()
  @IsString()
  @MaxLength(80)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;
}

export class UpdateTagDto extends PartialType(CreateTagDto) {}

export class CreateCustomFieldDto {
  @ApiProperty()
  @IsString()
  entity!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  key!: string;

  @ApiProperty()
  @IsString()
  fieldType!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  options?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  required?: boolean;
}

export class UpdateCustomFieldDto extends PartialType(CreateCustomFieldDto) {}

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  teamId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class QuerySettingsDto extends PaginationQueryDto {}

export class UpdateProfileDto {
  @IsOptional() @IsString() @MaxLength(160) name?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(120) title?: string;
  @IsOptional() @IsIn(["pt-BR", "en", "zh-CN", "zh-HK"]) locale?: string;
  @IsOptional() @IsIn(["America/Sao_Paulo", "America/Manaus", "UTC", "Asia/Shanghai", "Asia/Hong_Kong"]) timezone?: string;
}

export class UpdateOrganizationDto {
  @IsOptional() @IsString() @MaxLength(160) name?: string;
  @IsOptional() @IsIn(["America/Sao_Paulo", "America/Manaus", "UTC", "Asia/Shanghai", "Asia/Hong_Kong"]) timezone?: string;
  @IsOptional() @IsIn(["BRL", "USD", "CNY"]) currency?: string;
}
