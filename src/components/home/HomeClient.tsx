'use client'

import { useState, useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import type { ResultadoSimulacao } from '@/types/tributario'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { HeroSection } from '@/components/layout/HeroSection'
import { HowWeCalculate } from '@/components/layout/HowWeCalculate'
import { ContadoresSection } from '@/components/layout/ContadoresSection'
import { SectionNav } from '@/components/layout/SectionNav'
import { SimulatorSection } from '@/components/simulador/SimulatorSection'
import { PartialResults } from '@/components/resultado/PartialResults'
import { FullResults } from '@/components/resultado/FullResults'

type Theme = 'dark' | 'light'

const THEME_KEY = 'simulamei-theme'
const THEME_CHANGE_EVENT = 'simulamei-theme-change'

interface HomeClientProps {
  initialResultado?: ResultadoSimulacao | null
}

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'

  try {
    const saved = window.localStorage.getItem(THEME_KEY)
    return saved === 'dark' || saved === 'light' ? saved : 'dark'
  } catch {
    return 'dark'
  }
}

function subscribeThemeChange(onStoreChange: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange)
  window.addEventListener('storage', onStoreChange)

  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange)
    window.removeEventListener('storage', onStoreChange)
  }
}

function getServerThemeSnapshot(): Theme {
  return 'dark'
}

function saveTheme(theme: Theme) {
  try {
    window.localStorage.setItem(THEME_KEY, theme)
  } catch {}

  window.dispatchEvent(new Event(THEME_CHANGE_EVENT))
}

export function HomeClient({ initialResultado = null }: HomeClientProps) {
  const theme = useSyncExternalStore(subscribeThemeChange, readStoredTheme, getServerThemeSnapshot)
  const [resultado, setResultado] = useState<ResultadoSimulacao | null>(initialResultado)
  const [isSharedResult, setIsSharedResult] = useState(Boolean(initialResultado))
  const [unlocked, setUnlocked] = useState(false)
  const [unlockedEmail, setUnlockedEmail] = useState('')
  const resultadoRef = useRef<HTMLDivElement>(null)
  const fullResultRef = useRef<HTMLDivElement>(null)
  const shouldScrollSharedResult = useRef(Boolean(initialResultado))

  useEffect(() => {
    if (!shouldScrollSharedResult.current) return
    shouldScrollSharedResult.current = false

    const timeoutId = window.setTimeout(() => {
      resultadoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const handleToggleTheme = useCallback(() => {
    saveTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme])

  const handleResults = useCallback((res: ResultadoSimulacao) => {
    setResultado(res)
    setIsSharedResult(false)
    setUnlocked(false)
    setTimeout(() => {
      resultadoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }, [])

  const handleUnlock = useCallback((email: string) => {
    setUnlockedEmail(email)
    setUnlocked(true)
    setTimeout(() => {
      fullResultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }, [])

  return (
    <div className="site-shell">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-[var(--lime)] focus:px-4 focus:py-3 focus:font-black focus:text-[var(--ink-on-accent)]"
      >
        Pular para o conteúdo
      </a>
      <Header theme={theme} onToggle={handleToggleTheme} />
      <SectionNav
        items={[
          { id: 'inicio', label: 'Início' },
          { id: 'simulador', label: 'Simulador' },
          ...(resultado ? [{ id: 'resultado', label: 'Resultado' }] : []),
          { id: 'como-calcula', label: 'Método' },
          { id: 'contadores', label: 'Contadores' },
        ]}
      />
      <main id="main-content" tabIndex={-1}>
        <HeroSection />
        <SimulatorSection onResults={handleResults} />

        {resultado && (
          <div id="resultado" ref={resultadoRef} style={{ scrollMarginTop: 88 }}>
            {isSharedResult && (
              <div className="shared-result-banner" style={{
                maxWidth: 1200,
                margin: '0 auto 18px',
                padding: '0 40px',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  padding: '14px 18px',
                  border: '1px solid rgba(200,241,53,0.22)',
                  background: 'linear-gradient(135deg, rgba(200,241,53,0.08), rgba(75,158,255,0.04))',
                  borderRadius: 'var(--radius-lg)',
                  color: 'var(--text2)',
                  fontSize: 13,
                }}>
                  <span>
                    <strong style={{ color: 'var(--lime)' }}>Resultado compartilhado.</strong>{' '}
                    Estes números foram enviados por link para facilitar a conversa com o contador.
                  </span>
                  <a href="#simulador" className="pressable" style={{
                    color: 'var(--lime)',
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                  }}>
                    Refazer simulação
                  </a>
                </div>
              </div>
            )}
            <PartialResults resultado={resultado} onUnlock={handleUnlock} />
          </div>
        )}

        {resultado && unlocked && (
          <div ref={fullResultRef}>
            <FullResults resultado={resultado} email={unlockedEmail} />
          </div>
        )}

        <HowWeCalculate />
        <ContadoresSection />
      </main>
      <Footer />
    </div>
  )
}
