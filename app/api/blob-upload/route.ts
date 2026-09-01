import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

// Field yang dipakai form pendaftaran saat ini: followIg, ktm, fotoDiri,
// twibbon, posterIg, buktiBayar — semuanya gambar/PDF berukuran wajar, jadi
// cukup pakai DEFAULT_LIMIT di bawah untuk semuanya (termasuk "fotoDiri"
// yang sekarang juga dipakai AICE, selain AEC & LCCA).
//
// FIELD_OVERRIDES disiapkan kalau suatu saat ada field lain yang butuh
// tipe/ukuran berbeda dari default (mis. upload audio/video besar). Tidak
// ada field seperti itu di form pendaftaran saat ini — berkas karya
// (essay/abstrak, reels IG, infografis, audio voice over) sudah dihapus
// total dari alur pendaftaran ini, jadi map ini sengaja dikosongkan.
const FIELD_OVERRIDES: Record<string, { allowedContentTypes: string[]; maximumSizeInBytes: number }> = {}

const DEFAULT_LIMIT = {
  allowedContentTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  maximumSizeInBytes: 10 * 1024 * 1024, // 10MB
}

// Endpoint ini TIDAK menerima file itu sendiri — cuma mengeluarkan izin
// (token) supaya browser boleh upload LANGSUNG ke Vercel Blob. Karena itu
// payload-nya selalu kecil dan tidak pernah kena limit 4.5MB milik Vercel
// Functions, walaupun file yang akhirnya diunggah berukuran puluhan/ratusan MB.
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody
  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        let field = ""
        try {
          if (clientPayload) field = (JSON.parse(clientPayload) as { field?: string }).field ?? ""
        } catch {
          // clientPayload tidak valid JSON — abaikan, pakai limit default
        }
        const limit = FIELD_OVERRIDES[field] ?? DEFAULT_LIMIT
        return {
          allowedContentTypes: limit.allowedContentTypes,
          addRandomSuffix: true,
          maximumSizeInBytes: limit.maximumSizeInBytes,
          tokenPayload: JSON.stringify({}),
        }
      },
      onUploadCompleted: async () => {
        // Tidak perlu aksi tambahan di sini — Apps Script yang akan
        // mengunduh & memindahkan berkas ini ke Drive setelah form disubmit.
      },
    })
    return NextResponse.json(jsonResponse)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal membuat token upload." },
      { status: 400 },
    )
  }
}
