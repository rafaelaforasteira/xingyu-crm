import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  IsBoolean,
  MaxLength,
} from "class-validator";
import { PaginationQueryDto } from "../../common/dto/pagination.dto";

export class CreateContactDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  whatsapp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  teamId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateContactDto extends PartialType(CreateContactDto) {}

export class QueryContactsDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  teamId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tagId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}

export class BulkTagsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  contactIds!: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  tagIds!: string[];

  @ApiPropertyOptional({ enum: ["add", "remove", "set"] })
  @IsOptional()
  @IsString()
  mode?: "add" | "remove" | "set" = "add";
}

export class BulkOwnerDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  contactIds!: string[];

  @ApiProperty()
  @IsString()
  ownerId!: string;
}

export class BulkArchiveDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  contactIds!: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  archived?: boolean = true;
}

export class MergeContactsDto {
  @ApiProperty({ description: "Contact that remains after merge" })
  @IsString()
  primaryId!: string;

  @ApiProperty({ description: "Contact to merge into primary" })
  @IsString()
  secondaryId!: string;
}

export class DuplicateCheckDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  whatsapp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;
}
