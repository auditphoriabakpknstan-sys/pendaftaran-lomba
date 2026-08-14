# Integrasi Google Sheets & Drive — via Google Apps Script (tanpa kartu kredit)

Form ini terhubung ke Google Sheets + Google Drive lewat **Google Apps Script**, bukan Google Cloud Console. Jadi:
- **Tidak perlu** bikin project Cloud, Service Account, atau kartu kredit sama sekali
- Cukup pakai akun Google biasa yang sudah punya Sheets & Drive
- Sepenuhnya gratis, tanpa batas billing

## Cara kerja

1. Peserta submit form → Next.js (`app/api/register/route.ts`) menerima data + berkas
2. Berkas diubah jadi teks base64, lalu dikirim sebagai satu paket JSON ke URL Web App Apps Script
3. Script di Apps Script (jalan di akun Google Anda) menulis baris baru ke Sheets, dan menyimpan berkas ke folder Drive

## Langkah setup

### 1. Siapkan Google Sheet
1. Buat spreadsheet baru di Google Sheets.
2. Ubah nama tab pertama jadi persis **`Peserta`**.
3. Isi baris header di baris 1:

   `Waktu | Kategori | Nama Tim | Ketua | Anggota 1 | Anggota 2 | Sekolah | Kota | Telepon | Email | Link Abstrak | Link Follow IG | Link KTM | Link Poster WA | Link Poster IG | Link Twibbon | Link Bukti Bayar`

### 2. Siapkan folder Google Drive
1. Buat folder baru di Drive Anda, misal "Berkas Peserta Auditphoria 6.0".
2. Buka folder itu, ambil **Folder ID** dari URL:
   `https://drive.google.com/drive/folders/FOLDER_ID_DI_SINI`

### 3. Pasang Apps Script
1. Di Google Sheet yang sama, klik menu **Extensions > Apps Script**.
2. Hapus kode default yang ada, buka file `apps-script/Code.gs` di project ini, copy semua isinya, tempel di editor Apps Script.
3. Cari baris `const DRIVE_FOLDER_ID = "PASTE_FOLDER_ID_DRIVE_DI_SINI"` → ganti dengan Folder ID dari langkah 2.
4. Simpan (ikon disket / Ctrl+S).

### 4. Deploy sebagai Web App
1. Klik tombol **Deploy** (kanan atas) → **New deployment**.
2. Klik ikon gerigi di sebelah "Select type" → pilih **Web app**.
3. Isi:
   - **Execute as**: Me (akun Google Anda)
   - **Who has access**: **Anyone**
4. Klik **Deploy**.
5. Google akan minta izin akses (Authorize access) — pilih akun Anda, klik **Advanced > Go to (nama project) (unsafe)** kalau muncul peringatan, lalu **Allow**. Ini normal karena scriptnya milik Anda sendiri.
6. Copy **Web app URL** yang muncul (formatnya `https://script.google.com/macros/s/xxxxx/exec`).

### 5. Sambungkan ke Vercel
1. Buka project Anda di dashboard Vercel → **Settings > Environment Variables**.
2. Tambahkan satu variabel:
   - Key: `APPS_SCRIPT_URL`
   - Value: URL Web App dari langkah 4 tadi
3. Redeploy project.

### 6. Uji coba
Isi form sampai selesai, submit, lalu cek:
- Baris baru muncul di tab `Peserta`
- Folder baru (berisi semua berkas peserta) muncul di folder Drive Anda

## Kalau nanti ada perubahan pada script

Setiap kali Anda mengedit `Code.gs` di Apps Script editor, **wajib** klik **Deploy > Manage deployments > (pilih deployment aktif) > ikon pensil > Deploy** lagi supaya perubahan aktif — menyimpan file saja tidak cukup untuk Web App yang sudah ter-deploy.

## Batas

- Ukuran maksimal per berkas: 10MB (ubah `MAX_FILE_SIZE` di `app/api/register/route.ts`)
- Google Apps Script punya kuota harian wajar untuk akun gratis (jauh lebih dari cukup untuk pendaftaran lomba biasa)
