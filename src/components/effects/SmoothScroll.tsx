'use client'

import { useEffect } from 'react'
import Lenis from 'lenis'

/**
 * Smooth scroll global usando Lenis (inspiração aerukart.com).
 *
 * Roda como Client Component invisível no <body>. Configurado pra:
 * - Não atrapalhar usuários com `prefers-reduced-motion: reduce`
 * - Não interceptar inputs ou rolagem em modais/dropdowns
 * - Easing suave mas curto (sensação responsiva, não "molenga")
 */
export function SmoothScroll() {
  useEffect(() => {
    // Respeita preferência de movimento reduzido (acessibilidade)
    if (typeof window === 'undefined') return
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const lenis = new Lenis({
      duration: 1.05,              // tempo do easing (1.05s = suave mas responsivo)
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // ease-out exponencial
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.4,
    })

    let rafId = 0
    function raf(time: number) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
    }
  }, [])

  return null
}
