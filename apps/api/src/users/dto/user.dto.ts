import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AuthRole, UserStatus } from "@xingyu/database";
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { PaginationQueryDto } from "../../common/dto/pagination.dto";

export class QueryUsersDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: UserStatus }) @IsOptional() @IsEnum(UserStatus) status?: UserStatus;
}

export class InviteUserDto {
  @ApiProperty() @IsString() @MaxLength(120) name!: string;
  @ApiProperty() @IsEmail() @MaxLength(320) email!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @ApiProperty({ enum: AuthRole }) @IsEnum(AuthRole) role!: AuthRole;
  @ApiPropertyOptional() @IsOptional() @IsString() teamId?: string;
}

export class UpdateManagedUserDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) title?: string;
  @ApiPropertyOptional({ enum: AuthRole }) @IsOptional() @IsEnum(AuthRole) role?: AuthRole;
  @ApiPropertyOptional() @IsOptional() @IsString() teamId?: string | null;
}

export class AcceptInviteDto {
  @ApiProperty() @IsString() @MinLength(12) @MaxLength(128) password!: string;
  @ApiProperty() @IsString() @MinLength(12) @MaxLength(128) confirmPassword!: string;
}
