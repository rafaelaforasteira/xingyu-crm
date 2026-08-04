import { BadRequestException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  ensureUploadDir,
  uploadMaxBytes,
  validateAndSaveUpload,
} from "./upload.util";

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
      size: 12,
      buffer: Buffer.from("fake-image"),
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
});
