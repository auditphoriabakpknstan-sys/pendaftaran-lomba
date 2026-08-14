"use client"

import type React from "react"

import { useState, useRef } from "react"
import Image from "next/image"
import {
  FileText,
  User,
  Users,
  Mail,
  Phone,
  Building2,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  ScrollText,
  ClipboardCheck,
  Gavel,
  AtSign,
  IdCard,
  MessageCircle,
  Share2,
  Image as ImageIcon,
  Palette,
  UserRound,
  Upload,
  ArrowRight,
  ArrowLeft,
  Wallet,
  Copy,
  Check,
  X,
  Plus,
} from "lucide-react"
import { cn } from "@/lib/utils"

type Kategori = "essay" | "policy" | "order" | "infografis" | ""

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
  kategori: Kategori
}

type FileState = {
  abstrak: File | null
  followIg: File[]
  ktm: File[]
  posterWa: File[]
  posterIg: File[]
  twibbon: File[]
  buktiBayar: File[]
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
  abstrak: null,
  followIg: [],
  ktm: [],
  posterWa: [],
  posterIg: [],
  twibbon: [],
  buktiBayar: [],
}

const MAX_BUKTI = 10
const MAX_BAYAR = 5

const kategoriList: {
  value: Exclude<Kategori, "">
  label: string
  desc: string
  perorangan: boolean
  icon: React.ReactNode
}[] = [
  {
    value: "essay",
    label: "Essay Auditphoria",
    desc: "Kompetisi penulisan esai bertema audit — beregu",
    perorangan: false,
    icon: <ScrollText className="size-5" aria-hidden="true" />,
  },
  {
    value: "policy",
    label: "Audit Policy",
    desc: "Analisis dan rekomendasi kebijakan audit — beregu",
    perorangan: false,
    icon: <ClipboardCheck className="size-5" aria-hidden="true" />,
  },
  {
    value: "order",
    label: "Audit Order",
    desc: "Studi kasus prosedur dan tata kelola audit — beregu",
    perorangan: false,
    icon: <Gavel className="size-5" aria-hidden="true" />,
  },
  {
    value: "infografis",
    label: "Audit Infografis",
    desc: "Kompetisi desain infografis bertema audit — perorangan",
    perorangan: true,
    icon: <Palette className="size-5" aria-hidden="true" />,
  },
]

const kategoriKaryaLabel: Record<Exclude<Kategori, "">, string> = {
  essay: "File Abstrak Essay",
  policy: "File Abstrak Audit Policy",
  order: "File Abstrak Audit Order",
  infografis: "File Karya Infografis",
}

const kategoriKaryaHint: Record<Exclude<Kategori, "">, string> = {
  essay: "Tahap pengumpulan abstrak — PDF / DOC / DOCX",
  policy: "Tahap pengumpulan abstrak — PDF / DOC / DOCX",
  order: "Tahap pengumpulan abstrak — PDF / DOC / DOCX",
  infografis: "Unggah karya infografis — JPG / PNG / PDF",
}

const kategoriKaryaAccept: Record<Exclude<Kategori, "">, string> = {
  essay: ".pdf,.doc,.docx",
  policy: ".pdf,.doc,.docx",
  order: ".pdf,.doc,.docx",
  infografis: "image/png,image/jpeg,.pdf",
}

function isPerorangan(kategori: Kategori) {
  return kategoriList.find((k) => k.value === kategori)?.perorangan ?? false
}

const steps = ["Kategori", "Data Peserta", "Berkas", "Pembayaran"]

const BANK = {
  bank: "Bank BNI",
  norek: "1234567890",
  atasNama: "Panitia Auditphoria 6.0",
}

