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
 * 6. Klik Deploy, copy URL Web App yang muncul.
 * 7. Tempel URL itu ke DUA environment variable di Vercel:
 *      - APPS_SCRIPT_URL             (dipakai server, tanpa NEXT_PUBLIC_)
 *      - NEXT_PUBLIC_APPS_SCRIPT_URL (dipakai browser untuk upload berkas
 *        langsung, WAJIB pakai prefix NEXT_PUBLIC_ supaya ke-bundle ke client)
 *    Nilainya SAMA PERSIS, cuma nama variabelnya beda dua.
 *
 * ALUR BARU (2 tahap, supaya tidak kena limit 4.5MB Vercel):
 * 1. Browser mengirim SEMUA berkas langsung ke Web App ini
 *    (action: "uploadFiles") — tidak lewat server Next.js sama sekali.
 *    Apps Script mengunggahnya ke Drive dan membalas link setiap berkas.
 * 2. Browser lalu mengirim data teks + link-link tadi ke /api/register
 *    (Next.js) yang meneruskannya ke Web App ini lagi (action: "submit")
 *    untuk dicatat ke Google Sheet. Payload tahap ini kecil (cuma teks),
 *    jadi tidak pernah mendekati limit ukuran request Vercel.
 *
 * Setiap submit otomatis dicatat 2x:
 * - Tab "Peserta" (master, berisi SEMUA peserta dari semua kategori)
 * - Tab sesuai nama kategori lombanya (dibuat otomatis kalau belum ada,
 *   header-nya ikut disalin dari tab Peserta)
 */

const SHEET_NAME = "Peserta"
const DRIVE_FOLDER_ID = "1nbNAChSpVAaSXwNm3R53Q20NGVwuiSA1"

const FILE_UPLOAD_LABEL = {
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
    const action = data.action || "submit"

    if (action === "uploadFiles") {
      return jsonOutput(handleUploadFiles(data))
    }
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

/**
 * Ambil folder submission di dalam folder kategori, dikunci lewat referenceId
 * supaya panggilan "uploadFiles" (bisa lebih dari sekali kalau ada retry) dan
 * pembacaan berikutnya selalu jatuh ke folder yang sama.
 */
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

function getExt(name) {
  if (!name) return ""
  const idx = name.lastIndexOf(".")
  return idx >= 0 ? name.substring(idx) : ""
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

function uploadGroup(subFolder, label, filesArr) {
  const links = []
  if (!filesArr || !filesArr.length) return links
  filesArr.forEach(function (f, i) {
    if (!f || !f.base64) return
    const bytes = Utilities.base64Decode(f.base64)
    const fileName = (filesArr.length > 1 ? label + " " + (i + 1) : label) + getExt(f.name)
    const blob = Utilities.newBlob(bytes, f.mimeType || "application/octet-stream", fileName)
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
  // Nama tab di Google Sheets tidak boleh lebih dari 100 karakter
  // dan tidak boleh mengandung: [ ] * ? / \ :
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
 * TAHAP 1 — dipanggil LANGSUNG dari browser (tidak lewat Next.js), supaya
 * ukuran berkas tidak kena limit 4.5MB milik Vercel Functions.
 * Input:  { action:"uploadFiles", referenceId, kategori, kategoriLabel,
 *           namaTim, ketua, files: { fieldName: [{name,mimeType,base64}] } }
 * Output: { ok:true, links: { fieldName: ["url1", "url2", ...] } }
 */
function handleUploadFiles(data) {
  const parentFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID)
  const categoryFolder = getOrCreateCategoryFolder(parentFolder, data.kategoriLabel || data.kategori)
  const submissionFolder = getOrCreateSubmissionFolder(
    categoryFolder,
    data.referenceId,
    data.namaTim || data.ketua,
  )

  const files = data.files || {}
  const links = {}
  Object.keys(files).forEach(function (field) {
    const label = FILE_UPLOAD_LABEL[field] || field
    links[field] = uploadGroup(submissionFolder, label, files[field])
  })

  return { ok: true, links: links }
}

/**
 * TAHAP 2 — dipanggil dari /api/register (Next.js) setelah berkas selesai
 * diunggah di tahap 1. Payload di sini cuma teks + link, jadi kecil.
 * Input: { action:"submit", referenceId, kategori, kategoriLabel, namaTim,
 *          ketua, anggota1, anggota2, sekolah, kota, telepon, email,
 *          fileLinks: { fieldName: ["url", ...] } }
 */
function handleSubmit(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const sheet = ss.getSheetByName(SHEET_NAME)
  if (!sheet) {
    throw new Error('Tab bernama "' + SHEET_NAME + '" tidak ditemukan di spreadsheet ini.')
  }

  const links = data.fileLinks || {}
  function joined(field) {
    const arr = links[field] || []
    return arr.join("\n")
  }

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
    joined("abstrak"),
    joined("followIg"),
    joined("ktm"),
    joined("posterWa"),
    joined("posterIg"),
    joined("twibbon"),
    joined("buktiBayar"),
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
    JSON.stringify({ ok: true, message: "Apps Script pendaftaran aktif." }),
  ).setMimeType(ContentService.MimeType.JSON)
}
