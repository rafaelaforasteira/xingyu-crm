import { Injectable, NotFoundException } from "@nestjs/common";
import { canAccessCrmApi } from "@xingyu/config";
import { can } from "../../auth/access-policy";
import type { AuthenticatedUser } from "../../auth/types";
import { PrismaService } from "../../prisma/prisma.service";
import { PipelineAccessService } from "../../pipelines/pipeline-access.service";
import { resolveUploadDir } from "./upload.util";
import * as fs from "node:fs/promises";
import * as path from "node:path";

@Injectable()
export class UploadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: PipelineAccessService,
  ) {}

  async resolve(user: AuthenticatedUser, name: string) {
    // Existing demo media use a nested path; reject traversal, hidden files and Windows ADS.
    if (
      !name ||
      !/^[a-zA-Z0-9_/-]+(?:\.[a-zA-Z0-9]+)$/.test(name) ||
      name.split("/").some((part) => !part || part.startsWith("."))
    )
      throw new NotFoundException();
    const url = `/api/uploads/files/${name}`;
    const organizationId = user.organizationId;
    let mimeType: string | null = null;
    let originalName = path.basename(name);
    const avatar = await this.prisma.user.findFirst({
      where: { organizationId, avatarUrl: url, deletedAt: null },
      select: { id: true },
    });
    if (avatar) {
      // Avatars are visible to authenticated colleagues, never across organizations.
      mimeType =
        (
          {
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".webp": "image/webp",
          } as Record<string, string>
        )[path.extname(name)] ?? null;
      if (!mimeType) throw new NotFoundException();
    } else {
      if (!canAccessCrmApi(user.role, "GET", "/conversations")) throw new NotFoundException();
      const attachment = await this.prisma.messageAttachment.findFirst({
        where: {
          url,
          message: { deletedAt: null, conversation: { organizationId, deletedAt: null } },
        },
        select: { mimeType: true, fileName: true, message: { select: { conversationId: true } } },
      });
      if (attachment) {
        await this.access.assertConversationAccess(user, attachment.message.conversationId);
        mimeType = attachment.mimeType;
        originalName = attachment.fileName;
      } else {
        const taskFile = await this.prisma.taskCommentAttachment.findFirst({
          where: {
            url,
            organizationId,
            comment: { deletedAt: null, task: { organizationId, deletedAt: null } },
          },
          select: { mimeType: true, fileName: true, comment: { select: { taskId: true } } },
        });
        if (taskFile) {
          await this.access.assertTaskAccess(user, taskFile.comment.taskId);
          mimeType = taskFile.mimeType;
          originalName = taskFile.fileName;
        } else {
          const payment = can(user.role, "finance.sensitive")
            ? await this.prisma.payment.findFirst({
                where: {
                  receiptUrl: url,
                  deletedAt: null,
                  order: { organizationId, deletedAt: null },
                },
                select: { orderId: true },
              })
            : null;
          if (payment) {
            await this.access.assertOrderAccess(user, payment.orderId);
          } else {
            const leadFile = await this.prisma.leadFile.findFirst({
              where: { url, organizationId, deal: { organizationId, deletedAt: null } },
              select: { dealId: true, fileName: true, mimeType: true },
            });
            if (!leadFile) throw new NotFoundException();
            await this.access.assertDealAccess(user, leadFile.dealId);
            mimeType = leadFile.mimeType;
            originalName = leadFile.fileName;
          }
        }
      }
    }
    const root = await fs.realpath(resolveUploadDir()).catch(() => {
      throw new NotFoundException();
    });
    const file = await fs.realpath(path.join(root, name)).catch(() => {
      throw new NotFoundException();
    });
    const relative = path.relative(root, file);
    if (relative.startsWith("..") || path.isAbsolute(relative) || !(await fs.stat(file)).isFile())
      throw new NotFoundException();
    // Documents and legacy unknown MIME are always attachments. Never sniff active content.
    const inline =
      /^(image\/(png|jpeg|gif|webp|bmp)|audio\/(mpeg|mp4|webm|ogg|wav|aac)|video\/(mp4|webm|quicktime))$/.test(
        mimeType ?? "",
      );
    return {
      file,
      mimeType: inline ? mimeType! : "application/octet-stream",
      inline,
      originalName: path.basename(originalName).replace(/[\r\n"\\]/g, "_"),
    };
  }
}
