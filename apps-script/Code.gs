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
 */

const SHEET_NAME = "Peserta"
const DRIVE_FOLDER_ID = "PASTE_FOLDER_ID_DRIVE_DI_SINI"

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents)

    const ss = SpreadsheetApp.getActiveSpreadsheet()
    const sheet = ss.getSheetByName(SHEET_NAME)
    if (!sheet) {
      throw new Error('Tab bernama "' + SHEET_NAME + '" tidak ditemukan di spreadsheet ini.')
    }

    const parentFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID)
    const submissionLabel =
      (data.namaTim || data.ketua || "Peserta") + " - " + Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd HHmmss")
    const subFolder = parentFolder.createFolder(submissionLabel)
    subFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW)

    function getExt(name) {
      if (!name) return ""
      const idx = name.lastIndexOf(".")
      return idx >= 0 ? name.substring(idx) : ""
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

    const files = data.files || {}
    const linkAbstrak = uploadGroup("Karya - Abstrak", files.abstrak)
    const linkFollowIg = uploadGroup("Bukti Follow IG", files.followIg)
    const linkKtm = uploadGroup("KTM - Identitas", files.ktm)
    const linkPosterWa = uploadGroup("Bukti Share Poster WA", files.posterWa)
    const linkPosterIg = uploadGroup("Bukti Share Poster IG", files.posterIg)
    const linkTwibbon = uploadGroup("Bukti Upload Twibbon", files.twibbon)
    const linkBuktiBayar = uploadGroup("Bukti Pembayaran", files.buktiBayar)

    sheet.appendRow([
      new Date(),
      data.kategoriLabel || data.kategori || "",
      data.namaTim || "",
      data.ketua || "",
      data.anggota1 || "",
      data.anggota2 || "",
      data.sekolah || "",
      data.kota || "",
      data.telepon || "",
      data.email || "",
      linkAbstrak.join("\n"),
      linkFollowIg.join("\n"),
      linkKtm.join("\n"),
      linkPosterWa.join("\n"),
      linkPosterIg.join("\n"),
      linkTwibbon.join("\n"),
      linkBuktiBayar.join("\n"),
    ])

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
