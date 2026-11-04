import { BadRequestException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { ensureUploadDir, uploadMaxBytes, validateAndSaveUpload } from "./upload.util";

describe("upload.util", () => {
  const previousDir = process.env.UPLOAD_DIR;
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "xingyu-upload-"));
    process.env.UPLOAD_DIR = tempDir;
  });

  afterEach(() => {
    if (previousDir === undefined) delete process.env.UPLOAD_DIR;
    else process.env.UPLOAD_DIR = previousDir;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("creates the upload directory", () => {
    const dir = ensureUploadDir();
    expect(fs.existsSync(dir)).toBe(true);
  });

  it("saves an allowed image with a random name", () => {
    const saved = validateAndSaveUpload({
      fieldname: "files",
      originalname: "../../evil.png",
      encoding: "7bit",
      mimetype: "image/png",
      size: 68,
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        "base64",
      ),
      destination: "",
      filename: "",
      path: "",
      stream: undefined as never,
    });

    expect(saved.kind).toBe("image");
    expect(saved.originalName).toBe("evil.png");
    expect(saved.url).toMatch(/^\/api\/uploads\/files\/.+\.png$/);
    expect(fs.existsSync(path.join(tempDir, saved.storedName))).toBe(true);
  });

  it("rejects disallowed mime types", () => {
    expect(() =>
      validateAndSaveUpload({
        fieldname: "files",
        originalname: "payload.exe",
        encoding: "7bit",
        mimetype: "application/x-msdownload",
        size: 10,
        buffer: Buffer.from("x"),
        destination: "",
        filename: "",
        path: "",
        stream: undefined as never,
      }),
    ).toThrow(BadRequestException);
  });

  it("rejects oversized files", () => {
    const max = uploadMaxBytes();
    expect(() =>
      validateAndSaveUpload({
        fieldname: "files",
        originalname: "big.png",
        encoding: "7bit",
        mimetype: "image/png",
        size: max + 1,
        buffer: Buffer.alloc(16),
        destination: "",
        filename: "",
        path: "",
        stream: undefined as never,
      }),
    ).toThrow(BadRequestException);
  });

  it.each([
    ["image/png", "payload.png", Buffer.from("<svg onload=alert(1) />")],
    ["text/html", "payload.pdf", Buffer.from("<script>alert(1)</script>")],
    ["image/svg+xml", "payload.png", Buffer.from("<svg />")],
    ["application/pdf", "payload.exe", Buffer.from("%PDF-1.7")],
  ])(
    "rejects spoofed or active content (%s, %s) without writing",
    (mimetype, originalname, buffer) => {
      expect(() =>
        validateAndSaveUpload({
          mimetype,
          originalname,
          buffer,
          size: buffer.length,
        } as Express.Multer.File),
      ).toThrow(BadRequestException);
      expect(fs.readdirSync(tempDir)).toHaveLength(0);
    },
  );

  it("checks actual bytes even when the declared size is small", () => {
    const previous = process.env.UPLOAD_MAX_SIZE_MB;
    process.env.UPLOAD_MAX_SIZE_MB = "0.001";
    try {
      expect(() =>
        validateAndSaveUpload({
          originalname: "file.txt",
          mimetype: "text/plain",
          size: 1,
          buffer: Buffer.alloc(2048, 65),
        } as Express.Multer.File),
      ).toThrow(BadRequestException);
    } finally {
      if (previous === undefined) delete process.env.UPLOAD_MAX_SIZE_MB;
      else process.env.UPLOAD_MAX_SIZE_MB = previous;
    }
  });
});
