import test from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeFileName,
  validateSubmissionFile,
} from "./submissionFiles.js";

const file = (name, mimetype, buffer) => ({
  originalname: name,
  mimetype,
  buffer,
  size: buffer.length,
});

test("fayl nomidan path traversal olib tashlanadi", () => {
  assert.equal(sanitizeFileName("../../hisobot 1.pdf"), "hisobot_1.pdf");
});

test("haqiqiy PNG qabul qilinadi", async () => {
  const buffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  ]);
  const result = await validateSubmissionFile(file("rasm.png", "image/png", buffer));
  assert.equal(result.mimeType, "image/png");
});

test("extension va magic bytes mos bo‘lmasa 415 qaytaradi", async () => {
  const pdf = Buffer.from("%PDF-1.7\n");
  await assert.rejects(
    validateSubmissionFile(file("soxta.jpg", "image/jpeg", pdf)),
    (error) => error.status === 415,
  );
});

test("ruxsat etilmagan extension rad qilinadi", async () => {
  await assert.rejects(
    validateSubmissionFile(file("virus.exe", "application/octet-stream", Buffer.from("MZ"))),
    (error) => error.status === 415,
  );
});
