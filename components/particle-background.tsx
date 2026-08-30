"use client"
import { useMemo } from "react"

type Star = {
  top: string
  left: string
  size: number
  duration: number
  delay: number
  minOpacity: number
  maxOpacity: number
}

type Meteor = {
  top: string
  left: string
  dx: string
  dy: string
  length: number
  tailAngle: number
  duration: number
  delay: number
  variant: "sky" | "ground"
}

export function ParticleBackground() {
  // Bintang kecil berkelap-kelip, disebar di 72% area atas (sisa dibiarkan
  // lebih "bersih" untuk area glow horizon + siluet lanskap gurun).
  const stars = useMemo<Star[]>(() => {
    return Array.from({ length: 160 }, () => ({
      top: `${Math.random() * 72}%`,
      left: `${Math.random() * 100}%`,
      size: Math.random() * 2 + 1,
      duration: Math.random() * 3 + 2.5,
      delay: Math.random() * -6,
      minOpacity: Math.random() * 0.2 + 0.1,
      maxOpacity: Math.random() * 0.35 + 0.65,
    }))
  }, [])

  // Meteor / bintang jatuh — delay panjang & acak biar muncul sesekali.
  // Sebagian ("ground") sengaja dibuat jaraknya cukup jauh sampai nyaris
  // menyentuh garis horizon/siluet tanah sebelum fade, sisanya ("sky")
  // tetap fade di tengah langit seperti sebelumnya — biar variatif.
  const meteors = useMemo<Meteor[]>(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const angleDeg = Math.random() * 12 + 30 // 30–42° dari horizontal
      const angleRad = (angleDeg * Math.PI) / 180
      const toGround = i % 3 === 0 // sekitar 1 dari 3 meteor jatuh sampai tanah
      const startTop = Math.random() * 22 // mulai di 0–22% tinggi layar

      // dy dihitung dalam satuan vh, jadi langsung setara persen tinggi
      // layar yang ditempuh — memudahkan menargetkan dekat siluet tanah.
      const dyVh = toGround
        ? Math.random() * 8 + 88 - startTop // nyaris sampai 88–96% tinggi layar
        : Math.random() * 18 + 22 // fade di tengah langit (22–40vh)
      const dxVh = dyVh / Math.tan(angleRad)

      return {
        top: `${startTop}%`,
        left: `${Math.random() * (toGround ? 50 : 65)}%`,
        dx: `${dxVh.toFixed(1)}vh`,
        dy: `${dyVh.toFixed(1)}vh`,
        length: Math.random() * 60 + 110,
        tailAngle: 180 + angleDeg,
        duration: toGround ? Math.random() * 2 + 6.5 : Math.random() * 2.5 + 4.5,
        delay: i * 3.6 + Math.random() * -6,
        variant: toGround ? "ground" : "sky",
      } satisfies Meteor
    })
  }, [])

  return (
    <div
      aria-hidden="true"
      className="night-sky pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* Pita Milky Way miring + lapisan nebula halus */}
      <div className="sky-nebula" />
      <div className="milky-way" />

      {/* Siluet awan tipis melintang di tengah langit */}
      <div className="cloud-layer cloud-layer--1" />
      <div className="cloud-layer cloud-layer--2" />

      {stars.map((star, i) => (
        <span
          key={`star-${i}`}
          className="star-dot"
          style={
            {
              top: star.top,
              left: star.left,
              width: star.size,
              height: star.size,
              animationDuration: `${star.duration}s`,
              animationDelay: `${star.delay}s`,
              "--star-min-opacity": star.minOpacity,
              "--star-max-opacity": star.maxOpacity,
            } as React.CSSProperties
          }
        />
      ))}

      {meteors.map((meteor, i) => (
        <span
          key={`meteor-${i}`}
          className={`meteor${meteor.variant === "ground" ? " meteor--ground" : ""}`}
          style={
            {
              top: meteor.top,
              left: meteor.left,
              animationDuration: `${meteor.duration}s`,
              animationDelay: `${meteor.delay}s`,
              "--meteor-dx": meteor.dx,
              "--meteor-dy": meteor.dy,
              "--meteor-length": `${meteor.length}px`,
              "--meteor-tail-angle": `${meteor.tailAngle}deg`,
            } as React.CSSProperties
          }
        />
      ))}

      {/* Glow kehijauan/teal di garis horizon */}
      <div className="horizon-glow" aria-hidden="true" />

      {/* Siluet dune / bukit pasir di bagian paling bawah layar */}
      <svg
        className="absolute inset-x-0 bottom-0 w-full"
        viewBox="0 0 1440 160"
        preserveAspectRatio="none"
        style={{ height: "18vh" }}
        aria-hidden="true"
      >
        <path
          d="M0,130 L100,115 L220,138 L340,100 L460,132 L580,92 L700,124 L820,102 L940,134 L1060,96 L1180,126 L1300,106 L1440,120 L1440,160 L0,160 Z"
          fill="#010305"
        />
      </svg>

      {/* Kilau lembut di garis air, meniru pantulan cahaya di gambar referensi */}
      <svg
        className="absolute inset-x-0 bottom-0 w-full water-glint"
        viewBox="0 0 1440 40"
        preserveAspectRatio="none"
        style={{ height: "5vh" }}
        aria-hidden="true"
      >
        <ellipse cx="420" cy="20" rx="90" ry="6" fill="rgba(120,220,210,0.35)" />
        <ellipse cx="980" cy="18" rx="60" ry="5" fill="rgba(150,230,255,0.25)" />
      </svg>
    </div>
  )
}
