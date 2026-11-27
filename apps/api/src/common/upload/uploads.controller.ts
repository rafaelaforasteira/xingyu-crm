import { Controller, Get, Param, Res } from "@nestjs/common";
import type { Response } from "express";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../../auth/types";
import { UploadsService } from "./uploads.service";

@Controller("uploads/files")
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Get("*")
  async download(
    @CurrentUser() user: AuthenticatedUser,
    @Param("0") name: string,
    @Res() response: Response,
  ) {
    const file = await this.uploads.resolve(user, name);
    response.set({
      "Content-Type": file.mimeType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'",
      "Content-Disposition": `${file.inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
    });
    response.sendFile(file.file);
  }
}
