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

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"]);
const VIDEO_EXT = new Set([".mp4", ".webm", ".mov", ".m4v"]);
const AUDIO_EXT = new Set([".webm", ".ogg", ".mp3", ".wav", ".m4a", ".aac"]);
const DOC_EXT = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".csv",
  ".txt",
  ".rtf",
]);

const IMAGE_MIME = /^image\//i;
const VIDEO_MIME = /^video\//i;
const AUDIO_MIME = /^audio\//i;
const DOC_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
  "application/rtf",
  "text/rtf",
]);

export function uploadMaxBytes(): number {
  const fromEnv = Number(process.env.UPLOAD_MAX_SIZE_MB);
  const mb = Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : MAX_UPLOAD_MB;
  return mb * 1024 * 1024;
}

export function resolveUploadDir(): string {
  const configured = process.env.UPLOAD_DIR?.trim() || "./uploads";
  return path.isAbsolute(configured)
    ? configured
    : path.resolve(process.cwd(), configured);
}

export function ensureUploadDir(): string {
  const dir = resolveUploadDir();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function sanitizeExtension(originalName: string): string {
  const ext = path.extname(originalName || "").toLowerCase();
  if (!ext || ext.includes("/") || ext.includes("\\") || ext.length > 10) {
    return "";
  }
  return ext;
}

function detectKind(mimeType: string, ext: string): AttachmentKind | null {
  if (IMAGE_MIME.test(mimeType) || IMAGE_EXT.has(ext)) return "image";
  if (VIDEO_MIME.test(mimeType) || VIDEO_EXT.has(ext)) return "video";
  if (AUDIO_MIME.test(mimeType) || (AUDIO_EXT.has(ext) && !VIDEO_EXT.has(ext))) {
    return "audio";
  }
  if (DOC_MIME.has(mimeType) || DOC_EXT.has(ext)) return "document";
  return null;
}

function isAllowed(mimeType: string, ext: string, kind: AttachmentKind): boolean {
  switch (kind) {
    case "image":
      return IMAGE_MIME.test(mimeType) && (IMAGE_EXT.has(ext) || !ext);
    case "video":
      return VIDEO_MIME.test(mimeType) && (VIDEO_EXT.has(ext) || !ext);
    case "audio":
      return AUDIO_MIME.test(mimeType) && (AUDIO_EXT.has(ext) || !ext);
    case "document":
      return DOC_MIME.has(mimeType) || DOC_EXT.has(ext);
    default:
      return false;
  }
}

function safeDisplayName(originalName: string): string {
  const base = path.basename(originalName || "arquivo").replace(/[^\w.\- ()[\]]+/g, "_");
  return base.slice(0, 180) || "arquivo";
}

export function validateAndSaveUpload(file: Express.Multer.File): SavedUpload {
  if (!file?.buffer?.length && !file?.path) {
    throw new BadRequestException("Arquivo inválido.");
  }

  const maxBytes = uploadMaxBytes();
  if (file.size > maxBytes) {
    throw new BadRequestException(
      `Arquivo excede o limite de ${Math.round(maxBytes / (1024 * 1024))} MB.`,
    );
  }

  const mimeType = (file.mimetype || "application/octet-stream").toLowerCase();
  const ext = sanitizeExtension(file.originalname);
  const kind = detectKind(mimeType, ext);
  if (!kind || !isAllowed(mimeType, ext, kind)) {
    throw new BadRequestException("Tipo de arquivo não permitido.");
  }

  const safeExt =
    ext ||
    (kind === "image"
      ? ".png"
      : kind === "video"
        ? ".mp4"
        : kind === "audio"
          ? ".webm"
          : ".bin");

  const storedName = `${randomUUID()}${safeExt}`;
  const dir = ensureUploadDir();
  const absolute = path.join(dir, storedName);
  if (!absolute.startsWith(dir)) {
    throw new BadRequestException("Caminho de arquivo inválido.");
  }

  if (file.buffer?.length) {
    fs.writeFileSync(absolute, file.buffer);
  } else if (file.path) {
    fs.renameSync(file.path, absolute);
  }

  return {
    storedName,
    originalName: safeDisplayName(file.originalname),
    mimeType,
    fileSize: file.size,
    kind,
    url: `/api/uploads/files/${storedName}`,
  };
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
