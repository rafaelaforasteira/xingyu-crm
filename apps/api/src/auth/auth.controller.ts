import {
  Body,
  Controller,
  Post,
  Get,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { Public } from "./decorators/public.decorator";
import { CurrentUser } from "./decorators/current-user.decorator";
import type { AuthenticatedUser } from "./types";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: "Autenticar com e-mail e senha" })
  login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.login(dto, req, res);
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: "Renovar access token com refresh token" })
  refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.refresh(req, res);
  }

  @Public()
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Encerrar sessão atual" })
  logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.logout(req, res);
  }

  @Get("me")
  @ApiOperation({ summary: "Usuário autenticado atual" })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.me(user.id);
  }
}
