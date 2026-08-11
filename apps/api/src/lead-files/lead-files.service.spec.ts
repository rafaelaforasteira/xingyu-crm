import { BadRequestException } from "@nestjs/common";
import { isEligibleLeadFile, LeadFilesService } from "./lead-files.service";

describe("lead file eligibility", () => {
  it.each([
    ["image", "image/jpeg"],
    ["video", "video/mp4"],
    ["audio", "audio/ogg"],
    ["voice", "audio/ogg"],
    ["document", "application/pdf"],
  ])("accepts %s with matching MIME", (kind, mime) => {
    expect(isEligibleLeadFile(kind, mime)).toBe(true);
  });

  it.each([
    ["sticker", "image/webp"],
    ["text", "text/plain"],
    ["unsupported", null],
    ["image", "application/javascript"],
  ])("rejects %s with unsafe or excluded MIME", (kind, mime) => {
    expect(isEligibleLeadFile(kind, mime)).toBe(false);
  });
});

describe("LeadFilesService", () => {
  const attachment = {
    id: "attachment-1",
    messageId: "message-1",
    fileName: "comprovante.pdf",
    mimeType: "application/pdf",
    fileSize: 2048,
    url: "/api/uploads/files/comprovante.pdf",
    kind: "document",
    createdAt: new Date(),
    message: {
      id: "message-1",
      conversationId: "conversation-1",
      direction: "INBOUND",
      sentAt: new Date(),
    },
  };

  function setup(foundAttachment: typeof attachment | null = attachment) {
    const prisma = {
      deal: { findFirst: jest.fn().mockResolvedValue({ id: "deal-1" }) },
      messageAttachment: { findFirst: jest.fn().mockResolvedValue(foundAttachment) },
      leadFile: {
        upsert: jest.fn().mockResolvedValue({ id: "lead-file-1" }),
        findFirst: jest.fn().mockResolvedValue({ id: "lead-file-1" }),
        delete: jest.fn().mockResolvedValue({ id: "lead-file-1" }),
      },
      message: { delete: jest.fn() },
    };
    return { prisma, service: new LeadFilesService(prisma as never) };
  }

  it("creates an idempotent reference from persisted attachment IDs", async () => {
    const { prisma, service } = setup();
    await service.save(
      "org-1",
      "deal-1",
      { messageId: "message-1", attachmentId: "attachment-1" },
      "user-1",
    );
    expect(prisma.leadFile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { dealId_attachmentId: { dealId: "deal-1", attachmentId: "attachment-1" } },
        create: expect.objectContaining({
          organizationId: "org-1",
          dealId: "deal-1",
          messageId: "message-1",
          savedById: "user-1",
          url: attachment.url,
        }),
      }),
    );
  });

  it("rejects an attachment outside the organization/deal relation", async () => {
    const { service } = setup(null);
    await expect(
      service.save(
        "org-1",
        "deal-1",
        { messageId: "foreign-message", attachmentId: "foreign-attachment" },
        "user-1",
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("removes only the curated reference", async () => {
    const { prisma, service } = setup();
    await expect(service.remove("org-1", "deal-1", "lead-file-1")).resolves.toEqual({
      removed: true,
    });
    expect(prisma.leadFile.delete).toHaveBeenCalledWith({ where: { id: "lead-file-1" } });
    expect(prisma.message.delete).not.toHaveBeenCalled();
  });
});
