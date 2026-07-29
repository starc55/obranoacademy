import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const execute = process.argv.includes("--execute");
const batchArg = process.argv.find((arg) => arg.startsWith("--batch-size="));
const batchSize = Math.min(100, Math.max(1, Number(batchArg?.split("=")[1]) || 20));
let cleaned = 0;

async function run() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL topilmadi");
  const sql = neon(process.env.DATABASE_URL);
  await sql`alter table submission_files alter column content drop not null`;
  await sql`alter table submission_files add column if not exists storage_path text`;
  await sql`alter table submission_files add column if not exists migration_status text not null default 'PENDING'`;
  await sql`alter table submission_files add column if not exists updated_at timestamptz not null default now()`;

  const [summary] = await sql`select
    (select count(*)::int from submission_files where content is not null) files_to_clean,
    (select coalesce(sum(octet_length(content)),0)::bigint from submission_files where content is not null) bytes_to_clean,
    (select count(*)::int from submissions) submissions_preserved,
    (select count(distinct student_id)::int from submissions) student_results_preserved`;
  const foreignKeys = await sql`select tc.constraint_name,ccu.table_name referenced_table
    from information_schema.table_constraints tc
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_name=tc.constraint_name and ccu.constraint_schema=tc.constraint_schema
    where tc.table_schema='public' and tc.table_name='submission_files'
      and tc.constraint_type='FOREIGN KEY'`;

  console.log(`Rejim: ${execute ? "EXECUTE" : "DRY-RUN"}`);
  console.log(`Content tozalanadi: ${summary.files_to_clean} ta file record`);
  console.log(`Bo‘shatiladigan bytea: ${summary.bytes_to_clean} bayt`);
  console.log(`Saqlanadi: ${summary.submissions_preserved} ta submission`);
  console.log(`Saqlanadi: ${summary.student_results_preserved} ta student natijasi`);
  console.log(`submission_files foreign keylari: ${foreignKeys.length} ta`);
  console.log("TRUNCATE va CASCADE ishlatilmaydi; file recordlar ham o‘chirilmaydi.");
  if (!execute) {
    console.log("Bu dry-run. Tozalash uchun alohida --execute flagi talab qilinadi.");
    return;
  }

  let hasMore = true;
  while (hasMore) {
    const rows = await sql`select id from submission_files
      where content is not null order by created_at,id limit ${batchSize}`;
    if (!rows.length) {
      hasMore = false;
      continue;
    }
    const ids = rows.map((row) => row.id);
    const result = await sql`update submission_files set
      content=null,
      migration_status=case when storage_path is null then 'CONTENT_REMOVED' else migration_status end,
      updated_at=now()
      where id=any(${ids}::uuid[]) and content is not null returning id`;
    cleaned += result.length;
  }
  console.log(`Faqat submission_files.content tozalandi: ${cleaned} ta record`);
  console.log("students, submissions, ball, feedback, status, vaqtlar va progress o‘zgartirilmadi.");
}

run().catch((error) => {
  console.error(`Cleanup bajarilmadi: ${error.message}`);
  process.exitCode = 1;
});
