"use client"

import { useMemo } from "react"

type Dot = {
  left: string
  size: number
  duration: number
  delay: number
  color: "primary" | "accent"
  opacity: number
}

export function ParticleBackground() {
  const dots = useMemo<Dot[]>(() => {
    return Array.from({ length: 40 }, (_, i) => ({
      left: `${Math.random() * 100}%`,
      size: Math.random() * 10 + 6,
      duration: Math.random() * 10 + 10,
      delay: Math.random() * -20,
      color: i % 3 === 0 ? "accent" : "primary",
      opacity: Math.random() * 0.35 + 0.35,
    }))
  }, [])

  return (
    <div
      aria-hidden="true"
      // Sebelumnya "-z-10" — z-index NEGATIF di sini yang bikin animasi tidak
      // pernah kelihatan: <body> di globals.css punya bg-background tapi
      // position-nya "static" (default), jadi background body itu digambar
      // SETELAH (menutupi) elemen ber-z-index negatif di dalamnya. Dengan
      // z-0, elemen ini tetap di belakang konten form (karena dirender lebih
      // dulu di JSX & konten form biasanya z-auto/positioned di atasnya),
      // tapi tidak lagi ketutupan background body.
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {dots.map((dot, i) => (
        <span
          key={i}
          className="particle-dot"
          style={{
            left: dot.left,
            width: dot.size,
            height: dot.size,
            backgroundColor: dot.color === "primary" ? "var(--primary)" : "var(--accent)",
            opacity: dot.opacity,
            animationDuration: `${dot.duration}s`,
            animationDelay: `${dot.delay}s`,
          }}
        />
      ))}
    </div>
  )
}
