import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MinLength } from "class-validator";

export class GlobalSearchDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  q!: string;

  @ApiPropertyOptional({ description: "Limit per entity type" })
  @IsOptional()
  @IsString()
  limit?: string;
}
