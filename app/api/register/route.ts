import { NextResponse } from "next/server"
import { z } from "zod"
import { del } from "@vercel/blob"

export const runtime = "nodejs"
export const maxDuration = 60

const KATEGORI_LABEL: Record<string, string> = {
  aec: "AEC - Audit Essay Competition",
  arc: "ARC - Audit Reels Competition",
  aice: "AICE - Audit Infografis Competition",
  avoc: "AVOC - Audit Voice Over Competition",
  lcca: "LCCA - Lomba Cerdas Cermat Audit",
}

const REQUIRED_FILE_FIELDS = ["followIg", "ktm", "twibbon", "buktiBayar"] as const

// Requirement berkas tambahan per kategori.
const KATEGORI_EXTRA_FILE_REQUIREMENTS: Record<string, string[]> = {
  aec: ["posterIg", "fotoDiri"],
  arc: [],
  aice: ["fotoDiri"],
  avoc: [],
  lcca: ["fotoDiri"],
}

const FILE_LABELS: Record<string, string> = {
  followIg: "Bukti Follow IG",
  ktm: "KTM - Identitas",
  fotoDiri: "Foto Diri Anggota",
  twibbon: "Bukti Upload Twibbon",
  posterIg: "Bukti Share Poster IG Story",
  buktiBayar: "Bukti Pembayaran",
}

const dataSchema = z.object({
  kategori: z.enum(["aec", "arc", "aice", "avoc", "lcca"], {
    errorMap: () => ({ message: "Kategori lomba tidak valid." }),
  }),
  namaTim: z.string().optional().default(""),
  ketua: z.string().min(2, "Nama ketua/peserta wajib diisi."),
  prodiKetua: z.string().optional().default(""),
  anggota1: z.string().optional().default(""),
  prodiAnggota1: z.string().optional().default(""),
  anggota2: z.string().optional().default(""),
  prodiAnggota2: z.string().optional().default(""),
  sekolah: z.string().min(2, "Asal sekolah/universitas wajib diisi."),
  kota: z.string().min(2, "Kota asal wajib diisi."),
  telepon: z
    .string()
    .min(8, "Nomor telepon minimal 8 karakter.")
    .regex(/^[0-9+\s-]{8,}$/, "Format nomor telepon tidak valid."),
  email: z.string().email("Format email tidak valid."),
  pakta: z.literal("true", { errorMap: () => ({ message: "Pakta integritas wajib disetujui." }) }),
  referenceId: z.string().optional().default(""),
  website: z.string().optional().default(""),
  formLoadedAt: z.number().optional().default(0),
  fileUrls: z.record(z.array(z.string())).optional().default({}),
})

const MIN_SUBMIT_TIME_MS = 4000
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT_MAX = 8
const rateLimitStore = new Map<string, number[]>()

const APPS_SCRIPT_TIMEOUT_MS = 45_000

