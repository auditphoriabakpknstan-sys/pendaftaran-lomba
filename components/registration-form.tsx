"use client"

import type React from "react"

import { useState, useRef, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import {
  User,
  Users,
  Mail,
  Phone,
  Building2,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  ScrollText,
  Video,
  Mic,
  BrainCircuit,
  AtSign,
  IdCard,
  GraduationCap,
  MessageCircle,
  Image as ImageIcon,
  Palette,
  UserRound,
  Upload,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  X,
  Plus,
  Clock,
  Loader2,
  ExternalLink,
  BookOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"

/* =========================================================================
 * KONFIGURASI CABANG LOMBA
 * =========================================================================
 * Ubah/tambah lomba dari SATU tempat ini. Setiap lomba (kategori) punya:
 * - timMode: "solo" (perorangan saja) | "opsional" (boleh sendiri/tim) | "wajib" (harus tim)
 * - butuhPosterIg: khusus AEC — wajib unggah bukti share poster di IG Story
 * - butuhFotoDiri: khusus AEC & LCCA — wajib unggah foto diri tiap anggota
 *
 * CATATAN REVISI: Berkas/link karya (upload essay/abstrak, link reels IG,
 * infografis, audio voice over) DIHAPUS TOTAL dari form pendaftaran ini.
 * Berkas umum yang WAJIB untuk SEMUA kategori: Bukti Follow IG, KTM,
 * Bukti Upload Twibbon, Bukti Pembayaran. Di luar itu ada dua berkas
 * tambahan yang hanya wajib untuk kategori tertentu (lihat flag di atas).
 * ========================================================================= */

type KategoriValue = "aec" | "arc" | "aice" | "avoc" | "lcca" | ""
type TimMode = "solo" | "opsional" | "wajib"

type KategoriConfig = {
  value: Exclude<KategoriValue, "">
  code: string
  label: string
  desc: string
  timMode: TimMode
  icon: React.ReactNode
  /** Khusus AEC: wajib unggah bukti share poster di IG Story. */
  butuhPosterIg?: boolean
  /** Khusus AEC, AICE & LCCA: wajib unggah foto diri masing-masing anggota. */
  butuhFotoDiri?: boolean
  /** Khusus LCCA: wajib isi program studi tiap peserta (validasi linieritas jurusan). */
  butuhProdi?: boolean
}

const kategoriList: KategoriConfig[] = [
  {
    value: "aec",
    code: "AEC",
    label: "Audit Essay Competition",
    desc: "Kompetisi menulis esai bertema audit — individu atau tim",
    timMode: "opsional",
    icon: <ScrollText className="size-5" aria-hidden="true" />,
    butuhPosterIg: true,
    butuhFotoDiri: true,
  },
  {
    value: "arc",
    code: "ARC",
    label: "Audit Reels Competition",
    desc: "Kompetisi reels Instagram bertema audit — individu atau tim, maksimal 3 orang",
    timMode: "opsional",
    icon: <Video className="size-5" aria-hidden="true" />,
  },
  {
    value: "aice",
    code: "AICE",
    label: "Audit Infografis Competition",
    desc: "Kompetisi desain infografis bertema audit — perorangan",
    timMode: "solo",
    icon: <Palette className="size-5" aria-hidden="true" />,
    butuhFotoDiri: true,
  },
  {
    value: "avoc",
    code: "AVOC",
    label: "Audit Voice Over Competition",
    desc: "Kompetisi voice over bertema audit — perorangan",
    timMode: "solo",
    icon: <Mic className="size-5" aria-hidden="true" />,
  },
  {
    value: "lcca",
    code: "LCCA",
    label: "Lomba Cerdas Cermat Audit",
    desc: "Cerdas cermat bertema audit — wajib tim",
    timMode: "wajib",
    icon: <BrainCircuit className="size-5" aria-hidden="true" />,
    butuhFotoDiri: true,
    butuhProdi: true,
  },
]

function getKategoriConfig(value: KategoriValue): KategoriConfig | null {
  return kategoriList.find((k) => k.value === value) ?? null
}

/** Peta kode pendek (dipakai di URL deep-link dari Google Sites) -> value internal. */
const CODE_TO_VALUE: Record<string, Exclude<KategoriValue, "">> = {
  aec: "aec",
  arc: "arc",
  aice: "aice",
  avoc: "avoc",
  lcca: "lcca",
}

/**
 * Narahubung (contact person) khusus tiap cabang lomba — ditampilkan di
 * footer form, otomatis berganti sesuai kategori yang sedang aktif.
 * Nomor WA disimpan tanpa "+" dan tanpa spasi (format wa.me), nama tampilan
 * boleh pakai format bebas.
 */
const KATEGORI_CONTACT: Record<Exclude<KategoriValue, "">, { nama: string; whatsapp: string }> = {
  aec: { nama: "Tira", whatsapp: "6285254131680" },
  arc: { nama: "Wahyu", whatsapp: "6285928106351" },
  aice: { nama: "Nasywa", whatsapp: "6282350128556" },
  avoc: { nama: "Thania", whatsapp: "6289671315301" },
  lcca: { nama: "Nazhila", whatsapp: "6289668665861" },
}

/**
 * Link lanjutan (grup WhatsApp / info lomba) khusus tiap cabang — ditampilkan
 * di halaman terakhir setelah pendaftaran berhasil, sesuai kategori yang
 * didaftarkan peserta.
 */
const KATEGORI_LINK: Record<Exclude<KategoriValue, "">, string> = {
  aec: "http://staner.id/AECAuditphoria6",
  arc: "http://staner.id/ARCAuditphoria6",
  aice: "http://staner.id/AICEAuditphoria6",
  avoc: "http://staner.id/WAGAVOCAuditphoria6",
  lcca: "http://staner.id/WAGLCCAAuditphoria6",
}

/**
 * Link handbook (panduan lomba) per kategori, disimpan di Google Drive —
 * ditampilkan sebagai tombol di header form supaya peserta bisa cek aturan
 * lomba kapan saja sebelum/selama mengisi form.
 */
const KATEGORI_HANDBOOK: Record<Exclude<KategoriValue, "">, string> = {
  aec: "https://drive.google.com/file/d/1F3liIEGXGQDh3SY1OqBg6G_quGHKUd6j/view?usp=drive_link",
  arc: "https://drive.google.com/file/d/1p-eRC9IFwjpETV1wIOI50f8rSdGvgsHa/view?usp=drive_link",
  aice: "https://drive.google.com/file/d/1VQOsZ9AJiquNiyK94SRgn1INXyWeMK8K/view?usp=drive_link",
  avoc: "https://drive.google.com/file/d/1FxMyDIofGVwjVV_SxmyeU5v1iCPxQ3p-/view?usp=drive_link",
  lcca: "https://drive.google.com/file/d/13ZdbhB1BwxdamoJtMhP3EMK5jZTVXVLk/view?usp=drive_link",
}

type FormState = {
  namaTim: string
  ketua: string
  prodiKetua: string
  anggota1: string
  prodiAnggota1: string
  anggota2: string
  prodiAnggota2: string
  sekolah: string
  kota: string
  telepon: string
  email: string
  pakta: boolean
  kategori: KategoriValue
}

/** Satu slot berkas: bisa lagi diunggah, sudah selesai (ada url), atau gagal (ada error). */
type FileSlot = {
  id: string
  name: string
  size: number
  url?: string
  uploading: boolean
  error?: string
}

type FileState = {
  followIg: FileSlot[]
  ktm: FileSlot[]
  fotoDiri: FileSlot[]
  twibbon: FileSlot[]
  /** Khusus kategori AEC — bukti share poster di IG Story. */
  posterIg: FileSlot[]
  buktiBayar: FileSlot[]
}

const initialForm: FormState = {
  namaTim: "",
  ketua: "",
  prodiKetua: "",
  anggota1: "",
  prodiAnggota1: "",
  anggota2: "",
  prodiAnggota2: "",
  sekolah: "",
  kota: "",
  telepon: "",
  email: "",
  pakta: false,
  kategori: "",
}

const initialFiles: FileState = {
  followIg: [],
  ktm: [],
  fotoDiri: [],
  twibbon: [],
  posterIg: [],
  buktiBayar: [],
}

const MAX_BUKTI = 3
// Follow IG kadang perlu lebih dari satu akun (misalnya follow dari akun
// pribadi + akun organisasi/komunitas), jadi batasnya dibuat lebih longgar.
const MAX_FOLLOW_IG = 6
const MAX_BAYAR = 5
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

/**
 * Jadwal pendaftaran per kategori, dibagi jadi beberapa batch. Peserta bisa
 * daftar kapan saja SELAMA waktu sekarang berada di dalam salah satu batch
 * di bawah — di luar itu (sebelum batch 1 mulai, atau setelah batch
 * terakhir berakhir) pendaftaran otomatis dianggap tutup.
 * Format tanggal: "YYYY-MM-DDTHH:mm:ss" (waktu lokal WIB).
 */
type Batch = { label: string; start: string; end: string }

const kategoriBatches: Record<Exclude<KategoriValue, "">, Batch[]> = {
  aec: [
    { label: "Batch 1", start: "2026-08-30T00:00:00", end: "2026-09-14T23:59:59" },
    { label: "Batch 2", start: "2026-09-15T00:00:00", end: "2026-10-05T23:59:59" },
    { label: "Batch 3", start: "2026-10-06T00:00:00", end: "2026-10-19T23:59:59" },
  ],
  lcca: [
    { label: "Batch 1", start: "2026-08-30T00:00:00", end: "2026-09-14T23:59:59" },
    { label: "Batch 2", start: "2026-09-15T00:00:00", end: "2026-10-05T23:59:59" },
    { label: "Batch 3", start: "2026-10-06T00:00:00", end: "2026-10-19T23:59:59" },
  ],
  aice: [
    { label: "Batch 1", start: "2026-08-30T00:00:00", end: "2026-09-14T23:59:59" },
    { label: "Batch 2", start: "2026-09-15T00:00:00", end: "2026-10-05T23:59:59" },
    { label: "Batch 3", start: "2026-10-06T00:00:00", end: "2026-10-19T23:59:59" },
  ],
  arc: [
    { label: "Batch 1", start: "2026-08-30T00:00:00", end: "2026-09-14T23:59:59" },
    { label: "Batch 2", start: "2026-09-15T00:00:00", end: "2026-10-12T23:59:59" },
  ],
  avoc: [
    { label: "Batch 1", start: "2026-08-30T00:00:00", end: "2026-09-14T23:59:59" },
    { label: "Batch 2", start: "2026-09-15T00:00:00", end: "2026-10-05T23:59:59" },
    { label: "Batch 3", start: "2026-10-06T00:00:00", end: "2026-10-19T23:59:59" },
  ],
}

const PHONE_REGEX = /^[0-9+\s-]{8,}$/

const steps = ["Data Peserta", "Berkas", "Pembayaran", "Review"]

// Info rekening pembayaran — dipakai SAMA untuk semua kategori lomba.
const BANKS = [
  {
    key: "cimb",
    bank: "CIMB Niaga",
    norek: "707050694500",
    atasNama: "Shania Jeanine",
    logo: "/images/bank-cimb-niaga.png",
  },
  {
    key: "seabank",
    bank: "SeaBank",
    norek: "901475519477",
    atasNama: "Shania Jeanine",
    logo: "/images/bank-seabank.png",
  },
] as const

const DRAFT_STORAGE_KEY = "auditphoria-form-draft"
const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000 // draft basi setelah 24 jam

// File diunggah ke Vercel Blob dulu begitu dipilih, baru dipindah ke Drive
// lewat Apps Script secara server-ke-server saat submit, supaya tidak kena
// limit ukuran request 4.5MB milik Vercel Functions maupun isu CORS Apps
// Script.
async function uploadFileToBlob(field: string, file: File, referenceId: string): Promise<string> {
  const { upload } = await import("@vercel/blob/client")
  const blob = await upload(`pendaftaran/${referenceId}/${field}-${Date.now()}-${file.name}`, file, {
    access: "public",
    handleUploadUrl: "/api/blob-upload",
    clientPayload: JSON.stringify({ field }),
  })
  return blob.url
}

function generateReferenceId(prefix: string) {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase()
  const date = new Date()
  const y = date.getFullYear().toString().slice(-2)
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${prefix}-${y}${m}${d}-${rand}`
}

function makeFileSlot(file: File): FileSlot {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: file.name,
    size: file.size,
    uploading: true,
  }
}

/** Cuma slot yang benar-benar selesai diunggah (ada url) yang aman disimpan ke draft. */
function sanitizeFilesForDraft(files: FileState): FileState {
  const clean = (list: FileSlot[]) => list.filter((f) => !f.uploading && !!f.url)
  return {
    followIg: clean(files.followIg),
    ktm: clean(files.ktm),
    fotoDiri: clean(files.fotoDiri),
    twibbon: clean(files.twibbon),
    posterIg: clean(files.posterIg),
    buktiBayar: clean(files.buktiBayar),
  }
}

function hasPendingUploads(files: FileState) {
  return [files.followIg, files.ktm, files.fotoDiri, files.twibbon, files.posterIg, files.buktiBayar].some((list) =>
    list.some((f) => f.uploading),
  )
}

/**
 * Hitung persentase kelengkapan pengisian form (data + berkas wajib sesuai
 * kategori). Dipakai untuk banner "progres dipulihkan".
 */
function calculateProgress(form: FormState, files: FileState, kategoriConfig: KategoriConfig | null): number {
  if (!kategoriConfig) return 0
  const timWajib = kategoriConfig.timMode === "wajib"

  const dataChecks: boolean[] = [
    !!form.ketua.trim(),
    !!form.sekolah.trim(),
    !!form.kota.trim(),
    !!form.telepon.trim(),
    !!form.email.trim(),
    form.pakta,
  ]
  if (timWajib) {
    dataChecks.push(!!form.namaTim.trim(), !!form.anggota1.trim(), !!form.anggota2.trim())
  }
  if (kategoriConfig.butuhProdi) {
    dataChecks.push(!!form.prodiKetua.trim())
    if (timWajib) dataChecks.push(!!form.prodiAnggota1.trim(), !!form.prodiAnggota2.trim())
  }

  const fileChecks: boolean[] = [
    files.followIg.length > 0,
    files.ktm.length > 0,
    files.twibbon.length > 0,
    files.buktiBayar.length > 0,
  ]
  if (kategoriConfig.butuhFotoDiri) fileChecks.push(files.fotoDiri.length > 0)
  if (kategoriConfig.butuhPosterIg) fileChecks.push(files.posterIg.length > 0)

  const all = [...dataChecks, ...fileChecks]
  if (all.length === 0) return 0
  const done = all.filter(Boolean).length
  return Math.round((done / all.length) * 100)
}

type Draft = {
  referenceId: string
  form: FormState
  files: FileState
  savedAt: number
}

function draftKey(kategori: KategoriValue) {
  return `${DRAFT_STORAGE_KEY}-${kategori || "umum"}`
}

function loadDraft(kategori: KategoriValue): Draft | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(draftKey(kategori))
    if (!raw) return null
    const draft = JSON.parse(raw) as Partial<Draft>
    if (!draft.savedAt || Date.now() - draft.savedAt > DRAFT_MAX_AGE_MS) return null
    if (!draft.referenceId || !draft.form) return null

    // PENTING: draft lama (dari versi kode sebelumnya, atau localStorage yang
    // korup) bisa punya struktur "files" yang tidak lengkap / bukan array.
    // Kalau langsung dipakai apa adanya, pemanggilan .map()/.filter() di
    // tempat lain akan crash. Jadi di sini kita paksa semua field jadi array
    // yang valid — fallback ke array kosong kalau bentuknya tidak sesuai.
    const rawFiles = draft.files as Partial<FileState> | undefined
    const safeFiles: FileState = {
      followIg: Array.isArray(rawFiles?.followIg) ? rawFiles.followIg : [],
      ktm: Array.isArray(rawFiles?.ktm) ? rawFiles.ktm : [],
      fotoDiri: Array.isArray(rawFiles?.fotoDiri) ? rawFiles.fotoDiri : [],
      twibbon: Array.isArray(rawFiles?.twibbon) ? rawFiles.twibbon : [],
      posterIg: Array.isArray(rawFiles?.posterIg) ? rawFiles.posterIg : [],
      buktiBayar: Array.isArray(rawFiles?.buktiBayar) ? rawFiles.buktiBayar : [],
    }

    return {
      referenceId: draft.referenceId,
      form: { ...initialForm, ...draft.form },
      files: safeFiles,
      savedAt: draft.savedAt,
    }
  } catch {
    return null
  }
}

function saveDraft(kategori: KategoriValue, draft: Draft) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(draftKey(kategori), JSON.stringify(draft))
  } catch {
    // storage penuh / private browsing — abaikan, tidak fatal
  }
}

function clearDraft(kategori: KategoriValue) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(draftKey(kategori))
  } catch {
    // abaikan
  }
}

/**
 * Wrapper luar: baca parameter URL (?kategori=aec dst) di dalam Suspense,
 * seperti disyaratkan Next.js untuk useSearchParams pada Client Component.
 */
export function RegistrationForm() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <RegistrationFormInner />
    </Suspense>
  )
}

function FormSkeleton() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 md:py-16">
      <div className="h-64 animate-pulse rounded-3xl border border-border bg-card" />
    </div>
  )
}

function RegistrationFormInner() {
  const searchParams = useSearchParams()

  // Kategori diambil dari URL (?kategori=aec) — dikunci, TIDAK bisa diganti manual dari
  // dalam form. Kalau parameter tidak ada / tidak valid, tampilkan halaman pilih lomba
  // manual sebagai fallback supaya link lama / akses langsung tetap bisa dipakai.
  const kategoriFromUrl = (searchParams.get("kategori") || "").toLowerCase()
  const lockedKategori: KategoriValue = CODE_TO_VALUE[kategoriFromUrl] ?? ""
  const [manualKategori, setManualKategori] = useState<KategoriValue>("")
  const activeKategori: KategoriValue = lockedKategori || manualKategori
  const kategoriConfig = getKategoriConfig(activeKategori)

  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>({ ...initialForm, kategori: activeKategori })
  const [files, setFiles] = useState<FileState>(initialFiles)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [copiedBank, setCopiedBank] = useState<string | null>(null)
  const [referenceId, setReferenceId] = useState<string>(() => generateReferenceId(kategoriConfig?.code || "AUD6"))
  const [honeypot, setHoneypot] = useState("")
  const [draftRestored, setDraftRestored] = useState(false)
  const formLoadedAt = useRef(Date.now())
  const submittingRef = useRef(false)

  // Hook batch status dipanggil TANPA SYARAT di sini (sebelum early return
  // apa pun) supaya urutan Hooks React selalu konsisten di setiap render.
  const batchStatus = useBatchStatus(kategoriConfig ? kategoriBatches[kategoriConfig.value] : [])

  // Pulihkan draft (kalau ada & belum basi) — HANYA di client, supaya tidak
  // bentrok dengan hasil render server (hydration).
  useEffect(() => {
    if (!activeKategori) return
    const draft = loadDraft(activeKategori)
    if (draft) {
      setReferenceId(draft.referenceId)
      setForm({ ...draft.form, kategori: activeKategori })
      setFiles(draft.files)
      setDraftRestored(true)
    } else {
      setForm((prev) => ({ ...prev, kategori: activeKategori }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKategori])

  // Simpan draft setiap kali data berubah
  useEffect(() => {
    if (!activeKategori) return
    const isEmpty =
      !form.ketua.trim() &&
      files.followIg.length === 0 &&
      files.ktm.length === 0 &&
      files.fotoDiri.length === 0 &&
      files.twibbon.length === 0 &&
      files.buktiBayar.length === 0
    if (isEmpty) return

    saveDraft(activeKategori, {
      referenceId,
      form,
      files: sanitizeFilesForDraft(files),
      savedAt: Date.now(),
    })
  }, [form, files, referenceId, activeKategori])

  const timMode = kategoriConfig?.timMode ?? "solo"
  const isTim = timMode !== "solo"
  const timWajib = timMode === "wajib"

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: "" }))
  }

  function selectMulti(key: keyof FileState, incoming: File[], maxFiles: number) {
    setErrors((prev) => ({ ...prev, [key]: "" }))

    const currentCount = files[key].length
    const room = Math.max(maxFiles - currentCount, 0)
    const candidates = incoming.slice(0, room)

    const oversized = candidates.find((f) => f.size > MAX_FILE_SIZE)
    const valid = candidates.filter((f) => f.size <= MAX_FILE_SIZE)
    if (oversized) {
      setErrors((prev) => ({ ...prev, [key]: `Berkas "${oversized.name}" melebihi 10MB, dilewati` }))
    }
    if (valid.length === 0) return

    const slots = valid.map(makeFileSlot)
    setFiles((prev) => ({ ...prev, [key]: [...prev[key], ...slots] }))

    slots.forEach((slot, i) => {
      const file = valid[i]
      uploadFileToBlob(key, file, referenceId)
        .then((url) => {
          setFiles((prev) => ({
            ...prev,
            [key]: prev[key].map((s) => (s.id === slot.id ? { ...s, uploading: false, url } : s)),
          }))
        })
        .catch((err: unknown) => {
          setFiles((prev) => ({ ...prev, [key]: prev[key].filter((s) => s.id !== slot.id) }))
          setErrors((prev) => ({
            ...prev,
            [key]: err instanceof Error ? `Gagal unggah "${file.name}": ${err.message}` : `Gagal mengunggah "${file.name}", coba lagi.`,
          }))
        })
    })
  }

  function removeMulti(key: keyof FileState, index: number) {
    setFiles((prev) => ({ ...prev, [key]: prev[key].filter((_, i) => i !== index) }))
  }

  function goTo(next: number) {
    setStep(next)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function scrollToError() {
    requestAnimationFrame(() => {
      document.querySelector("[data-error='true']")?.scrollIntoView({ behavior: "smooth", block: "center" })
    })
  }

  function validateData() {
    const next: Record<string, string> = {}
    if (timWajib && !form.namaTim.trim()) next.namaTim = "Nama tim wajib diisi"
    if (!form.ketua.trim()) next.ketua = isTim ? "Nama ketua tim wajib diisi" : "Nama peserta wajib diisi"
    if (kategoriConfig?.butuhProdi && !form.prodiKetua.trim())
      next.prodiKetua = isTim ? "Program studi ketua tim wajib diisi" : "Program studi wajib diisi"
    if (timWajib && !form.anggota1.trim()) next.anggota1 = "Nama anggota 1 wajib diisi — tim harus terdiri dari 3 orang"
    if (timWajib && kategoriConfig?.butuhProdi && !form.prodiAnggota1.trim())
      next.prodiAnggota1 = "Program studi anggota 1 wajib diisi"
    if (timWajib && !form.anggota2.trim()) next.anggota2 = "Nama anggota 2 wajib diisi — tim harus terdiri dari 3 orang"
    if (timWajib && kategoriConfig?.butuhProdi && !form.prodiAnggota2.trim())
      next.prodiAnggota2 = "Program studi anggota 2 wajib diisi"
    if (!form.sekolah.trim()) next.sekolah = "Asal sekolah/universitas wajib diisi"
    if (!form.kota.trim()) next.kota = "Kota asal wajib diisi"
    if (!form.telepon.trim()) next.telepon = "Nomor telepon wajib diisi"
    else if (!PHONE_REGEX.test(form.telepon.trim())) next.telepon = "Nomor telepon minimal 8 karakter dan hanya boleh angka"
    if (!form.email.trim()) next.email = "Email wajib diisi"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = "Format email tidak valid"
    if (!form.pakta) next.pakta = "Anda harus menyetujui pakta integritas"
    setErrors(next)
    if (Object.keys(next).length > 0) scrollToError()
    return Object.keys(next).length === 0
  }

  function validateFiles() {
    const next: Record<string, string> = {}
    if (!kategoriConfig) return false

    if (files.followIg.length === 0) next.followIg = "Bukti follow Instagram wajib diunggah"
    if (files.ktm.length === 0) next.ktm = "Scan KTM/identitas mahasiswa wajib diunggah"
    if (kategoriConfig.butuhFotoDiri && files.fotoDiri.length === 0) {
      next.fotoDiri = "Foto diri masing-masing anggota wajib diunggah"
    }
    if (files.twibbon.length === 0) next.twibbon = "Bukti upload twibbon wajib diunggah"
    if (kategoriConfig.butuhPosterIg && files.posterIg.length === 0) {
      next.posterIg = "Bukti share poster di IG Story wajib diunggah"
    }
    setErrors(next)
    if (Object.keys(next).length > 0) scrollToError()
    return Object.keys(next).length === 0
  }

  function pickKategoriManual(value: Exclude<KategoriValue, "">) {
    setManualKategori(value)
  }

  function handleNextData() {
    if (validateData()) goTo(1)
  }

  function handleNextFiles() {
    if (validateFiles()) goTo(2)
  }

  /** Validasi bukti pembayaran, lalu lanjut ke halaman Review (bukan langsung submit). */
  function handleNextBayar() {
    if (files.buktiBayar.length === 0) {
      setErrors({ buktiBayar: "Bukti pembayaran wajib diunggah" })
      scrollToError()
      return
    }
    if (hasPendingUploads(files)) {
      setSubmitError("Masih ada berkas yang sedang diunggah. Tunggu sebentar sampai semua selesai, lalu coba lagi.")
      return
    }
    setSubmitError("")
    goTo(3)
  }

  async function handleSubmit() {
    if (!kategoriConfig) return
    if (files.buktiBayar.length === 0) {
      setErrors({ buktiBayar: "Bukti pembayaran wajib diunggah" })
      goTo(2)
      return
    }

    if (hasPendingUploads(files)) {
      setSubmitError("Masih ada berkas yang sedang diunggah. Tunggu sebentar sampai semua selesai, lalu coba lagi.")
      return
    }

    if (submittingRef.current || submitting) return
    submittingRef.current = true

    setSubmitting(true)
    setSubmitError("")

    try {
      const fileUrls: Record<string, string[]> = {
        followIg: files.followIg.map((f) => f.url).filter((u): u is string => !!u),
        ktm: files.ktm.map((f) => f.url).filter((u): u is string => !!u),
        fotoDiri: files.fotoDiri.map((f) => f.url).filter((u): u is string => !!u),
        twibbon: files.twibbon.map((f) => f.url).filter((u): u is string => !!u),
        posterIg: files.posterIg.map((f) => f.url).filter((u): u is string => !!u),
        buktiBayar: files.buktiBayar.map((f) => f.url).filter((u): u is string => !!u),
      }

      const fieldLabel: Record<string, string> = {
        followIg: "Bukti Follow IG",
        ktm: "KTM/Identitas",
        fotoDiri: "Foto Diri Anggota",
        twibbon: "Bukti Upload Twibbon",
        posterIg: "Bukti Share Poster IG Story",
        buktiBayar: "Bukti Pembayaran",
      }
      const requiredFields = ["followIg", "ktm", "twibbon", "buktiBayar"]
      if (kategoriConfig.butuhFotoDiri) requiredFields.push("fotoDiri")
      if (kategoriConfig.butuhPosterIg) requiredFields.push("posterIg")
      const missingFields = requiredFields.filter((f) => !fileUrls[f]?.length)
      if (missingFields.length > 0) {
        throw new Error(`Berkas "${missingFields.map((f) => fieldLabel[f] ?? f).join(", ")}" belum terunggah.`)
      }

      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kategori: kategoriConfig.value,
          namaTim: form.namaTim,
          ketua: form.ketua,
          prodiKetua: form.prodiKetua,
          anggota1: form.anggota1,
          prodiAnggota1: form.prodiAnggota1,
          anggota2: form.anggota2,
          prodiAnggota2: form.prodiAnggota2,
          sekolah: form.sekolah,
          kota: form.kota,
          telepon: form.telepon,
          email: form.email,
          pakta: String(form.pakta),
          referenceId,
          website: honeypot,
          formLoadedAt: formLoadedAt.current,
          fileUrls,
        }),
      })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        setSubmitError(data.message ?? "Pendaftaran gagal dikirim. Coba lagi.")
        setSubmitting(false)
        submittingRef.current = false
        return
      }

      clearDraft(activeKategori)
      setSubmitted(true)
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (err) {
      setSubmitError(
        err instanceof Error && err.message
          ? err.message
          : "Tidak dapat terhubung ke server. Periksa koneksi internet Anda dan coba lagi.",
      )
      submittingRef.current = false
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    clearDraft(activeKategori)
    setForm({ ...initialForm, kategori: activeKategori })
    setFiles(initialFiles)
    setErrors({})
    setStep(0)
    setSubmitted(false)
    setReferenceId(generateReferenceId(kategoriConfig?.code || "AUD6"))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function copyNorek(key: string, norek: string) {
    try {
      await navigator.clipboard.writeText(norek)
      setCopiedBank(key)
      setTimeout(() => setCopiedBank(null), 2000)
    } catch {
      // abaikan
    }
  }

  // --- Tidak ada kategori terkunci dari URL & belum pilih manual -> tampilkan pemilih lomba ---
  if (!activeKategori || !kategoriConfig) {
    return <KategoriPicker onPick={pickKategoriManual} />
  }

  if (submitted) {
    return (
      <SuccessScreen
        form={form}
        kategoriConfig={kategoriConfig}
        onReset={reset}
      />
    )
  }

  if (batchStatus.state === "closed") {
    return <PendaftaranDitutup kategoriConfig={kategoriConfig} />
  }
  if (batchStatus.state === "upcoming") {
    return <PendaftaranBelumDibuka kategoriConfig={kategoriConfig} text={batchStatus.text} />
  }

  const countdownText = batchStatus.text
  const contact = KATEGORI_CONTACT[kategoriConfig.value]
  const progress = calculateProgress(form, files, kategoriConfig)

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 md:py-16">
      {draftRestored && step === 0 && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-card/95 p-4 shadow-lg shadow-black/20 backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <p className="text-sm text-foreground">
            Progres pengisian sebelumnya untuk lomba ini berhasil dipulihkan, termasuk berkas yang telah selesai
            diunggah.
          </p>
          <button
            type="button"
            onClick={() => setDraftRestored(false)}
            aria-label="Tutup"
            className="inline-flex shrink-0 items-center justify-center rounded-lg px-2 py-1.5 text-muted-foreground transition-all duration-200 hover:scale-110 hover:bg-secondary hover:text-foreground"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      )}
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-xl shadow-primary/5">
        {/* Header */}
        <header className="relative overflow-hidden bg-primary px-6 py-8 md:px-10">
          <div className="absolute -right-8 -top-8 size-40 rounded-full bg-primary-foreground/10" aria-hidden="true" />
          <div className="absolute -bottom-12 -left-6 size-40 rounded-full bg-accent/20" aria-hidden="true" />
          <div className="relative flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-semibold text-primary-foreground">
                  <ShieldCheck className="size-3.5" aria-hidden="true" />
                  Pendaftaran Dibuka
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                  <Clock className="size-3.5" aria-hidden="true" />
                  {countdownText}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                    {kategoriConfig.icon}
                  </div>
                  <div className="min-w-0">
                    <h1 className="font-heading text-2xl font-bold leading-tight text-primary-foreground text-balance md:text-3xl">
                      {kategoriConfig.code}
                    </h1>
                    <p className="text-sm text-primary-foreground/80">{kategoriConfig.label}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-start gap-4">
              <a
                href={KATEGORI_HANDBOOK[kategoriConfig.value]}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex shrink-0 flex-col items-center gap-1.5"
              >
                <span className="relative flex size-14 items-center justify-center rounded-2xl border border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground shadow-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:scale-105 group-hover:border-primary-foreground/30 group-hover:bg-primary-foreground/20 group-hover:shadow-md">
                  <BookOpen className="size-6" aria-hidden="true" />
                  <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-accent text-accent-foreground ring-2 ring-primary transition-transform duration-200 group-hover:scale-110">
                    <ExternalLink className="size-3" aria-hidden="true" />
                  </span>
                </span>
                <span className="hidden text-xs font-semibold uppercase tracking-wider text-primary-foreground/70 sm:block">
                  Handbook
                </span>
              </a>

              <ProgressRing percent={progress} />
            </div>
          </div>
        </header>

        {/* Stepper */}
        <Stepper current={step} />

        <div className="px-6 py-8 md:px-10">
          {step === 0 && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <Section
                number="1"
                title={isTim ? "Data Tim" : "Data Peserta"}
                description={
                  timMode === "opsional"
                    ? "Peserta dapat mendaftar secara individu maupun berkelompok. Kosongkan kolom Nama Tim dan Anggota apabila mendaftar secara individu."
                    : timMode === "wajib"
                      ? "Lomba ini wajib diikuti secara berkelompok dengan jumlah anggota tepat 3 orang, terdiri atas 1 ketua dan 2 anggota."
                      : "Lengkapi data diri Anda dengan benar dan sesuai identitas resmi."
                }
              >
                {/* Honeypot anti-bot */}
                <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0" aria-hidden="true">
                  <label htmlFor="website">Jangan isi field ini</label>
                  <input
                    id="website"
                    name="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                  />
                </div>

                {isTim && (
                  <Field
                    label="Nama Tim"
                    required={timWajib}
                    error={errors.namaTim}
                    icon={<Users className="size-4" />}
                  >
                    <input
                      type="text"
                      value={form.namaTim}
                      onChange={(e) => update("namaTim", e.target.value)}
                      placeholder={timMode === "opsional" ? "Opsional — kosongkan apabila mendaftar secara individu" : "Masukkan nama tim"}
                      className={inputClass(!!errors.namaTim)}
                    />
                  </Field>
                )}

                {kategoriConfig.butuhProdi ? (
                  <div className="grid gap-5 md:grid-cols-2">
                    <Field
                      label={isTim ? "Nama Ketua Tim/Peserta" : "Nama Lengkap Peserta"}
                      required
                      error={errors.ketua}
                      icon={<User className="size-4" />}
                    >
                      <input
                        type="text"
                        value={form.ketua}
                        onChange={(e) => update("ketua", e.target.value)}
                        placeholder={isTim ? "Nama lengkap ketua tim" : "Nama lengkap Anda"}
                        className={inputClass(!!errors.ketua)}
                      />
                    </Field>
                    <Field
                      label={isTim ? "Program Studi Ketua Tim" : "Program Studi"}
                      required
                      error={errors.prodiKetua}
                      icon={<GraduationCap className="size-4" />}
                    >
                      <input
                        type="text"
                        value={form.prodiKetua}
                        onChange={(e) => update("prodiKetua", e.target.value)}
                        placeholder="Contoh: Akuntansi"
                        className={inputClass(!!errors.prodiKetua)}
                      />
                    </Field>
                  </div>
                ) : (
                  <Field
                    label={isTim ? "Nama Ketua Tim/Peserta" : "Nama Lengkap Peserta"}
                    required
                    error={errors.ketua}
                    icon={<User className="size-4" />}
                  >
                    <input
                      type="text"
                      value={form.ketua}
                      onChange={(e) => update("ketua", e.target.value)}
                      placeholder={isTim ? "Nama lengkap ketua tim" : "Nama lengkap Anda"}
                      className={inputClass(!!errors.ketua)}
                    />
                  </Field>
                )}

                {isTim && (
                  <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-4 transition-colors duration-200 hover:border-primary/30">
                    <p className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <Users className="size-4" aria-hidden="true" />
                      {timWajib
                        ? "Tim wajib terdiri atas 3 orang (1 ketua dan 2 anggota)."
                        : "Jumlah anggota tim bersifat opsional, terdiri atas 1 hingga 3 orang termasuk ketua."}
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-4">
                        <Field
                          label="Nama Anggota 1"
                          required={timWajib}
                          error={errors.anggota1}
                          icon={<User className="size-4" />}
                        >
                          <input
                            type="text"
                            value={form.anggota1}
                            onChange={(e) => update("anggota1", e.target.value)}
                            placeholder={timWajib ? "Nama lengkap anggota 1" : "Opsional"}
                            className={inputClass(!!errors.anggota1)}
                          />
                        </Field>
                        {kategoriConfig.butuhProdi && (
                          <Field
                            label="Program Studi Anggota 1"
                            required={timWajib}
                            error={errors.prodiAnggota1}
                            icon={<GraduationCap className="size-4" />}
                          >
                            <input
                              type="text"
                              value={form.prodiAnggota1}
                              onChange={(e) => update("prodiAnggota1", e.target.value)}
                              placeholder="Contoh: Akuntansi"
                              className={inputClass(!!errors.prodiAnggota1)}
                            />
                          </Field>
                        )}
                      </div>
                      <div className="space-y-4">
                        <Field
                          label="Nama Anggota 2"
                          required={timWajib}
                          error={errors.anggota2}
                          icon={<User className="size-4" />}
                        >
                          <input
                            type="text"
                            value={form.anggota2}
                            onChange={(e) => update("anggota2", e.target.value)}
                            placeholder={timWajib ? "Nama lengkap anggota 2" : "Opsional"}
                            className={inputClass(!!errors.anggota2)}
                          />
                        </Field>
                        {kategoriConfig.butuhProdi && (
                          <Field
                            label="Program Studi Anggota 2"
                            required={timWajib}
                            error={errors.prodiAnggota2}
                            icon={<GraduationCap className="size-4" />}
                          >
                            <input
                              type="text"
                              value={form.prodiAnggota2}
                              onChange={(e) => update("prodiAnggota2", e.target.value)}
                              placeholder="Contoh: Akuntansi"
                              className={inputClass(!!errors.prodiAnggota2)}
                            />
                          </Field>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid gap-5 md:grid-cols-2">
                  <Field
                    label="Asal Sekolah / Universitas"
                    required
                    error={errors.sekolah}
                    icon={<Building2 className="size-4" />}
                  >
                    <input
                      type="text"
                      value={form.sekolah}
                      onChange={(e) => update("sekolah", e.target.value)}
                      placeholder="Nama institusi"
                      className={inputClass(!!errors.sekolah)}
                    />
                  </Field>
                  <Field label="Kota Asal Universitas" required error={errors.kota} icon={<MapPin className="size-4" />}>
                    <input
                      type="text"
                      value={form.kota}
                      onChange={(e) => update("kota", e.target.value)}
                      placeholder="Kota asal"
                      className={inputClass(!!errors.kota)}
                    />
                  </Field>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <Field
                    label={isTim ? "No. Telepon Ketua Tim" : "No. Telepon Peserta"}
                    required
                    error={errors.telepon}
                    icon={<Phone className="size-4" />}
                  >
                    <input
                      type="tel"
                      value={form.telepon}
                      onChange={(e) => update("telepon", e.target.value)}
                      placeholder="08xxxxxxxxxx"
                      className={inputClass(!!errors.telepon)}
                    />
                  </Field>
                  <Field
                    label={isTim ? "Email Ketua Tim" : "Email Peserta"}
                    required
                    error={errors.email}
                    icon={<Mail className="size-4" />}
                  >
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      placeholder="nama@email.com"
                      className={inputClass(!!errors.email)}
                    />
                  </Field>
                </div>

                {/* Pakta Integritas */}
                <div data-error={!!errors.pakta}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-secondary/40 p-4 transition-all duration-200 hover:border-primary/40 hover:bg-secondary/60">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={form.pakta}
                      onClick={() => update("pakta", !form.pakta)}
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-all duration-200 hover:scale-110",
                        form.pakta ? "border-primary bg-primary" : "border-input bg-background",
                      )}
                    >
                      {form.pakta && (
                        <CheckCircle2 className="size-4 text-primary-foreground animate-in zoom-in duration-200" aria-hidden="true" />
                      )}
                    </button>
                    <span className="text-sm leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-foreground">Pakta Integritas.</span> Saya menyatakan bahwa
                      seluruh data yang diisi adalah benar, karya yang dikirimkan orisinal dan belum pernah
                      diikutsertakan pada perlombaan lain, serta bersedia mematuhi seluruh ketentuan dan peraturan
                      Auditphoria 6.0.
                    </span>
                  </label>
                  {errors.pakta && <p className="mt-2 pl-1 text-xs font-medium text-destructive">{errors.pakta}</p>}
                </div>
              </Section>

              <button type="button" onClick={handleNextData} className={cn(primaryBtn, "w-full")}>
                Lanjut ke Berkas
                <ArrowRight className="size-5 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <Section number="2" title="Unggah Berkas" description={`Lomba: ${kategoriConfig.code} — ${kategoriConfig.label}`}>
                <div className="space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Berkas Umum &middot; maksimal {MAX_BUKTI} berkas per jenis (Bukti Follow Instagram maksimal{" "}
                    {MAX_FOLLOW_IG} berkas)
                  </p>
                  <MultiFileField
                    label="Bukti Follow Instagram"
                    hint="Bukti telah mengikuti akun Instagram @auditphoria6.0 dan @bakpknstan — tangkapan layar format JPG / PNG, maksimal 10MB"
                    accept="image/png,image/jpeg"
                    icon={<AtSign className="size-4" />}
                    files={files.followIg}
                    onSelect={(f) => selectMulti("followIg", f, MAX_FOLLOW_IG)}
                    onRemove={(i) => removeMulti("followIg", i)}
                    error={errors.followIg}
                    maxFiles={MAX_FOLLOW_IG}
                  />
                  <MultiFileField
                    label="Scan KTM / Surat Keterangan Mahasiswa Aktif"
                    hint="Kartu Tanda Mahasiswa atau surat keterangan mahasiswa aktif dari perguruan tinggi — format JPG / PNG / PDF, maksimal 10MB"
                    accept="image/png,image/jpeg,.pdf"
                    icon={<IdCard className="size-4" />}
                    files={files.ktm}
                    onSelect={(f) => selectMulti("ktm", f, MAX_BUKTI)}
                    onRemove={(i) => removeMulti("ktm", i)}
                    error={errors.ktm}
                    maxFiles={MAX_BUKTI}
                  />
                  {kategoriConfig.butuhFotoDiri && (
                    <MultiFileField
                      label="Foto Diri Masing-Masing Anggota"
                      hint="Unggah foto diri setiap anggota tim, satu berkas untuk setiap anggota — format JPG / PNG / PDF, maksimal 10MB"
                      accept="image/png,image/jpeg,.pdf"
                      icon={<UserRound className="size-4" />}
                      files={files.fotoDiri}
                      onSelect={(f) => selectMulti("fotoDiri", f, MAX_BUKTI)}
                      onRemove={(i) => removeMulti("fotoDiri", i)}
                      error={errors.fotoDiri}
                      maxFiles={MAX_BUKTI}
                    />
                  )}
                  <MultiFileField
                    label="Bukti Upload Twibbon"
                    hint="Tangkapan layar twibbon yang telah diunggah — format JPG / PNG, maksimal 10MB"
                    accept="image/png,image/jpeg"
                    icon={<ImageIcon className="size-4" />}
                    files={files.twibbon}
                    onSelect={(f) => selectMulti("twibbon", f, MAX_BUKTI)}
                    onRemove={(i) => removeMulti("twibbon", i)}
                    error={errors.twibbon}
                    maxFiles={MAX_BUKTI}
                  />
                  {kategoriConfig.butuhPosterIg && (
                    <MultiFileField
                      label="Bukti Upload Poster ke IG Story"
                      hint="Tangkapan layar poster AEC yang telah diunggah ke Instagram Story — format JPG / PNG, maksimal 10MB"
                      accept="image/png,image/jpeg"
                      icon={<ImageIcon className="size-4" />}
                      files={files.posterIg}
                      onSelect={(f) => selectMulti("posterIg", f, MAX_BUKTI)}
                      onRemove={(i) => removeMulti("posterIg", i)}
                      error={errors.posterIg}
                      maxFiles={MAX_BUKTI}
                    />
                  )}
                </div>
              </Section>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={() => goTo(0)} className={cn(ghostBtn, "min-w-0 flex-1")}>
                  <ArrowLeft className="size-5 shrink-0 transition-transform duration-200 group-hover:-translate-x-1" aria-hidden="true" />
                  Kembali
                </button>
                <button type="button" onClick={handleNextFiles} className={cn(primaryBtn, "min-w-0 flex-1")}>
                  Lanjut ke Pembayaran
                  <ArrowRight className="size-5 shrink-0 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <Section number="3" title="Pembayaran" description="Lakukan pembayaran, lalu unggah bukti transfer sebagai konfirmasi">
                <div className="grid gap-4 sm:grid-cols-2">
                  {BANKS.map((b) => (
                    <div
                      key={b.key}
                      className="group flex flex-col justify-center rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
                    >
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-background p-1.5 transition-transform duration-300 group-hover:scale-105">
                          <Image
                            src={b.logo}
                            alt={`Logo ${b.bank}`}
                            width={40}
                            height={40}
                            className="size-full object-contain"
                          />
                        </div>
                        <p className="font-heading text-lg font-bold text-foreground">{b.bank}</p>
                      </div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Nomor Rekening
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-secondary/60 px-3 py-2">
                        <span className="font-mono text-base font-semibold tracking-wide text-foreground">
                          {b.norek}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyNorek(b.key, b.norek)}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary transition-all duration-200 hover:scale-105 hover:bg-primary/10 active:scale-95"
                        >
                          {copiedBank === b.key ? (
                            <>
                              <Check className="size-3.5 animate-in zoom-in duration-200" aria-hidden="true" /> Tersalin
                            </>
                          ) : (
                            <>
                              <Copy className="size-3.5" aria-hidden="true" /> Salin
                            </>
                          )}
                        </button>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        a.n. <span className="font-medium text-foreground">{b.atasNama}</span>
                      </p>
                    </div>
                  ))}
                </div>

                <MultiFileField
                  label="Upload Bukti Pembayaran"
                  hint="Unggah bukti transfer — format JPG / PNG / PDF, maksimal 10MB"
                  accept="image/png,image/jpeg,.pdf"
                  icon={<Upload className="size-4" />}
                  files={files.buktiBayar}
                  onSelect={(f) => selectMulti("buktiBayar", f, MAX_BAYAR)}
                  onRemove={(i) => removeMulti("buktiBayar", i)}
                  error={errors.buktiBayar}
                  maxFiles={MAX_BAYAR}
                />
              </Section>

              {submitError && (
                <p role="status" className="rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive animate-in fade-in slide-in-from-top-1 duration-200">
                  {submitError}
                </p>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={() => goTo(1)} className={cn(ghostBtn, "min-w-0 flex-1")}>
                  <ArrowLeft className="size-5 shrink-0 transition-transform duration-200 group-hover:-translate-x-1" aria-hidden="true" />
                  Kembali
                </button>
                <button type="button" onClick={handleNextBayar} className={cn(primaryBtn, "min-w-0 flex-1")}>
                  Lanjut ke Review
                  <ArrowRight className="size-5 shrink-0 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <Section
                number="4"
                title="Review & Konfirmasi"
                description="Periksa kembali data dan berkas Anda — klik nama berkas untuk membukanya, sebelum mengirim pendaftaran"
              >
                <ReviewSummary
                  form={form}
                  files={files}
                  kategoriConfig={kategoriConfig}
                  isTim={isTim}
                  onEditStep={goTo}
                />
              </Section>

              {submitError && (
                <p role="status" className="rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive animate-in fade-in slide-in-from-top-1 duration-200">
                  {submitError}
                </p>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => goTo(2)}
                  className={cn(ghostBtn, "min-w-0 flex-1")}
                  disabled={submitting}
                >
                  <ArrowLeft className="size-5 shrink-0 transition-transform duration-200 group-hover:-translate-x-1" aria-hidden="true" />
                  Kembali
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className={cn(primaryBtn, "min-w-0 flex-1", submitting && "opacity-70 pointer-events-none")}
                >
                  <CheckCircle2
                    className={cn("size-5 shrink-0 transition-transform duration-200", submitting ? "animate-spin" : "group-hover:scale-110")}
                    aria-hidden="true"
                  />
                  {submitting ? "Mengirim…" : "Kirim Pendaftaran"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-white/70">
        Butuh bantuan? Hubungi narahubung {kategoriConfig.code} melalui kontak resmi berikut.
      </p>
      <a
        href={`https://wa.me/${contact.whatsapp}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-white transition-all duration-200 hover:scale-105 hover:text-accent hover:underline"
      >
        <MessageCircle className="size-4" aria-hidden="true" />
        {contact.nama} (+{contact.whatsapp})
      </a>
    </div>
  )
}

/* ---------- Sub-komponen ---------- */

/** Halaman fallback kalau form dibuka tanpa parameter ?kategori= dari Google Sites. */
function KategoriPicker({ onPick }: { onPick: (value: Exclude<KategoriValue, "">) => void }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 md:py-16">
      <div className="overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-xl shadow-primary/5 md:p-10">
        <div className="mb-6 text-center">
          <h1 className="font-heading text-2xl font-bold text-foreground">Pendaftaran Auditphoria 6.0</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tautan ini dibuka tanpa cabang lomba yang spesifik. Silakan pilih cabang lomba di bawah ini, atau gunakan
            tautan pendaftaran resmi dari halaman masing-masing lomba.
          </p>
        </div>
        <div className="grid gap-3">
          {kategoriList.map((k) => (
            <button
              key={k.value}
              type="button"
              onClick={() => onPick(k.value)}
              className="group flex items-center gap-4 rounded-2xl border border-input bg-background p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-secondary/40 hover:shadow-md active:translate-y-0 active:scale-[0.99]"
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary transition-all duration-200 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground">
                {k.icon}
              </span>
              <span className="flex-1">
                <span className="block font-heading text-base font-bold text-foreground">
                  {k.code} — {k.label}
                </span>
                <span className="block text-xs text-muted-foreground">{k.desc}</span>
              </span>
              <ArrowRight
                className="size-4 shrink-0 text-muted-foreground transition-all duration-200 group-hover:translate-x-1 group-hover:text-primary"
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function PendaftaranBelumDibuka({ kategoriConfig, text }: { kategoriConfig: KategoriConfig; text: string }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="overflow-hidden rounded-3xl border border-border bg-card p-8 text-center shadow-xl">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-accent/20 text-accent-foreground">
          <Clock className="size-8" aria-hidden="true" />
        </div>
        <h1 className="font-heading text-xl font-bold text-foreground">Pendaftaran {kategoriConfig.code} Belum Dibuka</h1>
        <p className="mt-2 text-sm text-muted-foreground">{text}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Silakan kembali ke tautan ini setelah periode pendaftaran {kategoriConfig.label} resmi dibuka.
        </p>
      </div>
    </div>
  )
}

function PendaftaranDitutup({ kategoriConfig }: { kategoriConfig: KategoriConfig }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="overflow-hidden rounded-3xl border border-border bg-card p-8 text-center shadow-xl">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <Clock className="size-8" aria-hidden="true" />
        </div>
        <h1 className="font-heading text-xl font-bold text-foreground">Pendaftaran {kategoriConfig.code} Ditutup</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Batas waktu pendaftaran untuk {kategoriConfig.label} telah berakhir. Silakan hubungi panitia apabila
          terdapat pertanyaan lebih lanjut.
        </p>
      </div>
    </div>
  )
}

function formatCountdown(diffMs: number) {
  const totalSeconds = Math.floor(diffMs / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (days > 0) return `${days}h ${hours}j ${minutes}m lagi`
  if (hours > 0) return `${hours}j ${minutes}m ${seconds}d lagi`
  return `${minutes}m ${seconds}d lagi`
}

type BatchStatus =
  | { state: "open"; text: string; batchLabel: string }
  | { state: "upcoming"; text: string; batchLabel: string }
  | { state: "closed"; text: string }

/**
 * Cek batch mana (kalau ada) yang sedang aktif untuk waktu sekarang, update
 * tiap detik. Kalau tidak sedang di batch manapun tapi masih ada batch yang
 * akan datang -> "upcoming". Kalau semua batch sudah lewat -> "closed".
 *
 * PENTING: hook ini (dan hook di dalamnya, useState/useEffect) HARUS selalu
 * dipanggil di komponen pemanggil secara tanpa syarat / tidak boleh berada
 * setelah early return apa pun. Kalau perlu dipakai dengan kondisi "belum
 * ada kategori", kirim array batch kosong ([]) — bukan skip pemanggilan
 * hook-nya.
 */
function useBatchStatus(batches: Batch[]): BatchStatus {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const active = batches.find((b) => now >= new Date(b.start).getTime() && now <= new Date(b.end).getTime())
  if (active) {
    const diff = new Date(active.end).getTime() - now
    return { state: "open", text: `${formatCountdown(diff)} (${active.label})`, batchLabel: active.label }
  }

  const upcoming = batches
    .filter((b) => new Date(b.start).getTime() > now)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())[0]
  if (upcoming) {
    const opensAt = new Date(upcoming.start).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    return { state: "upcoming", text: `Dibuka ${opensAt} (${upcoming.label})`, batchLabel: upcoming.label }
  }

  return { state: "closed", text: "Pendaftaran ditutup" }
}

/**
 * Ring progress kelengkapan pengisian form — ditaruh di pojok kanan header,
 * warna aksen emas di atas latar ungu biar kontras & langsung kebaca tanpa
 * perlu dibaca teksnya. Persentase dihitung lewat calculateProgress().
 */
const PROGRESS_COLOR_STOPS: [number, [number, number, number]][] = [
  [0, [239, 68, 68]], // merah
  [20, [249, 115, 22]], // oranye
  [40, [234, 179, 8]], // kuning
  [60, [253, 224, 71]], // kuning terang
  [80, [34, 197, 94]], // hijau
  [100, [74, 222, 128]], // hijau terang
]

function progressColor(percent: number) {
  const clamped = Math.min(100, Math.max(0, percent))
  let lower = PROGRESS_COLOR_STOPS[0]
  let upper = PROGRESS_COLOR_STOPS[PROGRESS_COLOR_STOPS.length - 1]
  for (let i = 0; i < PROGRESS_COLOR_STOPS.length - 1; i++) {
    if (clamped >= PROGRESS_COLOR_STOPS[i][0] && clamped <= PROGRESS_COLOR_STOPS[i + 1][0]) {
      lower = PROGRESS_COLOR_STOPS[i]
      upper = PROGRESS_COLOR_STOPS[i + 1]
      break
    }
  }
  const [lowerPct, lowerRgb] = lower
  const [upperPct, upperRgb] = upper
  const t = (clamped - lowerPct) / (upperPct - lowerPct || 1)
  const r = Math.round(lowerRgb[0] + (upperRgb[0] - lowerRgb[0]) * t)
  const g = Math.round(lowerRgb[1] + (upperRgb[1] - lowerRgb[1]) * t)
  const b = Math.round(lowerRgb[2] + (upperRgb[2] - lowerRgb[2]) * t)
  return `rgb(${r}, ${g}, ${b})`
}

function ProgressRing({ percent }: { percent: number }) {
  const size = 80
  const stroke = 7
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(100, Math.max(0, Math.round(percent)))
  const offset = circumference - (clamped / 100) * circumference
  const isDone = clamped >= 100

  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5">
      <div
        className={cn(
          "relative flex items-center justify-center drop-shadow-[0_2px_10px_rgba(0,0,0,0.18)] transition-transform duration-300",
          isDone && "animate-in zoom-in duration-500",
        )}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={isDone ? "#ffffff" : progressColor(clamped)}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 700ms ease-out, stroke 400ms ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {isDone ? (
            <Check className="size-7 text-primary-foreground" aria-hidden="true" />
          ) : (
            <span className="font-heading text-lg font-bold text-primary-foreground">{clamped}%</span>
          )}
        </div>
      </div>
      <span className="hidden text-xs font-semibold uppercase tracking-wider text-primary-foreground/70 sm:block">
        {isDone ? "Lengkap" : "Progres"}
      </span>
    </div>
  )
}

function Stepper({ current }: { current: number }) {
  return (
    <div className="border-b border-border bg-secondary/30 px-6 py-4 md:px-10">
      <ol className="flex items-center">
        {steps.map((label, i) => {
          const done = i < current
          const active = i === current
          return (
            <li key={label} className="flex flex-1 items-center last:flex-none">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-300",
                    done && "bg-primary text-primary-foreground",
                    active && "bg-primary text-primary-foreground ring-4 ring-primary/15",
                    !done && !active && "bg-background text-muted-foreground ring-1 ring-border",
                  )}
                >
                  {done ? <Check className="size-4 animate-in zoom-in duration-200" aria-hidden="true" /> : i + 1}
                </span>
                <span
                  className={cn(
                    "hidden text-xs font-semibold transition-colors duration-300 sm:inline",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <span className={cn("mx-2 h-0.5 flex-1 rounded-full transition-colors duration-500", done ? "bg-primary" : "bg-border")} />
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function MultiFileField({
  label,
  hint,
  accept,
  icon,
  files,
  onSelect,
  onRemove,
  error,
  maxFiles,
}: {
  label: string
  hint: string
  accept: string
  icon: React.ReactNode
  files: FileSlot[]
  onSelect: (files: File[]) => void
  onRemove: (index: number) => void
  error?: string
  maxFiles: number
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const atMax = files.length >= maxFiles

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    if (selected.length > 0) onSelect(selected)
    e.target.value = ""
  }

  function handleDrop(e: React.DragEvent<HTMLButtonElement>) {
    e.preventDefault()
    setIsDragging(false)
    const dropped = Array.from(e.dataTransfer.files ?? [])
    if (dropped.length > 0) onSelect(dropped)
  }

  return (
    <div className="space-y-2" data-error={!!error}>
      <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <span className="text-muted-foreground">{icon}</span>
        {label}
        <span className="text-destructive">*</span>
        <span className="ml-auto text-xs font-medium text-muted-foreground">
          {files.length}/{maxFiles}
        </span>
      </label>

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, i) => (
            <li
              key={file.id}
              className="group flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 px-4 py-2.5 transition-all duration-200 hover:border-primary/70 hover:bg-primary/10 hover:shadow-sm"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-105">
                {file.uploading ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ImageIcon className="size-4" aria-hidden="true" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                {/* Klik nama berkas untuk membuka & memeriksa langsung berkas yang telah terunggah. */}
                {file.url ? (
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-w-0 items-center gap-1 truncate text-sm font-medium text-primary transition-colors duration-200 hover:underline"
                  >
                    <span className="truncate">{file.name}</span>
                    <ExternalLink className="size-3 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                  </a>
                ) : (
                  <span className="block truncate text-sm font-medium text-foreground">{file.name}</span>
                )}
                <span className="block text-xs text-muted-foreground">
                  {file.uploading
                    ? "Sedang mengunggah…"
                    : `${(file.size / 1024).toFixed(0)} KB · tersimpan — klik nama berkas untuk memeriksa`}
                </span>
              </span>
              <button
                type="button"
                onClick={() => onRemove(i)}
                aria-label={`Hapus ${file.name}`}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200 hover:scale-110 hover:rotate-90 hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!atMax ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "group flex w-full items-center gap-3 rounded-xl border border-dashed bg-background px-4 py-3 text-left transition-all duration-200",
            error
              ? "border-destructive ring-2 ring-destructive/20"
              : isDragging
                ? "scale-[1.01] border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                : "border-input hover:-translate-y-0.5 hover:border-primary/60 hover:bg-secondary/40 hover:shadow-sm",
          )}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary transition-all duration-200 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground">
            {files.length > 0 ? <Plus className="size-4" aria-hidden="true" /> : <Upload className="size-4" aria-hidden="true" />}
          </span>
          <span>
            <span className="block text-sm font-medium text-foreground">
              {files.length > 0 ? "Tambah berkas lagi" : "Pilih berkas"}
            </span>
            <span className="block text-xs text-muted-foreground">
              {hint} &middot; dapat memilih beberapa berkas sekaligus
            </span>
          </span>
        </button>
      ) : (
        <p className="rounded-xl border border-dashed border-border bg-secondary/40 px-4 py-2.5 text-xs font-medium text-muted-foreground">
          Batas maksimal {maxFiles} berkas telah tercapai. Hapus salah satu berkas untuk menggantinya.
        </p>
      )}

      <input ref={inputRef} type="file" accept={accept} multiple className="sr-only" onChange={handleSelect} />
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  )
}

/* ---------- Halaman Review ---------- */

function ReviewSummary({
  form,
  files,
  kategoriConfig,
  isTim,
  onEditStep,
}: {
  form: FormState
  files: FileState
  kategoriConfig: KategoriConfig
  isTim: boolean
  onEditStep: (step: number) => void
}) {
  return (
    <div className="space-y-5">
      <ReviewBlock title={isTim ? "Data Tim" : "Data Peserta"} onEdit={() => onEditStep(0)}>
        <dl className="space-y-2 text-sm">
          {isTim && form.namaTim && <ReviewRow label="Nama Tim" value={form.namaTim} />}
          <ReviewRow label={isTim ? "Ketua Tim/Peserta" : "Nama Peserta"} value={form.ketua} />
          {form.prodiKetua && (
            <ReviewRow label={isTim ? "Program Studi Ketua" : "Program Studi"} value={form.prodiKetua} />
          )}
          {form.anggota1 && <ReviewRow label="Anggota 1" value={form.anggota1} />}
          {form.prodiAnggota1 && <ReviewRow label="Program Studi Anggota 1" value={form.prodiAnggota1} />}
          {form.anggota2 && <ReviewRow label="Anggota 2" value={form.anggota2} />}
          {form.prodiAnggota2 && <ReviewRow label="Program Studi Anggota 2" value={form.prodiAnggota2} />}
          <ReviewRow label="Asal Institusi" value={form.sekolah} />
          <ReviewRow label="Kota Asal" value={form.kota} />
          <ReviewRow label="No. Telepon" value={form.telepon} />
          <ReviewRow label="Email" value={form.email} />
          <ReviewRow label="Pakta Integritas" value={form.pakta ? "Disetujui" : "Belum disetujui"} />
        </dl>
      </ReviewBlock>

      <ReviewBlock title="Berkas" onEdit={() => onEditStep(1)}>
        <div className="space-y-4">
          <ReviewFileGroup label="Bukti Follow Instagram" files={files.followIg} />
          <ReviewFileGroup label="Scan KTM / Surat Keterangan Mahasiswa Aktif" files={files.ktm} />
          {kategoriConfig.butuhFotoDiri && (
            <ReviewFileGroup label="Foto Diri Masing-Masing Anggota" files={files.fotoDiri} />
          )}
          <ReviewFileGroup label="Bukti Upload Twibbon" files={files.twibbon} />
          {kategoriConfig.butuhPosterIg && (
            <ReviewFileGroup label="Bukti Upload Poster ke IG Story" files={files.posterIg} />
          )}
        </div>
      </ReviewBlock>

      <ReviewBlock title="Pembayaran" onEdit={() => onEditStep(2)}>
        <ReviewFileGroup label="Bukti Pembayaran" files={files.buktiBayar} />
      </ReviewBlock>
    </div>
  )
}

function ReviewBlock({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-secondary/30 p-5 transition-colors duration-200 hover:bg-secondary/40">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-heading text-sm font-bold text-foreground">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="group inline-flex items-center gap-1 text-xs font-semibold text-primary transition-colors duration-200 hover:underline"
        >
          Ubah
          <ArrowRight className="size-3 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
        </button>
      </div>
      {children}
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-right font-medium text-foreground">{value || "-"}</dd>
    </div>
  )
}

function ReviewFileGroup({ label, files }: { label: string; files: FileSlot[] }) {
  return (
    <div>
      <p className="mb-1.5 flex items-center justify-between text-xs font-semibold text-muted-foreground">
        <span>{label}</span>
        <span>{files.length} berkas</span>
      </p>
      {files.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-background px-3 py-2 text-xs text-muted-foreground">
          Belum ada berkas yang diunggah.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {files.map((file) => (
            <li
              key={file.id}
              className="group flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 transition-all duration-200 hover:border-primary/40 hover:bg-secondary/30"
            >
              <ImageIcon className="size-3.5 shrink-0 text-muted-foreground transition-colors duration-200 group-hover:text-primary" aria-hidden="true" />
              {file.url ? (
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-0 flex-1 items-center gap-1 truncate text-xs font-medium text-primary hover:underline"
                >
                  <span className="truncate">{file.name}</span>
                  <ExternalLink className="size-3 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                </a>
              ) : (
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{file.name} (sedang mengunggah…)</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function SuccessScreen({
  form,
  kategoriConfig,
  onReset,
}: {
  form: FormState
  kategoriConfig: KategoriConfig
  onReset: () => void
}) {
  const isTim = kategoriConfig.timMode !== "solo"
  const contact = KATEGORI_CONTACT[kategoriConfig.value]

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-xl animate-in fade-in zoom-in-95 duration-500">
        <div className="relative overflow-hidden bg-primary px-8 py-10 text-center">
          <div className="absolute -right-8 -top-8 size-40 rounded-full bg-primary-foreground/10" aria-hidden="true" />
          <div className="relative">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary-foreground/15 animate-in zoom-in duration-500 delay-150">
              <CheckCircle2 className="size-9 text-primary-foreground" aria-hidden="true" />
            </div>
            <h1 className="font-heading text-2xl font-bold text-primary-foreground text-balance">
              Pendaftaran Terkirim!
            </h1>
          </div>
        </div>
        <div className="px-8 py-8">
          <p className="text-center text-pretty leading-relaxed text-muted-foreground">
            Terima kasih,{" "}
            <span className="font-semibold text-foreground">
              {isTim && form.namaTim ? `tim ${form.namaTim}` : form.ketua}
            </span>
            . Pendaftaran Anda untuk lomba{" "}
            <span className="font-semibold text-foreground">
              {kategoriConfig.code} — {kategoriConfig.label}
            </span>{" "}
            sedang dalam proses verifikasi oleh panitia.
          </p>
          <dl className="mt-6 space-y-2 rounded-2xl border border-border bg-secondary/40 p-5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-muted-foreground">{isTim ? "Ketua Tim" : "Nama Peserta"}</dt>
              <dd className="min-w-0 flex-1 break-words text-right font-medium text-foreground">{form.ketua}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-muted-foreground">Institusi</dt>
              <dd className="min-w-0 flex-1 break-words text-right font-medium text-foreground">{form.sekolah}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-muted-foreground">Email Konfirmasi</dt>
              <dd className="min-w-0 flex-1 break-words text-right font-medium text-foreground">{form.email}</dd>
            </div>
          </dl>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Konfirmasi kelulusan verifikasi akan dikirimkan ke email {isTim ? "ketua tim" : "peserta"}.
          </p>

          <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-5 text-center">
            <p className="text-sm font-semibold text-foreground">Langkah Selanjutnya</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Klik tombol di bawah untuk melanjutkan ke informasi resmi {kategoriConfig.code} — informasi teknis dan
              pembaruan terkait lomba akan dibagikan melalui tautan tersebut.
            </p>
            <a
              href={KATEGORI_LINK[kategoriConfig.value]}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30 hover:brightness-110 active:translate-y-0 active:scale-[0.98]"
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              Lanjut ke Info {kategoriConfig.code}
            </a>
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={onReset}
              className="inline-flex w-full items-center justify-center rounded-xl bg-secondary px-6 py-3 font-semibold text-secondary-foreground transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary/70 hover:shadow-md active:translate-y-0 active:scale-[0.98]"
            >
              Daftar Lagi
            </button>
          </div>
          <a
            href={`https://wa.me/${contact.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center gap-1.5 text-sm font-semibold text-primary transition-all duration-200 hover:scale-105 hover:underline"
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            Ada pertanyaan? Hubungi {contact.nama} (+{contact.whatsapp})
          </a>
        </div>
      </div>
    </div>
  )
}

/* ---------- Helper ---------- */

const primaryBtn =
  "group flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 font-heading text-base font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30 hover:brightness-110 active:translate-y-0 active:scale-[0.98]"

const ghostBtn =
  "group flex w-full items-center justify-center gap-2 rounded-xl border border-input bg-background px-6 py-4 font-heading text-base font-bold text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-secondary/60 hover:shadow-sm active:translate-y-0 active:scale-[0.98]"

function inputClass(hasError: boolean) {
  return cn(
    "w-full rounded-xl border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-all duration-200 placeholder:text-muted-foreground/60",
    hasError
      ? "border-destructive ring-2 ring-destructive/20"
      : "border-input hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/20",
  )
}

function Section({
  number,
  title,
  description,
  children,
}: {
  number: string
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-heading text-sm font-bold text-primary">
          {number}
        </span>
        <div>
          <h2 className="font-heading text-lg font-bold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  )
}

function Field({
  label,
  required,
  error,
  icon,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5" data-error={!!error}>
      <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        {label}
        {required && <span className="text-destructive">*</span>}
      </label>
      {children}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  )
}
