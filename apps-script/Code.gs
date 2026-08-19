/**
 * APPS SCRIPT — PENDAFTARAN AUDITPHORIA 6.0
 * ==========================================
 * Cara pakai:
 * 1. Buka Google Sheet tujuan (tab pertama HARUS bernama "Peserta").
 * 2. Menu Extensions > Apps Script.
 * 3. Hapus semua kode default, tempel seluruh isi file ini.
 * 4. Isi DRIVE_FOLDER_ID di bawah dengan ID folder Drive tujuan berkas
 *    (buat folder baru di Drive Anda, ambil ID dari URL-nya).
 * 5. Klik Deploy > New deployment > pilih tipe "Web app".
 *      - Execute as: Me
 *      - Who has access: Anyone
 * 6. Klik Deploy, copy URL Web App yang muncul, tempel ke env var
 *    APPS_SCRIPT_URL di Vercel.
 *
 * ARSITEKTUR (final):
 * 1. Browser mengunggah berkas LANGSUNG ke Vercel Blob (bukan ke sini,
 *    bukan lewat Vercel Function) — jadi tidak kena limit ukuran request
 *    4.5MB milik Vercel Functions.
 * 2. Browser mengirim URL-URL blob tadi + data teks ke /api/register
 *    (Next.js, same-origin, payloadnya kecil).
 * 3. /api/register meneruskan URL-URL itu ke Web App INI (server-ke-server,
 *    jadi TIDAK kena masalah CORS browser). Kode di bawah ini yang
 *    mengunduh file dari Vercel Blob pakai UrlFetchApp, menyimpannya ke
 *    Drive, lalu mencatat baris ke Google Sheet.
 * 4. Setelah sukses, /api/register menghapus file sementara di Vercel
 *    Blob (Drive sudah punya salinan permanennya).
 *
 * PENTING: Web App ini TIDAK PERNAH dipanggil langsung dari browser lagi
 * (itu yang dulu bikin error "Failed to fetch" — Apps Script Web App tidak
 * bisa mengatur header CORS di responsnya). Sekarang satu-satunya pemanggil
 * adalah server Next.js Anda, jadi CORS tidak relevan lagi.
 *
 * Setiap submit otomatis dicatat 2x:
 * - Tab "Peserta" (master, berisi SEMUA peserta dari semua kategori)
 * - Tab sesuai nama kategori lombanya (dibuat otomatis kalau belum ada,
 *   header-nya ikut disalin dari tab Peserta)
 */

const SHEET_NAME = "Peserta"
const DRIVE_FOLDER_ID = "1nbNAChSpVAaSXwNm3R53Q20NGVwuiSA1"

const FILE_LABELS = {
  abstrak: "Karya - Abstrak",
  followIg: "Bukti Follow IG",
  ktm: "KTM - Identitas",
  posterWa: "Bukti Share Poster WA",
  posterIg: "Bukti Share Poster IG",
  twibbon: "Bukti Upload Twibbon",
  buktiBayar: "Bukti Pembayaran",
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents)
    return jsonOutput(handleSubmit(data))
  } catch (err) {
    return jsonOutput({ ok: false, message: String(err) })
  }
}

function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)
}

function safeName(name) {
  return String(name || "").replace(/[\\/:*?"<>|]+/g, "_").trim()
}

/**
 * Ambil folder kategori di dalam folder utama. Kalau belum ada, buat baru.
 */
function getOrCreateCategoryFolder(parentFolder, categoryName) {
  const name = safeName(categoryName) || "Lainnya"
  const existing = parentFolder.getFoldersByName(name)
  if (existing.hasNext()) {
    return existing.next()
  }
  return parentFolder.createFolder(name)
}

function getOrCreateSubmissionFolder(categoryFolder, referenceId, labelHint) {
  const folderName = safeName((labelHint || "Peserta") + " - " + (referenceId || "TANPA-REF"))
  const existing = categoryFolder.getFoldersByName(folderName)
  if (existing.hasNext()) {
    return existing.next()
  }
  const folder = categoryFolder.createFolder(folderName)
  folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW)
  return folder
}

function toWaLink(phone) {
  if (!phone) return ""
  let digits = String(phone).replace(/[^0-9]/g, "")
  if (digits.indexOf("0") === 0) {
    digits = "62" + digits.slice(1)
  } else if (digits.indexOf("62") !== 0) {
    digits = "62" + digits
  }
  return "wa.me/" + digits
}

/** Tebak ekstensi file dari URL blob atau dari Content-Type hasil download. */
function guessExtension(url, blob) {
  const fromUrl = String(url || "").match(/\.([a-zA-Z0-9]{2,5})(?:\?|$)/)
  if (fromUrl) return "." + fromUrl[1]
  const ct = (blob && blob.getContentType && blob.getContentType()) || ""
  if (ct.indexOf("pdf") !== -1) return ".pdf"
  if (ct.indexOf("png") !== -1) return ".png"
  if (ct.indexOf("jpeg") !== -1 || ct.indexOf("jpg") !== -1) return ".jpg"
  if (ct.indexOf("webp") !== -1) return ".webp"
  return ""
}

/**
 * Unduh sekumpulan berkas dari Vercel Blob (server-ke-server, tanpa isu CORS)
 * lalu simpan permanen ke folder submission di Drive.
 */
function downloadAndSaveGroup(subFolder, label, urls) {
  const links = []
  if (!urls || !urls.length) return links
  urls.forEach(function (url, i) {
    if (!url) return
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true })
    if (response.getResponseCode() !== 200) {
      throw new Error('Gagal mengunduh berkas "' + label + '" dari penyimpanan sementara (kode ' + response.getResponseCode() + ").")
    }
    const blob = response.getBlob()
    const ext = guessExtension(url, blob)
    const fileName = (urls.length > 1 ? label + " " + (i + 1) : label) + ext
    blob.setName(fileName)
    const file = subFolder.createFile(blob)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW)
    links.push(file.getUrl())
  })
  return links
}