export function RegistrationForm() {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>(initialForm)
  const [files, setFiles] = useState<FileState>(initialFiles)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [copied, setCopied] = useState(false)

  const perorangan = isPerorangan(form.kategori)

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: "" }))
  }

  function setKarya(file: File | null) {
    setFiles((prev) => ({ ...prev, abstrak: file }))
    setErrors((prev) => ({ ...prev, abstrak: "" }))
  }

  function setMulti(key: keyof Omit<FileState, "abstrak">, list: File[]) {
    setFiles((prev) => ({ ...prev, [key]: list }))
    setErrors((prev) => ({ ...prev, [key]: "" }))
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
    if (!perorangan && !form.namaTim.trim()) next.namaTim = "Nama tim wajib diisi"
    if (!form.ketua.trim()) next.ketua = perorangan ? "Nama peserta wajib diisi" : "Nama ketua tim wajib diisi"
    if (!form.sekolah.trim()) next.sekolah = "Asal sekolah/universitas wajib diisi"
    if (!form.kota.trim()) next.kota = "Kota asal wajib diisi"
    if (!form.telepon.trim()) next.telepon = "Nomor telepon wajib diisi"
    if (!form.email.trim()) next.email = "Email wajib diisi"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = "Format email tidak valid"
    if (!form.pakta) next.pakta = "Anda harus menyetujui pakta integritas"
    setErrors(next)
    if (Object.keys(next).length > 0) scrollToError()
    return Object.keys(next).length === 0
  }

  function validateFiles() {
    const next: Record<string, string> = {}
    if (!files.abstrak) next.abstrak = "Berkas karya wajib diunggah"
    if (files.followIg.length === 0) next.followIg = "Bukti follow Instagram wajib diunggah"
    if (files.ktm.length === 0) next.ktm = "Scan KTM/identitas mahasiswa wajib diunggah"
    if (files.posterWa.length === 0) next.posterWa = "Bukti share poster di grup WA wajib diunggah"
    if (files.posterIg.length === 0) next.posterIg = "Bukti share poster di IG story wajib diunggah"
    if (files.twibbon.length === 0) next.twibbon = "Bukti upload twibbon wajib diunggah"
    setErrors(next)
    if (Object.keys(next).length > 0) scrollToError()
    return Object.keys(next).length === 0
  }

  function pickKategori(value: Exclude<Kategori, "">) {
    update("kategori", value)
    // memilih kategori langsung mengarahkan ke slide berikutnya
    setTimeout(() => goTo(1), 180)
  }

  function handleNextData() {
    if (validateData()) goTo(2)
  }

  function handleNextFiles() {
    if (validateFiles()) goTo(3)
  }

  async function handleSubmit() {
    if (files.buktiBayar.length === 0) {
      setErrors({ buktiBayar: "Bukti pembayaran wajib diunggah" })
      scrollToError()
      return
    }

    setSubmitting(true)
    setSubmitError("")

    try {
      const payload = new FormData()
      payload.append("kategori", form.kategori)
      payload.append("namaTim", form.namaTim)
      payload.append("ketua", form.ketua)
      payload.append("anggota1", form.anggota1)
      payload.append("anggota2", form.anggota2)
      payload.append("sekolah", form.sekolah)
      payload.append("kota", form.kota)
      payload.append("telepon", form.telepon)
      payload.append("email", form.email)
      payload.append("pakta", String(form.pakta))

      if (files.abstrak) payload.append("abstrak", files.abstrak)
      files.followIg.forEach((f) => payload.append("followIg", f))
      files.ktm.forEach((f) => payload.append("ktm", f))
      files.posterWa.forEach((f) => payload.append("posterWa", f))
      files.posterIg.forEach((f) => payload.append("posterIg", f))
      files.twibbon.forEach((f) => payload.append("twibbon", f))
      files.buktiBayar.forEach((f) => payload.append("buktiBayar", f))

      const res = await fetch("/api/register", { method: "POST", body: payload })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        setSubmitError(data.message ?? "Pendaftaran gagal dikirim. Coba lagi.")
        setSubmitting(false)
        return
      }

      setSubmitted(true)
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch {
      setSubmitError("Tidak dapat terhubung ke server. Periksa koneksi internet Anda dan coba lagi.")
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setForm(initialForm)
    setFiles(initialFiles)
    setErrors({})
    setStep(0)
    setSubmitted(false)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function copyNorek() {
    try {
      await navigator.clipboard.writeText(BANK.norek)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // abaikan jika clipboard tidak tersedia
    }
  }

  if (submitted) {
    return <SuccessScreen form={form} perorangan={perorangan} onReset={reset} />
  }

  const kategoriLabel = kategoriList.find((k) => k.value === form.kategori)?.label ?? "-"

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 md:py-16">
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-xl shadow-primary/5">
        {/* Header */}
        <header className="relative overflow-hidden bg-primary px-6 py-8 md:px-10">
          <div className="absolute -right-8 -top-8 size-40 rounded-full bg-primary-foreground/10" aria-hidden="true" />
          <div className="absolute -bottom-12 -left-6 size-40 rounded-full bg-accent/20" aria-hidden="true" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-semibold text-primary-foreground">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Pendaftaran Dibuka
            </span>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                <FileText className="size-6" aria-hidden="true" />
              </div>
              <div>
                <h1 className="font-heading text-2xl font-bold leading-tight text-primary-foreground text-balance md:text-3xl">
                  Auditphoria 6.0
                </h1>
                <p className="text-sm text-primary-foreground/80">Formulir Pendaftaran Peserta</p>
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
                title="Kategori Lomba"
                description="Pilih satu kategori — Anda akan langsung diarahkan ke pengisian data"
              >
                <div className="grid gap-3">
                  {kategoriList.map((k) => (
                    <button
                      key={k.value}
                      type="button"
                      onClick={() => pickKategori(k.value)}
                      className={cn(
                        "group flex items-center gap-4 rounded-2xl border p-4 text-left transition-all",
                        form.kategori === k.value
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-input bg-background hover:border-primary/40 hover:bg-secondary/40",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-12 shrink-0 items-center justify-center rounded-xl transition-colors",
                          form.kategori === k.value
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-primary",
                        )}
                      >
                        {k.icon}
                      </span>
                      <span className="flex-1">
                        <span className="block font-heading text-base font-bold text-foreground">{k.label}</span>
                        <span className="block text-xs text-muted-foreground">{k.desc}</span>
                      </span>
                      <span
                        className={cn(
                          "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          k.perorangan ? "bg-accent/20 text-accent-foreground" : "bg-secondary text-muted-foreground",
                        )}
                      >
                        {k.perorangan ? (
                          <>
                            <UserRound className="size-3" aria-hidden="true" /> Perorangan
                          </>
                        ) : (
                          <>
                            <Users className="size-3" aria-hidden="true" /> Beregu
                          </>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              </Section>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-8">
              <Section
                number="2"
                title={perorangan ? "Data Peserta" : "Data Tim"}
                description={
                  perorangan
                    ? `Kategori ${kategoriLabel} — lengkapi data diri Anda`
                    : `Kategori ${kategoriLabel} — lengkapi informasi tim dan ketua tim`
                }
              >
                {!perorangan && (
                  <Field label="Nama Tim" required error={errors.namaTim} icon={<Users className="size-4" />}>
                    <input
                      type="text"
                      value={form.namaTim}
                      onChange={(e) => update("namaTim", e.target.value)}
                      placeholder="Masukkan nama tim"
                      className={inputClass(!!errors.namaTim)}
                    />
                  </Field>
                )}

                <Field
                  label={perorangan ? "Nama Lengkap Peserta" : "Nama Ketua Tim"}
                  required
                  error={errors.ketua}
                  icon={<User className="size-4" />}
                >
                  <input
                    type="text"
                    value={form.ketua}
                    onChange={(e) => update("ketua", e.target.value)}
                    placeholder={perorangan ? "Nama lengkap Anda" : "Nama lengkap ketua tim"}
                    className={inputClass(!!errors.ketua)}
                  />
                </Field>

                {!perorangan && (
                  <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-4">
                    <p className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <Users className="size-4" aria-hidden="true" />
                      Anggota tim bersifat opsional (1&ndash;3 orang termasuk ketua)
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
                    label={perorangan ? "No. Telepon Peserta" : "No. Telepon Ketua Tim"}
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
                    label={perorangan ? "Email Peserta" : "Email Ketua Tim"}
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

              <div className="flex gap-3">
                <button type="button" onClick={() => goTo(0)} className={cn(ghostBtn, "flex-1")}>
                  <ArrowLeft className="size-5" aria-hidden="true" />
                  Ganti Kategori
                </button>
                <button type="button" onClick={handleNextData} className={cn(primaryBtn, "flex-1")}>
                  Lanjut ke Berkas
                  <ArrowRight className="size-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8">
              <Section number="3" title="Unggah Berkas" description={`Kategori: ${kategoriLabel}`}>
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                  <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-primary">Berkas Karya</p>
                  <FileField
                    label={form.kategori ? kategoriKaryaLabel[form.kategori] : "File Karya"}
                    hint={form.kategori ? kategoriKaryaHint[form.kategori] : "Unggah berkas karya"}
                    accept={form.kategori ? kategoriKaryaAccept[form.kategori] : ".pdf"}
                    icon={<FileText className="size-4" />}
                    file={files.abstrak}
                    onChange={setKarya}
                    error={errors.abstrak}
                  />
                </div>

                <div className="space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Berkas Umum (semua kategori) &middot; maks {MAX_BUKTI} file per berkas
                  </p>
                  <MultiFileField
                    label="Bukti Follow Instagram"
                    hint="Screenshot follow akun IG panitia — JPG / PNG"
                    accept="image/png,image/jpeg"
                    icon={<AtSign className="size-4" />}
                    files={files.followIg}
                    onChange={(f) => setMulti("followIg", f)}
                    error={errors.followIg}
                    maxFiles={MAX_BUKTI}
                  />
                  <MultiFileField
                    label="Scan KTM / Identitas Mahasiswa"
                    hint="Kartu Tanda Mahasiswa — JPG / PNG / PDF"
                    accept="image/png,image/jpeg,.pdf"
                    icon={<IdCard className="size-4" />}
                    files={files.ktm}
                    onChange={(f) => setMulti("ktm", f)}
                    error={errors.ktm}
                    maxFiles={MAX_BUKTI}
                  />
                  <MultiFileField
                    label="Bukti Share Poster di Grup WA"
                    hint="Screenshot poster dibagikan ke grup WhatsApp — JPG / PNG"
                    accept="image/png,image/jpeg"
                    icon={<MessageCircle className="size-4" />}
                    files={files.posterWa}
                    onChange={(f) => setMulti("posterWa", f)}
                    error={errors.posterWa}
                    maxFiles={MAX_BUKTI}
                  />
                  <MultiFileField
                    label="Bukti Share Poster di IG Story"
                    hint="Screenshot poster di Instagram story — JPG / PNG"
                    accept="image/png,image/jpeg"
                    icon={<Share2 className="size-4" />}
                    files={files.posterIg}
                    onChange={(f) => setMulti("posterIg", f)}
                    error={errors.posterIg}
                    maxFiles={MAX_BUKTI}
                  />
                  <MultiFileField
                    label="Bukti Upload Twibbon"
                    hint="Screenshot twibbon yang telah diunggah — JPG / PNG"
                    accept="image/png,image/jpeg"
                    icon={<ImageIcon className="size-4" />}
                    files={files.twibbon}
                    onChange={(f) => setMulti("twibbon", f)}
                    error={errors.twibbon}
                    maxFiles={MAX_BUKTI}
                  />
                </div>
              </Section>

              <div className="flex gap-3">
                <button type="button" onClick={() => goTo(1)} className={cn(ghostBtn, "flex-1")}>
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

          {step === 3 && (
            <div className="space-y-8">
              <Section number="4" title="Pembayaran" description="Lakukan pembayaran lalu unggah bukti transfer">
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* QRIS */}
                  <div className="flex flex-col items-center rounded-2xl border border-border bg-card p-5 text-center">
                    <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                      <Wallet className="size-3.5" aria-hidden="true" />
                      Scan QRIS
                    </span>
                    <div className="overflow-hidden rounded-xl border border-border bg-background p-2">
                      <Image
                        src="/images/qris-pembayaran.png"
                        alt="Kode QRIS untuk pembayaran biaya pendaftaran"
                        width={200}
                        height={200}
                        className="size-40 object-contain"
                      />
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">Mendukung semua e-wallet &amp; m-banking</p>
                  </div>

                  {/* Transfer Bank */}
                  <div className="flex flex-col justify-center rounded-2xl border border-border bg-card p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Transfer Bank
                    </p>
                    <p className="mt-2 font-heading text-lg font-bold text-foreground">{BANK.bank}</p>
                    <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-secondary/60 px-3 py-2">
                      <span className="font-mono text-base font-semibold tracking-wide text-foreground">
                        {BANK.norek}
                      </span>
                      <button
                        type="button"
                        onClick={copyNorek}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                      >
                        {copied ? (
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
                      a.n. <span className="font-medium text-foreground">{BANK.atasNama}</span>
                    </p>
                  </div>
                </div>

                <MultiFileField
                  label="Upload Bukti Pembayaran"
                  hint="Unggah bukti transfer — JPG / PNG / PDF"
                  accept="image/png,image/jpeg,.pdf"
                  icon={<Upload className="size-4" />}
                  files={files.buktiBayar}
                  onChange={(f) => setMulti("buktiBayar", f)}
                  error={errors.buktiBayar}
                  maxFiles={MAX_BAYAR}
                />
              </Section>

              {submitError && (
                <p
                  role="status"
                  className="rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive"
                >
                  {submitError}
                </p>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={() => goTo(2)} className={cn(ghostBtn, "flex-1")} disabled={submitting}>
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

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Butuh bantuan? Hubungi panitia Auditphoria 6.0 melalui narahubung resmi.
      </p>
    </div>
  )
}

/* ---------- Sub-komponen ---------- */

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

function FileField({
  label,
  hint,
  accept,
  icon,
  file,
  onChange,
  error,
}: {
  label: string
  hint: string
  accept: string
  icon: React.ReactNode
  file: File | null
  onChange: (file: File | null) => void
  error?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-1.5" data-error={!!error}>
      <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <span className="text-muted-foreground">{icon}</span>
        {label}
        <span className="text-destructive">*</span>
      </label>

      {file ? (
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl border bg-background px-4 py-3",
            error ? "border-destructive" : "border-primary/40 bg-primary/5",
          )}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="size-4" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">{file.name}</span>
            <span className="block text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</span>
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={`Hapus ${label}`}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
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
            <Upload className="size-4" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-medium text-foreground">Pilih file</span>
            <span className="block text-xs text-muted-foreground">{hint}</span>
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  )
}

function MultiFileField({
  label,
  hint,
  accept,
  icon,
  files,
  onChange,
  error,
  maxFiles,
}: {
  label: string
  hint: string
  accept: string
  icon: React.ReactNode
  files: File[]
  onChange: (files: File[]) => void
  error?: string
  maxFiles: number
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const atMax = files.length >= maxFiles

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    if (selected.length > 0) {
      onChange([...files, ...selected].slice(0, maxFiles))
    }
    e.target.value = ""
  }

  function removeAt(index: number) {
    onChange(files.filter((_, i) => i !== index))
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
              key={`${file.name}-${i}`}
              className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 px-4 py-2.5"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ImageIcon className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">{file.name}</span>
                <span className="block text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</span>
              </span>
              <button
                type="button"
                onClick={() => removeAt(i)}
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

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="sr-only"
        onChange={handleSelect}
      />
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  )
}

function SuccessScreen({
  form,
  perorangan,
  onReset,
}: {
  form: FormState
  perorangan: boolean
  onReset: () => void
}) {
  const kategori = kategoriList.find((k) => k.value === form.kategori)?.label ?? "-"
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
              {perorangan ? form.ketua : `tim ${form.namaTim}`}
            </span>
            . Pendaftaran Anda untuk kategori <span className="font-semibold text-foreground">{kategori}</span> sedang
            kami verifikasi.
          </p>
          <dl className="mt-6 space-y-2 rounded-2xl border border-border bg-secondary/40 p-5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{perorangan ? "Nama Peserta" : "Ketua Tim"}</dt>
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
            Konfirmasi lolos verifikasi akan dikirim ke email {perorangan ? "peserta" : "ketua tim"}.
          </p>
          <button
            type="button"
            onClick={onReset}
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-secondary px-6 py-3 font-semibold text-secondary-foreground transition-colors hover:bg-secondary/70"
          >
            Daftar Lagi
          </button>
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