import { IsString, MaxLength, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(1, { message: "Informe a senha atual." })
  @MaxLength(128)
  currentPassword!: string;

  @ApiProperty({ minLength: 12, maxLength: 128 })
  @IsString()
  @MinLength(12, { message: "A nova senha deve ter pelo menos 12 caracteres." })
  @MaxLength(128)
  newPassword!: string;

  @ApiProperty({ minLength: 12, maxLength: 128 })
  @IsString()
  @MinLength(12, { message: "Confirme a nova senha." })
  @MaxLength(128)
  confirmPassword!: string;
}
