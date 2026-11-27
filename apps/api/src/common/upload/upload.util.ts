import { BadRequestException } from "@nestjs/common";
import { MAX_UPLOAD_MB } from "@xingyu/config";
import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

export type AttachmentKind = "image" | "video" | "audio" | "document";

export type SavedUpload = {
  storedName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  kind: AttachmentKind;
  url: string;
};

export function uploadMaxBytes(): number {
  const fromEnv = Number(process.env.UPLOAD_MAX_SIZE_MB);
  const mb = Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : MAX_UPLOAD_MB;
  return mb * 1024 * 1024;
}

export function uploadLimits(files: number, fileSize = uploadMaxBytes()) {
  return { fileSize, files, fields: 20, parts: files + 20, fieldSize: 64 * 1024 };
}

export function resolveUploadDir(): string {
  const configured = process.env.UPLOAD_DIR?.trim() || "./uploads";
  return path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured);
}

export function ensureUploadDir(): string {
  const dir = resolveUploadDir();
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  return dir;
}

type UploadType = { mime: string; kind: AttachmentKind; matches: (data: Buffer) => boolean };
const starts = (data: Buffer, bytes: number[]) =>
  data.subarray(0, bytes.length).equals(Buffer.from(bytes));
const ascii = (data: Buffer, text: string, offset = 0) =>
  data.subarray(offset, offset + text.length).toString("ascii") === text;
const text = (data: Buffer) => {
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(data);
  } catch {
    return false;
  }
  return !data.some((byte) => byte === 0 || (byte < 32 && ![9, 10, 13].includes(byte)));
};
const zip = (data: Buffer) => starts(data, [0x50, 0x4b, 3, 4]);
const compound = (data: Buffer) => starts(data, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const mp4 = (data: Buffer) => ascii(data, "ftyp", 4);
const ebml = (data: Buffer) => starts(data, [0x1a, 0x45, 0xdf, 0xa3]);
const types: Record<string, UploadType> = {
  ".png": {
    mime: "image/png",
    kind: "image",
    matches: (d) => starts(d, [137, 80, 78, 71, 13, 10, 26, 10]),
  },
  ".jpg": { mime: "image/jpeg", kind: "image", matches: (d) => starts(d, [255, 216, 255]) },
  ".jpeg": { mime: "image/jpeg", kind: "image", matches: (d) => starts(d, [255, 216, 255]) },
  ".gif": {
    mime: "image/gif",
    kind: "image",
    matches: (d) => ascii(d, "GIF87a") || ascii(d, "GIF89a"),
  },
  ".webp": {
    mime: "image/webp",
    kind: "image",
    matches: (d) => ascii(d, "RIFF") && ascii(d, "WEBP", 8),
  },
  ".bmp": { mime: "image/bmp", kind: "image", matches: (d) => ascii(d, "BM") },
  ".pdf": { mime: "application/pdf", kind: "document", matches: (d) => ascii(d, "%PDF-") },
  ".txt": { mime: "text/plain", kind: "document", matches: text },
  ".csv": { mime: "text/csv", kind: "document", matches: text },
  ".rtf": {
    mime: "application/rtf",
    kind: "document",
    matches: (d) => ascii(d, "{" + String.fromCharCode(92) + "rtf"),
  },
  ".doc": { mime: "application/msword", kind: "document", matches: compound },
  ".xls": { mime: "application/vnd.ms-excel", kind: "document", matches: compound },
  ".docx": {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    kind: "document",
    matches: zip,
  },
  ".xlsx": {
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    kind: "document",
    matches: zip,
  },
  ".mp4": { mime: "video/mp4", kind: "video", matches: mp4 },
  ".mov": { mime: "video/quicktime", kind: "video", matches: (d) => mp4(d) || ascii(d, "moov", 4) },
  ".m4v": { mime: "video/mp4", kind: "video", matches: mp4 },
  ".webm": { mime: "video/webm", kind: "video", matches: ebml },
  ".ogg": { mime: "audio/ogg", kind: "audio", matches: (d) => ascii(d, "OggS") },
  ".wav": {
    mime: "audio/wav",
    kind: "audio",
    matches: (d) => ascii(d, "RIFF") && ascii(d, "WAVE", 8),
  },
  ".mp3": {
    mime: "audio/mpeg",
    kind: "audio",
    matches: (d) => ascii(d, "ID3") || (d[0] === 255 && (d[1] & 0xe0) === 0xe0),
  },
  ".m4a": { mime: "audio/mp4", kind: "audio", matches: mp4 },
  ".aac": {
    mime: "audio/aac",
    kind: "audio",
    matches: (d) => d[0] === 255 && (d[1] & 0xf6) === 0xf0,
  },
};

export function validateUpload(
  file: Express.Multer.File,
): Omit<SavedUpload, "storedName" | "url"> & { extension: string } {
  if (!Buffer.isBuffer(file?.buffer) || file.buffer.length === 0)
    throw new BadRequestException("Arquivo inválido.");
  if (Math.max(file.size || 0, file.buffer.length) > uploadMaxBytes())
    throw new BadRequestException("Arquivo excede o limite permitido.");
  const extension = path.extname(file.originalname || "").toLowerCase();
  let type = types[extension];
  let declared = (file.mimetype || "").toLowerCase();
  if (declared === "image/jpg") declared = "image/jpeg";
  if (declared === "text/rtf") declared = "application/rtf";
  if (declared === "audio/x-wav") declared = "audio/wav";
  if (extension === ".webm" && declared === "audio/webm")
    type = { mime: "audio/webm", kind: "audio", matches: ebml };
  if (!type || type.mime !== declared || !type.matches(file.buffer))
    throw new BadRequestException("Tipo ou conteúdo de arquivo não permitido.");
  const originalName = path
    .basename((file.originalname || "arquivo").replace(/\\/g, "/"))
    .replace(/[^\w.\- ()[\]]+/g, "_")
    .slice(0, 180);
  return {
    originalName,
    mimeType: type.mime,
    fileSize: file.buffer.length,
    kind: type.kind,
    extension,
  };
}

export function validateAndSaveUpload(file: Express.Multer.File): SavedUpload {
  const { extension, ...metadata } = validateUpload(file);
  const storedName = randomUUID() + extension;
  const dir = ensureUploadDir();
  fs.writeFileSync(path.join(dir, storedName), file.buffer, { flag: "wx", mode: 0o600 });
  return { ...metadata, storedName, url: "/api/uploads/files/" + storedName };
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
