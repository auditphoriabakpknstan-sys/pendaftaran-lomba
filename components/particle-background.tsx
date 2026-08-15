"use client"

import { useEffect, useRef } from "react"

type Particle = {
  x: number
  y: number
  r: number
  vx: number
  vy: number
  color: string
  alpha: number
}

/**
 * Latar belakang partikel naik ke atas, warnanya diambil langsung dari
 * CSS variable tema (--primary & --accent) supaya palet warna
 * selalu ikut tema yang sudah ada, tanpa perlu di-hardcode.
 */
export function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rootStyles = getComputedStyle(document.documentElement)
    const primary = rootStyles.getPropertyValue("--primary").trim() || "oklch(0.52 0.23 285)"
    const accent = rootStyles.getPropertyValue("--accent").trim() || "oklch(0.83 0.16 82)"
    const colors = [primary, primary, accent] // primary muncul lebih sering daripada accent

    let particles: Particle[] = []
    let animationId = 0
    let width = 0
    let height = 0
    const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1

    function resize() {
      const parent = canvas!.parentElement
      width = canvas!.width = (parent?.clientWidth ?? window.innerWidth) * dpr
      height = canvas!.height = (parent?.clientHeight ?? window.innerHeight) * dpr
      canvas!.style.width = "100%"
      canvas!.style.height = "100%"
    }

    function createParticles() {
      const count = Math.min(60, Math.max(24, Math.floor((width * height) / (28000 * dpr * dpr))))
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: (Math.random() * 1.6 + 0.8) * dpr,
        vx: (Math.random() - 0.5) * 0.08 * dpr, // sedikit goyang kiri-kanan
        vy: -(Math.random() * 0.35 + 0.12) * dpr, // selalu naik ke atas
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.35 + 0.12,
      }))
    }

    function tick() {
      ctx!.clearRect(0, 0, width, height)
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < -10) p.x = width + 10
        if (p.x > width + 10) p.x = -10
        if (p.y < -10) {
          // sampai atas, muncul lagi dari bawah dengan posisi x acak baru
          p.y = height + 10
          p.x = Math.random() * width
        }

        ctx!.beginPath()
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx!.fillStyle = p.color
        ctx!.globalAlpha = p.alpha
        ctx!.fill()
      }
      ctx!.globalAlpha = 1
      animationId = requestAnimationFrame(tick)
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    resize()
    createParticles()

    if (!prefersReducedMotion) {
      tick()
    } else {
      // Kalau user set "reduce motion", tampilkan partikel statis saja (tidak bergerak)
      ctx.clearRect(0, 0, width, height)
      for (const p of particles) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.alpha
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    function handleResize() {
      resize()
      createParticles()
    }
    window.addEventListener("resize", handleResize)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
    />
  )
}
