# Submission fayllarini Supabase Storage’ga ko‘chirish

Backend environment’ida `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` va
`SUPABASE_STORAGE_BUCKET=student-submissions` bo‘lishi kerak. Service role key
faqat backend/Render environment’da saqlanadi; `VITE_` prefiksi bilan berilmaydi.

Production tartibi:

1. `npm run setup:storage` — private bucketni idempotent yaratadi yoki sozlaydi.
2. `npm run migrate:submission-files -- --dry-run` — ko‘chiriladigan eski
   `bytea` fayllar sonini ko‘rsatadi.
3. `npm run migrate:submission-files -- --batch-size=20` — fayllarni Storage’ga
   ko‘chiradi. Bu bosqich `content`ni o‘chirmaydi va qayta ishga tushirish xavfsiz.
4. Admin/student orqali bir nechta eski va yangi faylni ochib tekshiring.
5. `npm run cleanup:submission-file-content` — default dry-run; tozalanadigan
   file soni va `bytea` hajmi, saqlanadigan submission hamda student natijalari
   sonini ko‘rsatadi.
6. `npm run cleanup:submission-file-content -- --execute --batch-size=20` —
   faqat `submission_files.content` ustunini `NULL` qiladi. File metadata
   recordlari, submission va natijalar o‘chirilmaydi. Production’da bu buyruq
   avtomatik ishlamaydi va `--execute` flagisiz hech narsani tozalamaydi.
7. Neon SQL Editor’da `VACUUM (ANALYZE) submission_files;` bajarish mumkin.
   `VACUUM FULL` avtomatik bajarilmaydi, chunki u jadvalni bloklashi mumkin.

Eski fayllarni Supabase’ga ko‘chirish majburiy emas. Migration bosqichi
o‘tkazib yuborilib, cleanup bajarilsa UI file metadata’ni saqlaydi va
“Eski fayl saqlanmagan” deb ko‘rsatadi.

Yangi upload: maksimal 10 ta fayl, har biri 10 MB. Ruxsat etilgan turlar:
PNG, JPEG, PDF, DOC, DOCX va ZIP. Bucket public emas; fayl ochishda backend
egalik/ADMIN huquqini tekshiradi va qisqa muddatli signed URL qaytaradi.
