import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

// Endpoint ini TIDAK menerima file itu sendiri — cuma mengeluarkan izin
// (token) supaya browser boleh upload LANGSUNG ke Vercel Blob. Karena itu
// payload-nya selalu kecil dan tidak pernah kena limit 4.5MB milik Vercel
// Functions, walaupun file yang akhirnya diunggah berukuran puluhan MB.
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        // Form pendaftaran ini publik (tidak ada login), jadi kita tidak bisa
        // cek sesi user di sini. Pembatasan tipe & ukuran berkas di bawah ini
        // yang jadi pagar utamanya — nilainya dipaksakan di sisi server oleh
        // Vercel Blob sendiri, bukan cuma validasi di browser yang bisa dilewati.
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
          addRandomSuffix: true,
          maximumSizeInBytes: 10 * 1024 * 1024, // samakan dengan MAX_FILE_SIZE di form
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
