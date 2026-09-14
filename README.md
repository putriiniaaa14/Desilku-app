# Desilku — versi mandiri (siap deploy)

Ini adalah versi standalone dari prototipe "Desilku" (Cek Desil Keluarga).
Berbeda dari versi Claude Artifact, versi ini pakai **Supabase** sebagai
backend sungguhan (bukan simulasi), jadi:

- Login/daftar akun beneran tersimpan (aman, sandi di-hash, bukan plain text).
- "Lupa sandi" mengirim **email reset sandi sungguhan**.
- Data isian (NIK, KK, pendapatan, dll) tersimpan di database dan **hanya
  bisa dibaca oleh pemiliknya sendiri** (diatur lewat Row Level Security).

> ⚠️ **Penting soal data**: form ini meminta NIK, KK, pendapatan, dan data
> pribadi lain yang tergolong data pribadi bersifat spesifik menurut UU PDP.
> Sebelum dipakai warga sungguhan, pastikan: (1) ada halaman kebijakan
> privasi yang jelas, (2) data cuma dipakai untuk tujuan yang disebutkan,
> (3) idealnya didampingi/diverifikasi oleh perangkat desa yang berwenang,
> bukan cuma aplikasi mandiri yang berdiri sendiri.

---

## 1. Setup Supabase (sekali saja, ±10 menit)

1. Buat akun & project baru di [supabase.com](https://supabase.com) (gratis).
2. Di dashboard project, buka **SQL Editor** → **New query**, lalu copy-paste
   seluruh isi file [`supabase/schema.sql`](./supabase/schema.sql) di repo
   ini → klik **Run**. Ini akan membuat tabel `profiles` dan
   `desil_submissions` beserta aturan keamanannya.
3. Buka **Authentication → Providers**, pastikan **Email** aktif. Untuk uji coba cepat, kamu boleh mematikan kewajiban konfirmasi email; jika tetap aktif, warga harus klik tautan konfirmasi sebelum login.
4. Buka **Authentication → Email Templates**, cek template "Reset Password" —
   bisa dikustomisasi ke Bahasa Indonesia kalau mau.
5. Setelah menjalankan schema, bucket private `dokumen-warga` untuk SKCK opsional
   akan dibuat otomatis. SKCK tidak wajib dilampirkan.
6. (Opsional tapi disarankan untuk produksi) Buka **Authentication → Settings
   → SMTP Settings** dan hubungkan penyedia email sendiri (mis. Resend,
   SendGrid). Supabase punya kuota email bawaan yang cukup untuk uji coba,
   tapi terbatas — untuk desa dengan banyak warga, SMTP sendiri lebih andal.
6. Buka **Project Settings → API**, salin dua nilai ini untuk langkah
   berikutnya:
   - `Project URL`
   - `anon public` key (JANGAN pakai `service_role` key di frontend!)

## Jika login selalu gagal

Aplikasi ini memang memakai **username untuk tampilan login**, tetapi Supabase
Auth tetap melakukan autentikasi menggunakan email. Alurnya:
`username → profiles → email → Supabase Auth`.

Karena itu, pastikan:
- akun sudah benar-benar terdaftar di **Authentication → Users**;
- jika konfirmasi email aktif, email sudah dikonfirmasi;
- tabel `profiles` memiliki baris untuk akun tersebut;
- `profiles.username` sama dengan username yang dipakai saat login.

Setelah pembaruan schema, jika ada akun lama yang ada di Auth tetapi belum memiliki
profile, buat profile-nya melalui SQL yang aman di dashboard Supabase (sesuaikan
email/username milik akun tersebut).

Untuk membuat akun admin tertentu, login/daftarkan akun tersebut terlebih dahulu,
lalu jalankan di SQL Editor:
```sql
update public.profiles
set role = 'admin'
where email = 'email-admin@contoh.id';
```
Jangan menaruh `service_role` key di frontend.

## 2. Jalankan di komputer lokal (opsional, untuk cek dulu)

```bash
npm install
cp .env.example .env
# buka .env, isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY
npm run dev
```

Buka `http://localhost:5173`, coba daftar akun baru pakai email kamu sendiri
dan pastikan alurnya jalan.

## 3. Deploy ke hosting

### Opsi A — Vercel (paling gampang)

1. Push folder project ini ke repo GitHub.
2. Di [vercel.com](https://vercel.com), klik **Add New → Project**, pilih
   repo tersebut.
3. Di bagian **Environment Variables**, tambahkan:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Klik **Deploy**. File `vercel.json` di repo ini sudah mengatur supaya
   halaman `/reset-password` (dari link email) tetap berfungsi.

### Opsi B — Netlify

1. Push ke GitHub, lalu **Add new site → Import an existing project** di
   Netlify.
2. Build command: `npm run build`, publish directory: `dist` (sudah diatur
   otomatis lewat `netlify.toml`).
3. Di **Site settings → Environment variables**, tambahkan
   `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`.
4. Deploy.

### Opsi C — GitHub Pages

GitHub Pages tidak punya server untuk env variable saat build, jadi kamu
perlu build secara lokal (nilai env "terbakar" ke dalam file JS hasil
build — ini normal untuk `anon key`, karena key itu memang didesain untuk
dipakai publik di sisi client, keamanan data diatur oleh RLS, bukan oleh
kerahasiaan key ini):

```bash
cp .env.example .env   # isi dengan nilai Supabase kamu
npm run build
npx gh-pages -d dist
```

Untuk SPA routing di GitHub Pages (supaya `/reset-password` tidak 404),
copy `dist/index.html` menjadi `dist/404.html` sebelum deploy.

## 4. Pasang domain sendiri (mis. `cekdesil-desamu.id`)

1. Beli domain di registrar (Niagahoster, Rumahweb, Namecheap, dll).
2. Di Vercel/Netlify, buka **Domains** pada project, tambahkan domain kamu.
3. Mereka akan menunjukkan record DNS yang perlu ditambahkan (biasanya
   `A`/`CNAME`) — masukkan record itu di panel DNS registrar kamu.
4. Tunggu propagasi DNS (biasanya beberapa menit sampai 24 jam). Sertifikat
   HTTPS otomatis diterbitkan oleh Vercel/Netlify.
5. Di Supabase, buka **Authentication → URL Configuration**, update
   **Site URL** dan **Redirect URLs** ke `https://cekdesil-desamu.id` dan
   `https://cekdesil-desamu.id/reset-password` — kalau tidak, link reset
   sandi di email akan mengarah ke alamat lama.

---

## Struktur project

```
src/
  App.jsx              # seluruh UI & alur layar (asli dari prototipe, sudah disambungkan ke Supabase)
  lib/supabaseClient.js # koneksi ke Supabase
  lib/api.js            # fungsi login/daftar/reset sandi/simpan data
supabase/schema.sql      # skema database + Row Level Security
```

## Yang sudah diperbaiki dari versi prototipe

- Sandi tidak lagi disimpan/dibandingkan sebagai teks polos — ditangani
  penuh oleh Supabase Auth (hash + salt standar industri).
- "Lupa sandi" mengirim email sungguhan lewat `resetPasswordForEmail`,
  bukan simulasi.
- Data isian tiap warga terisolasi lewat Row Level Security — bukan lagi
  disimpan sebagai data "shared" yang berpotensi bisa dibaca akun lain.
- Skor "indikasi desil" di dalam kode tetap sama seperti prototipe —
  **ini masih estimasi kasar untuk gambaran awal**, bukan penghitungan
  resmi PMT/DTSEN. Pertimbangkan mendiskusikan bobot skornya dengan
  operator/pendamping desa sebelum dipakai luas.
