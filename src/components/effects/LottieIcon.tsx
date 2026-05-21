'use client'

import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'

interface LottieIconProps {
  /** Caminho relativo ao /public ou URL absoluta do .json */
  src: string
  /** Loop infinito? Default true */
  loop?: boolean
  /** Auto-play? Default true */
  autoplay?: boolean
  /** Width/height inline */
  size?: number
  /** Estilo customizado adicional */
  style?: CSSProperties
  /** Fallback estático mostrado em prefers-reduced-motion ou enquanto carrega */
  fallback?: React.ReactNode
  /** Aria-label pra acessibilidade */
  ariaLabel?: string
}

/**
 * Lê prefers-reduced-motion de forma síncrona. No SSR retorna false e o
 * primeiro render no cliente já resolve o valor real.
 */
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Wrapper de animação Lottie com:
 * - Lazy load do `lottie-react` (não carrega no bundle inicial)
 * - Fallback estático pra prefers-reduced-motion
 * - Skeleton enquanto animação carrega
 *
 * Use para success states, loading, empty states animados.
 */
export function LottieIcon({
  src,
  loop = true,
  autoplay = true,
  size = 80,
  style,
  fallback,
  ariaLabel,
}: LottieIconProps) {
  const [animationData, setAnimationData] = useState<unknown>(null)
  const [LottieComponent, setLottieComponent] = useState<React.ComponentType<{
    animationData: unknown
    loop?: boolean
    autoplay?: boolean
    style?: CSSProperties
  }> | null>(null)
  // reduced-motion resolvido no inicializador lazy (não em effect+setState):
  // evita o render em cascata e o valor já está correto no primeiro render.
  const [reducedMotion] = useState(prefersReducedMotion)

  useEffect(() => {
    // prefers-reduced-motion: não anima, usa fallback (já refletido no estado)
    if (reducedMotion) return

    let cancelled = false
    // Lazy load do lottie-react E do JSON em paralelo
    Promise.all([
      import('lottie-react'),
      fetch(src).then(r => r.ok ? r.json() : null),
    ]).then(([mod, data]) => {
      if (cancelled || !data) return
      setLottieComponent(() => mod.default)
      setAnimationData(data)
    }).catch(() => {
      // Fallback silencioso — UI continua usando o fallback estático
    })

    return () => { cancelled = true }
  }, [src, reducedMotion])

  const wrapperStyle: CSSProperties = {
    width: size,
    height: size,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...style,
  }

  if (reducedMotion || !LottieComponent || !animationData) {
    return (
      <div role="img" aria-label={ariaLabel} style={wrapperStyle}>
        {fallback}
      </div>
    )
  }

  return (
    <div role="img" aria-label={ariaLabel} style={wrapperStyle}>
      <LottieComponent
        animationData={animationData}
        loop={loop}
        autoplay={autoplay}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}