/**
 * Ambil tab sesuai nama kategori. Kalau belum ada, buat baru
 * dan salin baris header dari tab "Peserta" supaya kolomnya konsisten.
 */
function getOrCreateCategorySheet(ss, masterSheet, categoryName) {
  if (!categoryName) return null
  const name = String(categoryName).replace(/[\[\]*?\/\\:]/g, "").substring(0, 100)
  let categorySheet = ss.getSheetByName(name)
  if (!categorySheet) {
    categorySheet = ss.insertSheet(name)
    const lastCol = masterSheet.getLastColumn()
    if (lastCol > 0) {
      const headerValues = masterSheet.getRange(1, 1, 1, lastCol).getValues()
      categorySheet.getRange(1, 1, 1, lastCol).setValues(headerValues)
      categorySheet.setFrozenRows(1)
    }
  }
  return categorySheet
}

/**
 * Input: { referenceId, kategori, kategoriLabel, namaTim, ketua, anggota1,
 *          anggota2, sekolah, kota, telepon, email,
 *          fileUrls: { fieldName: ["https://...blob.vercel-storage.com/...", ...] } }
 */
function handleSubmit(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const sheet = ss.getSheetByName(SHEET_NAME)
  if (!sheet) {
    throw new Error('Tab bernama "' + SHEET_NAME + '" tidak ditemukan di spreadsheet ini.')
  }

  const parentFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID)
  const categoryFolder = getOrCreateCategoryFolder(parentFolder, data.kategoriLabel || data.kategori)
  const submissionFolder = getOrCreateSubmissionFolder(
    categoryFolder,
    data.referenceId,
    data.namaTim || data.ketua,
  )

  const fileUrls = data.fileUrls || {}
  function saveGroup(field) {
    return downloadAndSaveGroup(submissionFolder, FILE_LABELS[field] || field, fileUrls[field])
  }

  const linkAbstrak = saveGroup("abstrak")
  const linkFollowIg = saveGroup("followIg")
  const linkKtm = saveGroup("ktm")
  const linkPosterWa = saveGroup("posterWa")
  const linkPosterIg = saveGroup("posterIg")
  const linkTwibbon = saveGroup("twibbon")
  const linkBuktiBayar = saveGroup("buktiBayar")

  const row = [
    new Date(),
    data.referenceId || "",
    data.kategoriLabel || data.kategori || "",
    data.namaTim || "",
    data.ketua || "",
    data.anggota1 || "",
    data.anggota2 || "",
    data.sekolah || "",
    data.kota || "",
    toWaLink(data.telepon),
    data.email || "",
    linkAbstrak.join("\n"),
    linkFollowIg.join("\n"),
    linkKtm.join("\n"),
    linkPosterWa.join("\n"),
    linkPosterIg.join("\n"),
    linkTwibbon.join("\n"),
    linkBuktiBayar.join("\n"),
  ]

  // 1. Catat ke tab master "Peserta"
  sheet.appendRow(row)

  // 2. Catat juga ke tab sesuai kategori lombanya (dibuat otomatis kalau belum ada)
  const categorySheet = getOrCreateCategorySheet(ss, sheet, data.kategoriLabel || data.kategori)
  if (categorySheet) {
    categorySheet.appendRow(row)
  }

  return { ok: true, message: "Pendaftaran berhasil dikirim." }
}

/** Buka URL Web App langsung di browser untuk memastikan script sudah aktif */
function doGet() {
  return ContentService.createTextOutput(
    JSON.stringify({
      ok: true,
      message: "Apps Script pendaftaran aktif.",
      version: "vercel-blob-final-1", // ganti string ini tiap kali update Code.gs, buat cek deployment aktif
    }),
  ).setMimeType(ContentService.MimeType.JSON)
}
