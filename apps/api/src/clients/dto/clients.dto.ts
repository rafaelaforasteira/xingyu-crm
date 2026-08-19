import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class QueryClientsDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 20;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsIn(["LEAD", "CUSTOMER", "RECURRING"]) status?: "LEAD" | "CUSTOMER" | "RECURRING";
  @IsOptional() @IsIn(["PERSON", "COMPANY"]) type?: "PERSON" | "COMPANY";
  @IsOptional() @IsString() ownerId?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsIn(["never", "0-30", "31-60", "61-90", "90+"]) recency?: string;
  @IsOptional() @IsIn(["name", "lifetimeValue", "orderCount", "lastPurchaseAt", "createdAt"]) sortBy = "name";
  @IsOptional() @IsIn(["asc", "desc"]) sortOrder: "asc" | "desc" = "asc";
}
