import { NextResponse } from "next/server"
import { z } from "zod"

export const runtime = "nodejs"
export const maxDuration = 60

const KATEGORI_LABEL: Record<string, string> = {
  essay: "Essay Auditphoria",
  policy: "Audit Policy",
  order: "Audit Order",
  infografis: "Audit Infografis",
}

const dataSchema = z.object({
  kategori: z.enum(["essay", "policy", "order", "infografis"], {
    errorMap: () => ({ message: "Kategori lomba tidak valid." }),
  }),
  namaTim: z.string().optional().default(""),
  ketua: z.string().min(2, "Nama ketua/peserta wajib diisi."),
  anggota1: z.string().optional().default(""),
  anggota2: z.string().optional().default(""),
  sekolah: z.string().min(2, "Asal sekolah/universitas wajib diisi."),
  kota: z.string().min(2, "Kota asal wajib diisi."),
  telepon: z
    .string()
    .min(8, "Nomor telepon minimal 8 karakter.")
    .regex(/^[0-9+\s-]{8,}$/, "Format nomor telepon tidak valid."),
  email: z.string().email("Format email tidak valid."),
  pakta: z.literal("true", { errorMap: () => ({ message: "Pakta integritas wajib disetujui." }) }),
  referenceId: z.string().optional().default(""),
})

const FILE_FIELDS = ["abstrak", "followIg", "ktm", "posterWa", "posterIg", "twibbon", "buktiBayar"] as const
const FILE_LABELS: Record<(typeof FILE_FIELDS)[number], string> = {
  abstrak: "Karya - Abstrak",
  followIg: "Bukti Follow IG",
  ktm: "KTM - Identitas",
  posterWa: "Bukti Share Poster WA",
  posterIg: "Bukti Share Poster IG",
  twibbon: "Bukti Upload Twibbon",
  buktiBayar: "Bukti Pembayaran",
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB per berkas — berlaku untuk SEMUA jenis berkas

// Minimal waktu (ms) antara form dimuat dan disubmit. Manusia butuh setidaknya
// beberapa detik untuk mengisi + upload banyak berkas; bot pengisi otomatis
// biasanya submit dalam hitungan milidetik.
const MIN_SUBMIT_TIME_MS = 4000

// Rate limit sederhana per-IP (best-effort, in-memory). Karena serverless function
// bisa "cold start" ulang atau berjalan di banyak instance paralel, ini BUKAN
// proteksi definitif — cukup untuk menahan bot naif yang spam dari 1 sumber.
// Untuk proteksi lebih andal di traffic tinggi, pertimbangkan Vercel KV / Upstash.
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000 // 10 menit
const RATE_LIMIT_MAX = 8 // maksimal 8 submit per IP per 10 menit
const rateLimitStore = new Map<string, number[]>()

function isRateLimited(ip: string) {
  const now = Date.now()
  const timestamps = (rateLimitStore.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
  timestamps.push(now)
  rateLimitStore.set(ip, timestamps)
  return timestamps.length > RATE_LIMIT_MAX
}

type EncodedFile = { name: string; mimeType: string; base64: string }

export async function POST(req: Request) {
  try {
    const scriptUrl = process.env.APPS_SCRIPT_URL
    if (!scriptUrl) {
      throw new Error("APPS_SCRIPT_URL belum diatur di environment variables.")
    }

    // --- Rate limit per IP ---
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

    const formData = await req.formData()

    // --- Anti-bot: honeypot ---
    // Field "website" disembunyikan dari manusia lewat CSS. Kalau terisi,
    // hampir pasti itu bot pengisi form otomatis. Ditolak diam-diam (tanpa
    // membocorkan alasan sebenarnya ke pemanggil, supaya bot tidak belajar).
    const honeypot = String(formData.get("website") ?? "")
    if (honeypot.trim() !== "") {
      return NextResponse.json({ ok: false, message: "Pendaftaran gagal dikirim. Coba lagi." }, { status: 400 })
    }

    // --- Anti-bot: waktu pengisian ---
    const formLoadedAt = Number(formData.get("formLoadedAt") ?? 0)
    if (formLoadedAt > 0 && Date.now() - formLoadedAt < MIN_SUBMIT_TIME_MS) {
      return NextResponse.json(
        { ok: false, message: "Pengisian terlalu cepat, silakan coba lagi." },
        { status: 400 },
      )
    }

    const raw = {
      kategori: String(formData.get("kategori") ?? ""),
      namaTim: String(formData.get("namaTim") ?? ""),
      ketua: String(formData.get("ketua") ?? ""),
      anggota1: String(formData.get("anggota1") ?? ""),
      anggota2: String(formData.get("anggota2") ?? ""),
      sekolah: String(formData.get("sekolah") ?? ""),
      kota: String(formData.get("kota") ?? ""),
      telepon: String(formData.get("telepon") ?? ""),
      email: String(formData.get("email") ?? ""),
      pakta: String(formData.get("pakta") ?? ""),
      referenceId: String(formData.get("referenceId") ?? ""),
    }

    const parsed = dataSchema.safeParse(raw)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Data belum lengkap."
      return NextResponse.json({ ok: false, message: firstError }, { status: 400 })
    }

    const filesPayload: Record<string, EncodedFile[]> = {}

    for (const field of FILE_FIELDS) {
      const files = formData.getAll(field).filter((f): f is File => f instanceof File && f.size > 0)

      if (files.length === 0) {
        return NextResponse.json(
          { ok: false, message: `Berkas "${FILE_LABELS[field]}" wajib diunggah.` },
          { status: 400 },
        )
      }

      const encoded: EncodedFile[] = []
      for (const file of files) {
        if (file.size > MAX_FILE_SIZE) {
          return NextResponse.json(
            { ok: false, message: `Ukuran berkas "${file.name}" melebihi 10MB.` },
            { status: 400 },
          )
        }
        const buffer = Buffer.from(await file.arrayBuffer())
        encoded.push({
          name: file.name,
          mimeType: file.type || "application/octet-stream",
          base64: buffer.toString("base64"),
        })
      }
      filesPayload[field] = encoded
    }

    const data = parsed.data

    const scriptRes = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        referenceId: data.referenceId,
        kategori: data.kategori,
        kategoriLabel: KATEGORI_LABEL[data.kategori] ?? data.kategori,
        namaTim: data.namaTim,
        ketua: data.ketua,
        anggota1: data.anggota1,
        anggota2: data.anggota2,
        sekolah: data.sekolah,
        kota: data.kota,
        telepon: data.telepon,
        email: data.email,
        files: filesPayload,
      }),
      redirect: "follow",
    })

    const text = await scriptRes.text()
    let result: { ok?: boolean; message?: string }
    try {
      result = JSON.parse(text)
    } catch {
      throw new Error("Respons dari Apps Script tidak valid. Cek apakah Web App sudah di-deploy dengan benar.")
    }

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, message: result.message ?? "Pendaftaran gagal dikirim." },
        { status: 502 },
      )
    }

    return NextResponse.json({ ok: true, message: result.message ?? "Pendaftaran berhasil dikirim." })
  } catch (error) {
    console.error("[/api/register]", error)
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan pada server. Coba lagi."
    return NextResponse.json({ ok: false, message }, { status: 500 })
  }
}
