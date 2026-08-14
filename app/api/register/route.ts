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
  telepon: z.string().min(8, "Nomor telepon tidak valid."),
  email: z.string().email("Format email tidak valid."),
  pakta: z.literal("true", { errorMap: () => ({ message: "Pakta integritas wajib disetujui." }) }),
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

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB per berkas

type EncodedFile = { name: string; mimeType: string; base64: string }

export async function POST(req: Request) {
  try {
    const scriptUrl = process.env.APPS_SCRIPT_URL
    if (!scriptUrl) {
      throw new Error("APPS_SCRIPT_URL belum diatur di environment variables.")
    }

    const formData = await req.formData()

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
