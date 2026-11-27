import { BadRequestException } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { validateAndSaveUpload } from "../common/upload/upload.util";

jest.mock("../common/upload/upload.util", () => ({
  validateAndSaveUpload: jest.fn(() => ({
    url: "/api/uploads/files/receipt.pdf",
    storedName: "receipt.pdf",
    originalName: "receipt.pdf",
    mimeType: "application/pdf",
    fileSize: 10,
    kind: "document",
  })),
}));

describe("OrdersService payment receipt", () => {
  const payment = { id: "pay-1", orderId: "ord-1", receiptUrl: null };
  const prisma = {
    payment: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
  const service = new OrdersService(prisma as never);
  const file = {
    mimetype: "application/pdf",
    originalname: "receipt.pdf",
    size: 10,
    buffer: Buffer.from("receipt"),
  } as Express.Multer.File;

  beforeEach(() => jest.clearAllMocks());

  it("persists a validated PDF receipt on the payment", async () => {
    prisma.payment.findFirst.mockResolvedValue(payment);
    prisma.payment.update.mockResolvedValue({
      ...payment,
      receiptUrl: "/api/uploads/files/receipt.pdf",
    });

    const result = await service.uploadPaymentReceipt("org-1", "ord-1", "pay-1", file);

    expect(validateAndSaveUpload).toHaveBeenCalledWith(file);
    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: "pay-1" },
      data: { receiptUrl: "/api/uploads/files/receipt.pdf" },
    });
    expect(result.receiptUrl).toBe("/api/uploads/files/receipt.pdf");
  });

  it("does not overwrite an automatic receipt", async () => {
    prisma.payment.findFirst.mockResolvedValue({
      ...payment,
      receiptUrl: "https://gateway/receipt",
    });

    await expect(
      service.uploadPaymentReceipt("org-1", "ord-1", "pay-1", file),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(validateAndSaveUpload).not.toHaveBeenCalled();
  });

  it("rejects unsupported file types", async () => {
    prisma.payment.findFirst.mockResolvedValue(payment);

    await expect(
      service.uploadPaymentReceipt("org-1", "ord-1", "pay-1", { ...file, mimetype: "text/plain" }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(validateAndSaveUpload).not.toHaveBeenCalled();
  });
});
