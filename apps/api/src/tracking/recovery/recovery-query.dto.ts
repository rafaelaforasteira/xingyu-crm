import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from "class-validator";
import { RECOVERY_CHANNELS, VALUE_BANDS } from "./recovery.config";
export class RecoveryQueryDto {
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) startDate?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) endDate?: string;
  @IsOptional() @IsIn(["OPEN", "RECOVERED", "EXPIRED"]) status?: "OPEN" | "RECOVERED" | "EXPIRED";
  @IsOptional() @IsIn(["AUTOMATIC", "CONSULTANT", "MIXED", "UNKNOWN"]) method?:
    "AUTOMATIC" | "CONSULTANT" | "MIXED" | "UNKNOWN";
  @IsOptional() @IsIn(["NEW", "EXISTING", "UNKNOWN"]) customerType?: "NEW" | "EXISTING" | "UNKNOWN";
  @IsOptional() @IsIn(VALUE_BANDS.map((b) => b.key)) valueBand?: string;
  @IsOptional() @IsIn(RECOVERY_CHANNELS) channel?: (typeof RECOVERY_CHANNELS)[number];
  @IsOptional() @Matches(/^[A-Z]{3}$/) currency?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) pageSize?: number;
  @IsOptional() @IsIn(["priority", "value", "oldest", "deadline"]) sort?:
    "priority" | "value" | "oldest" | "deadline";
  @IsOptional() @IsString() @MaxLength(120) search?: string;
}
