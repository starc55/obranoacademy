import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { uploadFile, deleteFiles } from "../services/supabaseStorage.js";

const dryRun = process.argv.includes("--dry-run");
const batchArg = process.argv.find((arg) => arg.startsWith("--batch-size="));
const batchSize = Math.min(100, Math.max(1, Number(batchArg?.split("=")[1]) || 20));
let migrated = 0;

async function run() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL topilmadi");
  const sql = neon(process.env.DATABASE_URL);
  await sql`alter table submission_files alter column content drop not null`;
  await sql`alter table submission_files add column if not exists storage_provider text`;
  await sql`alter table submission_files add column if not exists storage_bucket text`;
  await sql`alter table submission_files add column if not exists storage_path text`;
  await sql`alter table submission_files add column if not exists migration_status text not null default 'PENDING'`;
  await sql`alter table submission_files add column if not exists migrated_at timestamptz`;
  await sql`alter table submission_files add column if not exists updated_at timestamptz not null default now()`;
  if (dryRun) {
    const [summary] = await sql`select count(*)::int files,
      coalesce(sum(octet_length(content)),0)::bigint bytes
      from submission_files where content is not null and storage_path is null`;
    console.log(`Ko‘chirilishi kerak: ${summary.files} ta fayl, ${summary.bytes} bayt`);
    return;
  }
  let hasMore = true;
  while (hasMore) {
    const rows = await sql`select f.id,f.submission_id,f.original_name,f.mime_type,
      f.size_bytes,f.content,s.student_id
      from submission_files f join submissions s on s.id=f.submission_id
      where f.content is not null and f.storage_path is null
      order by f.created_at,f.id limit ${batchSize}`;
    if (!rows.length) {
      hasMore = false;
      continue;
    }
    console.log(`Batch: ${rows.length} ta fayl`);
    for (const row of rows) {
      let uploaded;
      try {
        uploaded = await uploadFile({
          studentId: row.student_id,
          submissionId: row.submission_id,
          file: {
            originalName: row.original_name,
            mimeType: row.mime_type,
            size: Number(row.size_bytes),
            buffer: Buffer.from(row.content),
          },
        });
        await sql`update submission_files set
          storage_provider=${uploaded.storageProvider},
          storage_bucket=${uploaded.storageBucket},
          storage_path=${uploaded.storagePath},
          migration_status='MIGRATED',migrated_at=now(),updated_at=now()
          where id=${row.id} and storage_path is null`;
        migrated += 1;
      } catch (error) {
        if (uploaded?.storagePath)
          await deleteFiles([uploaded.storagePath]).catch(() => {});
        throw new Error(`Migration ${row.id} da to‘xtadi: ${error.message}`, {
          cause: error,
        });
      }
    }
  }
  console.log(`Ko‘chirildi: ${migrated} ta fayl`);
  console.log("Tekshiruvdan keyin cleanup skriptini avval --dry-run bilan bajaring.");
}

run().catch((error) => {
  console.error(`Migration bajarilmadi: ${error.message}`);
  process.exitCode = 1;
});