function isRateLimited(ip: string) {
  const now = Date.now()
  const timestamps = (rateLimitStore.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
  timestamps.push(now)
  rateLimitStore.set(ip, timestamps)
  return timestamps.length > RATE_LIMIT_MAX
}

/**
 * Panggil Apps Script dengan timeout eksplisit lewat AbortController.
 * Melempar error dengan pesan yang membedakan penyebabnya (timeout vs
 * fetch gagal total vs lainnya) supaya gampang didiagnosis dari log Vercel.
 */
async function callAppsScript(scriptUrl: string, payload: unknown): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), APPS_SCRIPT_TIMEOUT_MS)

  try {
    const res = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      redirect: "follow",
      signal: controller.signal,
    })
    return res
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(
        `Apps Script tidak merespons dalam ${APPS_SCRIPT_TIMEOUT_MS / 1000} detik (timeout). ` +
          "Kemungkinan proses di Apps Script (mis. memindahkan banyak file ke Drive) memakan waktu " +
          "terlalu lama, atau Apps Script sedang tidak responsif.",
      )
    }
    throw new Error(`Gagal menghubungi Apps Script: ${err instanceof Error ? err.message : String(err)}`)
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function POST(req: Request) {
  // referenceId diambil di awal (sebelum try) supaya tetap bisa disertakan
  // di log error meski parsing body belum selesai.
  let referenceIdForLog = "(belum diketahui)"

  try {
    const scriptUrl = process.env.APPS_SCRIPT_URL
    if (!scriptUrl) {
      throw new Error("APPS_SCRIPT_URL belum diatur di environment variables.")
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown"
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { ok: false, message: "Terlalu banyak percobaan. Coba lagi dalam beberapa menit." },
        { status: 429 },
      )
    }

    const body = await req.json()
    referenceIdForLog = String(body?.referenceId ?? "(kosong)")

    const honeypot = String(body?.website ?? "")
    if (honeypot.trim() !== "") {
      return NextResponse.json({ ok: false, message: "Pendaftaran gagal dikirim. Coba lagi." }, { status: 400 })
    }

    const parsed = dataSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Data belum lengkap."
      return NextResponse.json({ ok: false, message: firstError }, { status: 400 })
    }

    const data = parsed.data

    if (data.formLoadedAt > 0 && Date.now() - data.formLoadedAt < MIN_SUBMIT_TIME_MS) {
      return NextResponse.json(
        { ok: false, message: "Pengisian terlalu cepat, silakan coba lagi." },
        { status: 400 },
      )
    }

    if (data.kategori === "lcca") {
      if (!data.namaTim.trim()) {
        return NextResponse.json(
          { ok: false, message: "LCCA wajib beregu — Nama Tim harus diisi." },
          { status: 400 },
        )
      }
      if (!data.anggota1.trim() || !data.anggota2.trim()) {
        return NextResponse.json(
          { ok: false, message: "LCCA wajib terdiri dari 3 orang — Nama Anggota 1 dan Anggota 2 harus diisi." },
          { status: 400 },
        )
      }
      // Program studi wajib untuk seluruh anggota LCCA — dipakai panitia untuk
      // memvalidasi ketentuan jurusan yang linier dengan Akuntansi dan sejenisnya.
      if (!data.prodiKetua.trim() || !data.prodiAnggota1.trim() || !data.prodiAnggota2.trim()) {
        return NextResponse.json(
          {
            ok: false,
            message: "LCCA wajib mengisi Program Studi untuk ketua tim dan seluruh anggota.",
          },
          { status: 400 },
        )
      }
    }

    const requiredFileFields = [...REQUIRED_FILE_FIELDS, ...(KATEGORI_EXTRA_FILE_REQUIREMENTS[data.kategori] ?? [])]
    for (const field of requiredFileFields) {
      const urls = data.fileUrls[field]
      if (!urls || urls.length === 0) {
        return NextResponse.json(
          { ok: false, message: `Berkas "${FILE_LABELS[field] ?? field}" wajib diunggah.` },
          { status: 400 },
        )
      }
    }

    const scriptStartedAt = Date.now()
    const scriptRes = await callAppsScript(scriptUrl, {
      referenceId: data.referenceId,
      kategori: data.kategori,
      kategoriLabel: KATEGORI_LABEL[data.kategori] ?? data.kategori,
      namaTim: data.namaTim,
      ketua: data.ketua,
      prodiKetua: data.prodiKetua,
      anggota1: data.anggota1,
      prodiAnggota1: data.prodiAnggota1,
      anggota2: data.anggota2,
      prodiAnggota2: data.prodiAnggota2,
      sekolah: data.sekolah,
      kota: data.kota,
      telepon: data.telepon,
      email: data.email,
      fileUrls: data.fileUrls,
    })
    const scriptDurationMs = Date.now() - scriptStartedAt

    const text = await scriptRes.text()

    // Log SELALU ditulis (bukan cuma pas gagal) supaya durasi & status code
    // asli dari Apps Script kelihatan di Vercel logs — ini yang paling
    // berguna buat bedain "beneran lambat" vs "permission/URL salah" vs
    // "Apps Script crash". Body dipotong biar log nggak kebanjiran kalau
    // Apps Script balikin HTML error page yang panjang.
    console.log("[/api/register] Apps Script response", {
      referenceId: referenceIdForLog,
      httpStatus: scriptRes.status,
      durationMs: scriptDurationMs,
      bodyPreview: text.slice(0, 500),
    })

    let result: { ok?: boolean; message?: string }
    try {
      result = JSON.parse(text)
    } catch {
      // Ini kondisi yang paling sering disalahartikan sebagai "belum
      // di-deploy". Cek dulu: apakah bodyPreview di log di atas berupa HTML
      // (mengandung "<html" atau "accounts.google.com")? Kalau iya, itu
      // tandanya permission "Who has access" BUKAN "Anyone" — bukan soal
      // deploy status.
      const looksLikeHtml = /<html|accounts\.google\.com/i.test(text)
      throw new Error(
        looksLikeHtml
          ? "Apps Script mengembalikan halaman HTML (kemungkinan login Google), bukan JSON. " +
            'Periksa setting deployment: "Who has access" harus "Anyone", bukan "Only myself" atau "Anyone with Google account".'
          : `Respons dari Apps Script bukan JSON valid (HTTP ${scriptRes.status}). ` +
            "Kemungkinan URL deployment sudah kadaluarsa (misalnya kalau pernah dibuat ulang lewat " +
            '"New deployment" alih-alih "Manage deployments > Edit > New version"), atau script-nya error/crash.',
      )
    }

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, message: result.message ?? "Pendaftaran gagal dikirim." },
        { status: 502 },
      )
    }

    const allBlobUrls = Object.values(data.fileUrls).flat()
    const deleteResults = await Promise.allSettled(allBlobUrls.map((url) => del(url)))
    const failedDeletes = deleteResults.filter((r) => r.status === "rejected").length
    if (failedDeletes > 0) {
      // Tidak fatal — file di Blob storage cuma jadi sampah kalau gagal
      // dihapus, tapi pendaftaran tetap sukses. Cukup dicatat.
      console.warn("[/api/register] Sebagian file Blob gagal dihapus", {
        referenceId: referenceIdForLog,
        failedDeletes,
        totalFiles: allBlobUrls.length,
      })
    }

    return NextResponse.json({ ok: true, message: result.message ?? "Pendaftaran berhasil dikirim." })
  } catch (error) {
    console.error("[/api/register] Gagal memproses pendaftaran", {
      referenceId: referenceIdForLog,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan pada server. Coba lagi."
    return NextResponse.json({ ok: false, message }, { status: 500 })
  }
}
