import path from "node:path";
import { fileTypeFromBuffer } from "file-type";

export const ALLOWED_SUBMISSION_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/zip",
  "application/x-zip-compressed",
]);
export const ALLOWED_SUBMISSION_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".pdf", ".doc", ".docx", ".zip",
]);
export const MAX_SUBMISSION_FILE_SIZE =
  Math.max(1, Number(process.env.MAX_SUBMISSION_FILE_SIZE_MB) || 10) * 1024 * 1024;
export const MAX_SUBMISSION_FILES =
  Math.min(20, Math.max(1, Number(process.env.MAX_SUBMISSION_FILES) || 10));
const MIME_BY_EXTENSION = {
  ".png": new Set(["image/png"]),
  ".jpg": new Set(["image/jpeg"]),
  ".jpeg": new Set(["image/jpeg"]),
  ".pdf": new Set(["application/pdf"]),
  ".doc": new Set(["application/msword"]),
  ".docx": new Set([
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip",
  ]),
  ".zip": new Set(["application/zip", "application/x-zip-compressed"]),
};

export function sanitizeFileName(name = "file") {
  const base = path.basename(String(name)).normalize("NFKD");
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_").slice(-120) || "file";
}

export async function validateSubmissionFile(file) {
  if (!file?.buffer?.length)
    throw Object.assign(new Error("Bo‘sh fayl qabul qilinmaydi"), { status: 400 });
  if (file.size > MAX_SUBMISSION_FILE_SIZE)
    throw Object.assign(new Error("Fayl hajmi juda katta. Maksimal hajm 10 MB."), { status: 413 });
  const extension = path.extname(file.originalname || "").toLowerCase();
  if (!ALLOWED_SUBMISSION_EXTENSIONS.has(extension))
    throw Object.assign(new Error("Bu fayl turi qo‘llab-quvvatlanmaydi."), { status: 415 });
  const detected = await fileTypeFromBuffer(file.buffer),
    advertisedMime = String(file.mimetype || "").toLowerCase(),
    detectedMime = detected?.mime?.toLowerCase(),
    candidates = MIME_BY_EXTENSION[extension];
  if (
    !ALLOWED_SUBMISSION_MIME_TYPES.has(advertisedMime) ||
    (detectedMime && !candidates.has(detectedMime))
  )
    throw Object.assign(new Error("Bu fayl turi qo‘llab-quvvatlanmaydi."), { status: 415 });
  const mime =
    extension === ".docx"
      ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      : detectedMime || advertisedMime;
  return {
    originalName: sanitizeFileName(file.originalname),
    mimeType: mime,
    size: file.size,
    buffer: file.buffer,
  };
}
