# Dars rejasi bajarilishi — foydalanish qo‘llanmasi

## 1. Template boshqarish

Admin sidebar ichidan **Dars rejalari** sahifasiga kiradi. Tizimda Du–Chor–Ju va Se–Pa–Sh standart templatelari avtomatik mavjud.

- `Template` tugmasi yangi jadval shablonini yaratadi.
- Kerakli templateni tanlab `Band` tugmasi orqali kun, mavzu, ko‘nikma, required va carry-over sozlamalari kiritiladi.
- Power belgisi template, band yoki sababni faol/nofaol qiladi.
- Nofaol qilingan ma’lumot eski darslardan o‘chmaydi.

## 2. Guruhga template biriktirish

**Guruhlar** sahifasidan guruh profilini oching. `Dars rejasi template’i` bo‘limida:

1. Template tanlang.
2. Amal qilish boshlanish sanasini belgilang.
3. Vaqtinchalik reja bo‘lsa tugash sanasini belgilang.
4. `Saqlash` tugmasini bosing.

Template biriktirilmagan guruhda uning dars kunlariga mos standart template ishlaydi.

## 3. Davomat va dars rejasi

1. **Yo‘qlama** sahifasiga kiring.
2. Guruh va sanani tanlang.
3. O‘quvchilar davomatini belgilang.
4. `Yo‘qlamani saqlash` tugmasini bosing.
5. Sahifa pastida `Bugungi dars rejasi` ochiladi.

Davomat saqlanmasdan dars rejasini yakunlab bo‘lmaydi.

## 4. Statuslarni belgilash

- **Bajarildi** — band to‘liq bajarilgan.
- **Qisman** — sabab tanlash majburiy; carry-over tanlash mumkin.
- **Bajarilmadi** — sabab tanlash majburiy; keyingi darsga ko‘chirish mumkin.
- **Tegishli emas** — faqat optional bandlarda mavjud.

`Boshqa sabab` tanlanganda qisqa sabab yozish majburiy. Har bir band uchun o‘qituvchi izohi ham yozilishi mumkin.

## 5. Carry-over

`Keyingi darsga ko‘chirish` tanlangan qisman yoki bajarilmagan band keyingi guruh darsida `Oldingi darsdan qolgan vazifalar` bo‘limida chiqadi.

- Bir band bir sessiyaga ikki marta ko‘chmaydi.
- Qayta ko‘chirilsa carry-over sanog‘i oshadi.
- Bajarilganda zanjir yopiladi.

## 6. Darsni yakunlash

Barcha required bandlar belgilangach `Rejani yakunlash` faol bo‘ladi. Yakunlangan reja bloklanadi. Zarur bo‘lsa admin `Qayta ochish` orqali tahrirlashni davom ettiradi.

## 7. Hisobot

**Dars rejasi hisoboti** sahifasida sana, guruh, o‘qituvchi, session statusi, jadval turi va carry-over bo‘yicha filterlash mumkin.

Hisobot faqat real saqlangan attendance va lesson session yozuvlaridan hisoblanadi.
