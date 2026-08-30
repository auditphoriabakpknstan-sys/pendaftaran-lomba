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
  dx: number
  dy: number
  length: number
  tailAngle: number
  duration: number
  delay: number
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
  // Arah jatuh dihitung sebagai vektor (dx, dy) miring ke kanan-bawah,
  // ekor mengarah berlawanan dengan arah gerak biar keliatan "melesat".
  const meteors = useMemo<Meteor[]>(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const angleDeg = Math.random() * 12 + 30 // 30–42° dari horizontal, turun ke kanan
      const angleRad = (angleDeg * Math.PI) / 180
      const distance = Math.random() * 120 + 260
      return {
        top: `${Math.random() * 30}%`,
        left: `${Math.random() * 65}%`,
        dx: Math.cos(angleRad) * distance,
        dy: Math.sin(angleRad) * distance,
        length: Math.random() * 60 + 110,
        tailAngle: 180 + angleDeg, // ekor mengarah ke asal (belakang arah gerak)
        duration: Math.random() * 2.5 + 4.5,
        delay: i * 3.6 + Math.random() * -6,
      }
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
          className="meteor"
          style={
            {
              top: meteor.top,
              left: meteor.left,
              animationDuration: `${meteor.duration}s`,
              animationDelay: `${meteor.delay}s`,
              "--meteor-dx": `${meteor.dx}px`,
              "--meteor-dy": `${meteor.dy}px`,
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
