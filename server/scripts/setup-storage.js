import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const TEN_MEGABYTES = 10 * 1024 * 1024;
const DEFAULT_BUCKET = "student-submissions";
const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/zip",
  "application/x-zip-compressed",
];

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} environment variable topilmadi`);
  return value;
}

const bucketOptions = {
  public: false,
  fileSizeLimit: TEN_MEGABYTES,
  allowedMimeTypes: ALLOWED_MIME_TYPES,
};

async function setupStorage() {
  const url = requiredEnv("SUPABASE_URL");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const bucketName =
    process.env.SUPABASE_STORAGE_BUCKET?.trim() || DEFAULT_BUCKET;
  const supabase = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: buckets, error: listError } =
    await supabase.storage.listBuckets();
  if (listError) throw new Error(`Bucketlarni tekshirishda xato: ${listError.message}`);

  const exists = buckets.some((bucket) => bucket.id === bucketName);
  if (exists) {
    const { error: updateError } = await supabase.storage.updateBucket(
      bucketName,
      bucketOptions,
    );
    if (updateError)
      throw new Error(`Bucket sozlamalarini yangilashda xato: ${updateError.message}`);
    console.log(`Storage bucket tekshirildi va sozlamalari yangilandi: ${bucketName}`);
  } else {
    const { error: createError } = await supabase.storage.createBucket(
      bucketName,
      bucketOptions,
    );
    if (createError)
      throw new Error(`Bucket yaratishda xato: ${createError.message}`);
    console.log(`Storage bucket yaratildi: ${bucketName}`);
  }

  const { data: bucket, error: verifyError } =
    await supabase.storage.getBucket(bucketName);
  if (verifyError || !bucket)
    throw new Error(`Bucketni yakuniy tekshirishda xato: ${verifyError?.message || "topilmadi"}`);

  const configuredMimeTypes = [...(bucket.allowed_mime_types || [])].sort();
  const expectedMimeTypes = [...ALLOWED_MIME_TYPES].sort();
  const verified =
    bucket.public === false &&
    Number(bucket.file_size_limit) === TEN_MEGABYTES &&
    JSON.stringify(configuredMimeTypes) === JSON.stringify(expectedMimeTypes);

  if (!verified)
    throw new Error("Bucket yaratildi, lekin xavfsizlik sozlamalari tasdiqlanmadi");

  console.log(
    `Tasdiqlandi: private=true, limit=10MB, MIME turlari=${expectedMimeTypes.length}`,
  );
}

setupStorage().catch((error) => {
  // URL va service-role key hech qachon log qilinmaydi.
  console.error(`Storage setup bajarilmadi: ${error.message}`);
  process.exitCode = 1;
});
