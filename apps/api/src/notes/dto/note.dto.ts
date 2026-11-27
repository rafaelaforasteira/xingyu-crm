import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { Transform } from "class-transformer";
import { PaginationQueryDto } from "../../common/dto/pagination.dto";

export class CreateNoteDto {
  @ApiProperty({ description: "Note content" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dealId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  orderId?: string;
}

export class UpdateNoteDto extends PartialType(CreateNoteDto) {}

export class QueryNotesDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dealId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  orderId?: string;
}
