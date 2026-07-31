import { IsEmail, IsString, MinLength } from "class-validator";
import { Transform } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {
  @ApiProperty({ example: "admin@xingyu.local" })
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: "Informe um e-mail válido." })
  email!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(1, { message: "Informe a senha." })
  password!: string;
}
