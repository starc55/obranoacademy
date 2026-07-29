import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { sanitizeFileName } from "./submissionFiles.js";

let client;
const bucket = () => process.env.SUPABASE_STORAGE_BUCKET || "student-submissions";
function getClient() {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw Object.assign(new Error("Fayl storage sozlamalari mavjud emas"), {
      status: 503, code: "STORAGE_NOT_CONFIGURED",
    });
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
export function sanitizeStoragePath(studentId, submissionId, fileName) {
  return `students/${encodeURIComponent(studentId)}/submissions/${encodeURIComponent(submissionId)}/${randomUUID()}-${sanitizeFileName(fileName)}`;
}
export async function uploadFile({ studentId, submissionId, file }) {
  const storagePath = sanitizeStoragePath(studentId, submissionId, file.originalName);
  const { error } = await getClient().storage.from(bucket()).upload(storagePath, file.buffer, {
    contentType: file.mimeType,
    upsert: false,
  });
  if (error) throw Object.assign(new Error("Faylni saqlashda xatolik yuz berdi. Keyinroq qayta urinib ko‘ring."), {
    status: 503, code: "STORAGE_UPLOAD_ERROR",
  });
  return { storageProvider: "supabase", storageBucket: bucket(), storagePath };
}
export async function createSignedUrl(storagePath) {
  const expiresIn = Math.min(3600, Math.max(60, Number(process.env.SUPABASE_SIGNED_URL_EXPIRES_IN) || 600));
  const { data, error } = await getClient().storage.from(bucket()).createSignedUrl(storagePath, expiresIn);
  if (error || !data?.signedUrl)
    throw Object.assign(new Error("Fayl havolasini yaratib bo‘lmadi"), { status: 503, code: "STORAGE_SIGN_ERROR" });
  return { url: data.signedUrl, expiresIn };
}
export async function deleteFiles(paths = []) {
  const safePaths = paths.filter(Boolean);
  if (!safePaths.length) return;
  const { error } = await getClient().storage.from(bucket()).remove(safePaths);
  if (error) throw Object.assign(new Error("Faylni storage’dan o‘chirishda xatolik"), {
    status: 503, code: "STORAGE_DELETE_ERROR",
  });
}
export async function fileExists(storagePath) {
  const slash = storagePath.lastIndexOf("/");
  const folder = storagePath.slice(0, slash);
  const name = storagePath.slice(slash + 1);
  const { data, error } = await getClient().storage.from(bucket()).list(folder, { search: name, limit: 10 });
  if (error) return false;
  return data.some((item) => item.name === name);
}
export const storageBucket = bucket;
