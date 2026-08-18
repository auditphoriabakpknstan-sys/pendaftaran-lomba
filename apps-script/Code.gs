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
 * 7. Tempel URL itu ke environment variable APPS_SCRIPT_URL di Vercel.
 *
 * Setiap submit otomatis dicatat 2x:
 * - Tab "Peserta" (master, berisi SEMUA peserta dari semua kategori)
 * - Tab sesuai nama kategori lombanya (dibuat otomatis kalau belum ada,
 *   header-nya ikut disalin dari tab Peserta)
 */

const SHEET_NAME = "Peserta"
const DRIVE_FOLDER_ID = "1nbNAChSpVAaSXwNm3R53Q20NGVwuiSA1"

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents)

    const ss = SpreadsheetApp.getActiveSpreadsheet()
    const sheet = ss.getSheetByName(SHEET_NAME)
    if (!sheet) {
      throw new Error('Tab bernama "' + SHEET_NAME + '" tidak ditemukan di spreadsheet ini.')
    }

    const parentFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID)

    /**
     * Ambil folder kategori di dalam folder utama. Kalau belum ada, buat baru.
     */
    function getOrCreateCategoryFolder(categoryName) {
      const safeName = String(categoryName || "Lainnya").replace(/[\\/:*?"<>|]+/g, "_").trim()
      const existing = parentFolder.getFoldersByName(safeName)
      if (existing.hasNext()) {
        return existing.next()
      }
      return parentFolder.createFolder(safeName)
    }

    const categoryFolder = getOrCreateCategoryFolder(data.kategoriLabel || data.kategori)

    const submissionLabel =
      (data.namaTim || data.ketua || "Peserta") + " - " + Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd HHmmss")
    const subFolder = categoryFolder.createFolder(submissionLabel)
    subFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW)

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

    function uploadGroup(label, filesArr) {
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
    function getOrCreateCategorySheet(categoryName) {
      if (!categoryName) return null
      // Nama tab di Google Sheets tidak boleh lebih dari 100 karakter
      // dan tidak boleh mengandung: [ ] * ? / \ :
      const safeName = String(categoryName).replace(/[\[\]*?\/\\:]/g, "").substring(0, 100)
      let categorySheet = ss.getSheetByName(safeName)
      if (!categorySheet) {
        categorySheet = ss.insertSheet(safeName)
        const lastCol = sheet.getLastColumn()
        if (lastCol > 0) {
          const headerValues = sheet.getRange(1, 1, 1, lastCol).getValues()
          categorySheet.getRange(1, 1, 1, lastCol).setValues(headerValues)
          categorySheet.setFrozenRows(1)
        }
      }
      return categorySheet
    }

    const files = data.files || {}
    const linkAbstrak = uploadGroup("Karya - Abstrak", files.abstrak)
    const linkFollowIg = uploadGroup("Bukti Follow IG", files.followIg)
    const linkKtm = uploadGroup("KTM - Identitas", files.ktm)
    const linkPosterWa = uploadGroup("Bukti Share Poster WA", files.posterWa)
    const linkPosterIg = uploadGroup("Bukti Share Poster IG", files.posterIg)
    const linkTwibbon = uploadGroup("Bukti Upload Twibbon", files.twibbon)
    const linkBuktiBayar = uploadGroup("Bukti Pembayaran", files.buktiBayar)

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
    const categorySheet = getOrCreateCategorySheet(data.kategoriLabel || data.kategori)
    if (categorySheet) {
      categorySheet.appendRow(row)
    }

    return ContentService.createTextOutput(
      JSON.stringify({ ok: true, message: "Pendaftaran berhasil dikirim." }),
    ).setMimeType(ContentService.MimeType.JSON)
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, message: String(err) }),
    ).setMimeType(ContentService.MimeType.JSON)
  }
}

/** Buka URL Web App langsung di browser untuk memastikan script sudah aktif */
function doGet() {
  return ContentService.createTextOutput(
    JSON.stringify({ ok: true, message: "Apps Script pendaftaran aktif." }),
  ).setMimeType(ContentService.MimeType.JSON)
}
