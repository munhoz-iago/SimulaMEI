'use client'

import { useEffect, useState } from 'react'

/**
 * Cursor custom inspirado em portfólios designer (aerukart.com pattern).
 *
 * Comportamento:
 * - Círculo pequeno fixo no cursor (dot)
 * - Anel maior segue com lag suave (ring) — sensação de "peso"
 * - Quando passa sobre [data-cursor="hover"] ou <a>, <button>, o anel
 *   cresce e a cor muda pra accent
 * - Some quando o cursor sai da janela
 * - Esconde em touch devices (sem mouse real)
 * - Respeita prefers-reduced-motion (deixa cursor nativo)
 */
export function CustomCursor() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    // Detecta touch device — se for, não ativa
    if (typeof window === 'undefined') return
    const hasFinePointer = window.matchMedia('(pointer: fine)').matches
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!hasFinePointer || prefersReducedMotion) return

    setEnabled(true)

    const dot = document.getElementById('cc-dot') as HTMLDivElement | null
    const ring = document.getElementById('cc-ring') as HTMLDivElement | null
    if (!dot || !ring) return

    // Posições alvo (mouse) e atual (interpolada com lag)
    let mouseX = window.innerWidth / 2
    let mouseY = window.innerHeight / 2
    let ringX = mouseX
    let ringY = mouseY

    function onMove(e: MouseEvent) {
      mouseX = e.clientX
      mouseY = e.clientY
      if (dot) {
        dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`
      }
    }

    function onEnter() {
      if (dot) dot.style.opacity = '1'
      if (ring) ring.style.opacity = '1'
    }
    function onLeave() {
      if (dot) dot.style.opacity = '0'
      if (ring) ring.style.opacity = '0'
    }

    // Detecta hover em elementos interativos via event delegation
    function onMouseOver(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target?.closest) return
      const interactive = target.closest('a, button, [role="button"], input, select, textarea, [data-cursor="hover"]')
      if (interactive && ring) {
        ring.classList.add('is-hovering')
      } else if (ring) {
        ring.classList.remove('is-hovering')
      }
    }

    let rafId = 0
    function tick() {
      // Interpolação suave do anel (lag de ~12 frames)
      ringX += (mouseX - ringX) * 0.18
      ringY += (mouseY - ringY) * 0.18
      if (ring) {
        ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)

    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('mouseover', onMouseOver, { passive: true })
    document.addEventListener('mouseenter', onEnter)
    document.addEventListener('mouseleave', onLeave)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseover', onMouseOver)
      document.removeEventListener('mouseenter', onEnter)
      document.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  if (!enabled) return null

  return (
    <>
      <div id="cc-ring" className="cc-ring" aria-hidden="true" />
      <div id="cc-dot" className="cc-dot" aria-hidden="true" />
    </>
  )
}
