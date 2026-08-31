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
  /** Khusus AEC & LCCA: wajib unggah foto diri masing-masing anggota. */
  butuhFotoDiri?: boolean
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
    desc: "Kompetisi reels Instagram bertema audit — perorangan",
    timMode: "solo",
    icon: <Video className="size-5" aria-hidden="true" />,
  },
  {
    value: "aice",
    code: "AICE",
    label: "Audit Infografis Competition",
    desc: "Kompetisi desain infografis bertema audit — perorangan",
    timMode: "solo",
    icon: <Palette className="size-5" aria-hidden="true" />,
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

type FormState = {
  namaTim: string
  ketua: string
  anggota1: string
  anggota2: string
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
  anggota1: "",
  anggota2: "",
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

const MAX_BUKTI = 10
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

const steps = ["Data Peserta", "Berkas", "Pembayaran"]

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

  async function handleSubmit() {
    if (!kategoriConfig) return
    if (files.buktiBayar.length === 0) {
      setErrors({ buktiBayar: "Bukti pembayaran wajib diunggah" })
      scrollToError()
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
          anggota1: form.anggota1,
          anggota2: form.anggota2,
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 md:py-16">
      {draftRestored && step === 0 && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-card/95 p-4 shadow-lg shadow-black/20 backdrop-blur-sm">
          <p className="text-sm text-foreground">
            Progres pengisian sebelumnya untuk lomba ini berhasil dipulihkan, termasuk berkas yang sudah selesai
            diunggah.
          </p>
          <button
            type="button"
            onClick={() => setDraftRestored(false)}
            aria-label="Tutup"
            className="inline-flex shrink-0 items-center justify-center rounded-lg px-2 py-1.5 text-muted-foreground hover:bg-secondary"
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
          <div className="relative">
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
            <div className="mt-4 flex items-center gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                {kategoriConfig.icon}
              </div>
              <div>
                <h1 className="font-heading text-2xl font-bold leading-tight text-primary-foreground text-balance md:text-3xl">
                  {kategoriConfig.code}
                </h1>
                <p className="text-sm text-primary-foreground/80">{kategoriConfig.label}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Stepper */}
        <Stepper current={step} />

        <div className="px-6 py-8 md:px-10">
          {step === 0 && (
            <div className="space-y-8">
              <Section
                number="1"
                title={isTim ? "Data Tim" : "Data Peserta"}
                description={
                  timMode === "opsional"
                    ? "Boleh daftar sendiri atau berkelompok — kosongkan Nama Tim & anggota kalau daftar sendiri"
                    : timMode === "wajib"
                      ? "Lomba ini wajib diikuti secara berkelompok"
                      : "Lengkapi data diri Anda"
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
                      placeholder={timMode === "opsional" ? "Opsional — kosongkan kalau daftar sendiri" : "Masukkan nama tim"}
                      className={inputClass(!!errors.namaTim)}
                    />
                  </Field>
                )}

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

                {isTim && (
                  <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-4">
                    <p className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <Users className="size-4" aria-hidden="true" />
                      {timWajib
                        ? "Anggota tim (1–3 orang termasuk ketua)"
                        : "Anggota tim bersifat opsional (1–3 orang termasuk ketua)"}
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Nama Anggota 1" icon={<User className="size-4" />}>
                        <input
                          type="text"
                          value={form.anggota1}
                          onChange={(e) => update("anggota1", e.target.value)}
                          placeholder="Opsional"
                          className={inputClass(false)}
                        />
                      </Field>
                      <Field label="Nama Anggota 2" icon={<User className="size-4" />}>
                        <input
                          type="text"
                          value={form.anggota2}
                          onChange={(e) => update("anggota2", e.target.value)}
                          placeholder="Opsional"
                          className={inputClass(false)}
                        />
                      </Field>
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
                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-secondary/40 p-4">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={form.pakta}
                      onClick={() => update("pakta", !form.pakta)}
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-all",
                        form.pakta ? "border-primary bg-primary" : "border-input bg-background",
                      )}
                    >
                      {form.pakta && <CheckCircle2 className="size-4 text-primary-foreground" aria-hidden="true" />}
                    </button>
                    <span className="text-sm leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-foreground">Pakta Integritas.</span> Saya menyatakan bahwa
                      seluruh data yang diisi adalah benar, karya yang dikirimkan orisinal dan belum pernah dilombakan,
                      serta bersedia mematuhi seluruh peraturan Auditphoria 6.0.
                    </span>
                  </label>
                  {errors.pakta && <p className="mt-2 pl-1 text-xs font-medium text-destructive">{errors.pakta}</p>}
                </div>
              </Section>

              <button type="button" onClick={handleNextData} className={cn(primaryBtn, "w-full")}>
                Lanjut ke Berkas
                <ArrowRight className="size-5" aria-hidden="true" />
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-8">
              <Section number="2" title="Unggah Berkas" description={`Lomba: ${kategoriConfig.code} — ${kategoriConfig.label}`}>
                <div className="space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Berkas Umum &middot; maks {MAX_BUKTI} file per berkas
                  </p>
                  <MultiFileField
                    label="Bukti Follow Instagram"
                    hint="Bukti follow akun Instagram @auditphoria6.0 dan @bakpknstan — Screenshot JPG / PNG · maks 10MB"
                    accept="image/png,image/jpeg"
                    icon={<AtSign className="size-4" />}
                    files={files.followIg}
                    onSelect={(f) => selectMulti("followIg", f, MAX_BUKTI)}
                    onRemove={(i) => removeMulti("followIg", i)}
                    error={errors.followIg}
                    maxFiles={MAX_BUKTI}
                  />
                  <MultiFileField
                    label="Scan KTM / Surat Keterangan Mahasiswa Aktif"
                    hint="Kartu Tanda Mahasiswa atau surat keterangan mahasiswa aktif dari perguruan tinggi — JPG / PNG / PDF · maks 10MB"
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
                      hint="Upload foto diri tiap anggota tim (satu file per anggota) — JPG / PNG / PDF · maks 10MB"
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
                    hint="Screenshot twibbon yang telah diunggah — JPG / PNG · maks 10MB"
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
                      hint="Screenshot poster AEC yang telah diunggah ke Instagram Story — JPG / PNG · maks 10MB"
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

              <div className="flex gap-3">
                <button type="button" onClick={() => goTo(0)} className={cn(ghostBtn, "flex-1")}>
                  <ArrowLeft className="size-5" aria-hidden="true" />
                  Kembali
                </button>
                <button type="button" onClick={handleNextFiles} className={cn(primaryBtn, "flex-1")}>
                  Lanjut ke Pembayaran
                  <ArrowRight className="size-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8">
              <Section number="3" title="Pembayaran" description="Lakukan pembayaran lalu unggah bukti transfer">
                <div className="grid gap-4 sm:grid-cols-2">
                  {BANKS.map((b) => (
                    <div key={b.key} className="flex flex-col justify-center rounded-2xl border border-border bg-card p-5">
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-background p-1.5">
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
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                        >
                          {copiedBank === b.key ? (
                            <>
                              <Check className="size-3.5" aria-hidden="true" /> Tersalin
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
                  hint="Unggah bukti transfer — JPG / PNG / PDF · maks 10MB"
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
                <p role="status" className="rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                  {submitError}
                </p>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={() => goTo(1)} className={cn(ghostBtn, "flex-1")} disabled={submitting}>
                  <ArrowLeft className="size-5" aria-hidden="true" />
                  Kembali
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className={cn(primaryBtn, "flex-1", submitting && "opacity-70 pointer-events-none")}
                >
                  <CheckCircle2 className="size-5" aria-hidden="true" />
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
        className="mt-2 flex items-center justify-center gap-1.5 text-sm font-semibold text-white hover:text-accent hover:underline"
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
            Link ini dibuka tanpa lomba spesifik. Pilih cabang lomba di bawah, atau gunakan link pendaftaran resmi
            dari halaman lomba masing-masing.
          </p>
        </div>
        <div className="grid gap-3">
          {kategoriList.map((k) => (
            <button
              key={k.value}
              type="button"
              onClick={() => onPick(k.value)}
              className="group flex items-center gap-4 rounded-2xl border border-input bg-background p-4 text-left transition-all hover:border-primary/40 hover:bg-secondary/40"
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                {k.icon}
              </span>
              <span className="flex-1">
                <span className="block font-heading text-base font-bold text-foreground">
                  {k.code} — {k.label}
                </span>
                <span className="block text-xs text-muted-foreground">{k.desc}</span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
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
          Kembali lagi ke link ini saat periode pendaftaran {kategoriConfig.label} sudah dimulai.
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
          Batas waktu pendaftaran untuk {kategoriConfig.label} sudah berakhir. Hubungi panitia jika ada pertanyaan.
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
                    "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
                    done && "bg-primary text-primary-foreground",
                    active && "bg-primary text-primary-foreground ring-4 ring-primary/15",
                    !done && !active && "bg-background text-muted-foreground ring-1 ring-border",
                  )}
                >
                  {done ? <Check className="size-4" aria-hidden="true" /> : i + 1}
                </span>
                <span
                  className={cn(
                    "hidden text-xs font-semibold sm:inline",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <span className={cn("mx-2 h-0.5 flex-1 rounded-full", done ? "bg-primary" : "bg-border")} />
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
  const atMax = files.length >= maxFiles

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    if (selected.length > 0) onSelect(selected)
    e.target.value = ""
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
              className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 px-4 py-2.5"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {file.uploading ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ImageIcon className="size-4" aria-hidden="true" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">{file.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {file.uploading ? "Mengunggah…" : `${(file.size / 1024).toFixed(0)} KB · tersimpan`}
                </span>
              </span>
              <button
                type="button"
                onClick={() => onRemove(i)}
                aria-label={`Hapus ${file.name}`}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
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
          className={cn(
            "flex w-full items-center gap-3 rounded-xl border border-dashed bg-background px-4 py-3 text-left transition-colors",
            error
              ? "border-destructive ring-2 ring-destructive/20"
              : "border-input hover:border-primary/50 hover:bg-secondary/40",
          )}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
            {files.length > 0 ? <Plus className="size-4" aria-hidden="true" /> : <Upload className="size-4" aria-hidden="true" />}
          </span>
          <span>
            <span className="block text-sm font-medium text-foreground">
              {files.length > 0 ? "Tambah file lagi" : "Pilih file"}
            </span>
            <span className="block text-xs text-muted-foreground">
              {hint} &middot; bisa pilih beberapa sekaligus
            </span>
          </span>
        </button>
      ) : (
        <p className="rounded-xl border border-dashed border-border bg-secondary/40 px-4 py-2.5 text-xs font-medium text-muted-foreground">
          Batas maksimal {maxFiles} file tercapai. Hapus salah satu untuk mengganti.
        </p>
      )}

      <input ref={inputRef} type="file" accept={accept} multiple className="sr-only" onChange={handleSelect} />
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
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
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-xl">
        <div className="relative overflow-hidden bg-primary px-8 py-10 text-center">
          <div className="absolute -right-8 -top-8 size-40 rounded-full bg-primary-foreground/10" aria-hidden="true" />
          <div className="relative">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary-foreground/15">
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
            sedang kami verifikasi.
          </p>
          <dl className="mt-6 space-y-2 rounded-2xl border border-border bg-secondary/40 p-5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{isTim ? "Ketua Tim" : "Nama Peserta"}</dt>
              <dd className="font-medium text-foreground">{form.ketua}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Institusi</dt>
              <dd className="text-right font-medium text-foreground">{form.sekolah}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Email Konfirmasi</dt>
              <dd className="text-right font-medium text-foreground">{form.email}</dd>
            </div>
          </dl>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Konfirmasi lolos verifikasi akan dikirim ke email {isTim ? "ketua tim" : "peserta"}.
          </p>

          <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-5 text-center">
            <p className="text-sm font-semibold text-foreground">Langkah Selanjutnya</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Klik tombol di bawah untuk lanjut ke info resmi {kategoriConfig.code} — informasi teknis dan update
              lomba akan dibagikan di sana.
            </p>
            <a
              href={KATEGORI_LINK[kategoriConfig.value]}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:brightness-110"
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              Lanjut ke Info {kategoriConfig.code}
            </a>
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={onReset}
              className="inline-flex w-full items-center justify-center rounded-xl bg-secondary px-6 py-3 font-semibold text-secondary-foreground transition-colors hover:bg-secondary/70"
            >
              Daftar Lagi
            </button>
          </div>
          <a
            href={`https://wa.me/${contact.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center gap-1.5 text-sm font-semibold text-primary hover:underline"
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
  "flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 font-heading text-base font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:brightness-110 active:scale-[0.99]"

const ghostBtn =
  "flex w-full items-center justify-center gap-2 rounded-xl border border-input bg-background px-6 py-4 font-heading text-base font-bold text-foreground transition-colors hover:bg-secondary/60"

function inputClass(hasError: boolean) {
  return cn(
    "w-full rounded-xl border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/60",
    hasError
      ? "border-destructive ring-2 ring-destructive/20"
      : "border-input focus:border-primary focus:ring-2 focus:ring-primary/20",
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
