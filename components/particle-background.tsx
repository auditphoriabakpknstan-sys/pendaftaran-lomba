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

// Warna cadangan (hex) kalau browser tidak mendukung oklch() di dalam <canvas>.
const FALLBACK_PRIMARY = "#5B21B6"
const FALLBACK_ACCENT = "#F0C419"

function resolveThemeColor(cssVarValue: string, fallback: string) {
  if (typeof document === "undefined") return fallback
  const testCanvas = document.createElement("canvas")
  const testCtx = testCanvas.getContext("2d")
  if (!testCtx || !cssVarValue) return fallback

  testCtx.fillStyle = "#000000"
  testCtx.fillStyle = cssVarValue
  const accepted = testCtx.fillStyle !== "#000000"
  return accepted ? cssVarValue : fallback
}

export function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rootStyles = getComputedStyle(document.documentElement)
    const rawPrimary = rootStyles.getPropertyValue("--primary").trim()
    const rawAccent = rootStyles.getPropertyValue("--accent").trim()
    const primary = resolveThemeColor(rawPrimary, FALLBACK_PRIMARY)
    const accent = resolveThemeColor(rawAccent, FALLBACK_ACCENT)
    const colors = [primary, primary, accent]

    let particles: Particle[] = []
    let animationId = 0
    let width = 0
    let height = 0
    const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1

    function resize() {
      width = canvas!.width = window.innerWidth * dpr
      height = canvas!.height = window.innerHeight * dpr
    }

    function createParticles() {
      const count = Math.min(70, Math.max(28, Math.floor((width * height) / (24000 * dpr * dpr))))
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: (Math.random() * 2 + 1.2) * dpr,
        vx: (Math.random() - 0.5) * 0.08 * dpr,
        vy: -(Math.random() * 0.4 + 0.15) * dpr,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.4 + 0.25,
      }))
    }

    function draw() {
      ctx!.clearRect(0, 0, width, height)
      for (const p of particles) {
        ctx!.beginPath()
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx!.fillStyle = p.color
        ctx!.globalAlpha = p.alpha
        ctx!.fill()
      }
      ctx!.globalAlpha = 1
    }

    function tick() {
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < -10) p.x = width + 10
        if (p.x > width + 10) p.x = -10
        if (p.y < -10) {
          p.y = height + 10
          p.x = Math.random() * width
        }
      }
      draw()
      animationId = requestAnimationFrame(tick)
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    resize()
    createParticles()

    if (!prefersReducedMotion) {
      tick()
    } else {
      draw()
    }

    function handleResize() {
      resize()
      createParticles()
      if (prefersReducedMotion) draw()
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
      className="pointer-events-none fixed inset-0 -z-10 h-screen w-screen"
    />
  )
}
