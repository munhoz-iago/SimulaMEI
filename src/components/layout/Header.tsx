'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

const NAV_LINKS = [
  { label: 'Início', href: '#inicio', id: 'inicio' },
  { label: 'Simulador', href: '#simulador', id: 'simulador' },
  { label: 'Como calcula', href: '#como-calcula', id: 'como-calcula' },
  { label: 'Aprenda', href: '/aprenda', id: '' },
  { label: 'Para contadores', href: '/para-contadores', id: '' },
]

export interface HeaderUser {
  email?: string | null
}

interface HeaderProps {
  user?: HeaderUser | null
}

// ThemeToggle agora vive em @/components/theme/ThemeToggle e é compartilhado
// entre Home e Dashboard, sincronizado via CustomEvent.

export function Header({ user = null }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeId, setActiveId] = useState<string>('')
  const observerRef = useRef<IntersectionObserver | null>(null)
  const isLoggedIn = Boolean(user)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', handler, { passive: true })
    handler()
    return () => window.removeEventListener('scroll', handler)
  }, [])

  // IntersectionObserver para nav link ativo
  useEffect(() => {
    const sectionIds = NAV_LINKS.map(l => l.id).filter(Boolean)
    observerRef.current = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActiveId(entry.target.id)
        })
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    )
    sectionIds.forEach(id => {
      const el = document.getElementById(id)
      if (el) observerRef.current?.observe(el)
    })
    return () => observerRef.current?.disconnect()
  }, [])

  return (
    <header
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        background: scrolled ? 'color-mix(in oklch, var(--bg0) 86%, transparent)' : 'transparent',
        borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
        backdropFilter: scrolled ? 'blur(20px) saturate(160%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(160%)' : 'none',
        transition: 'background-color 220ms var(--ease-out), border-color 220ms var(--ease-out), backdrop-filter 220ms var(--ease-out)',
      }}
    >
      <div style={{
        maxWidth: 1200, margin: '0 auto', padding: '0 40px',
        height: 64, display: 'flex', alignItems: 'center', gap: 32,
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, background: 'var(--lime)',
            borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-on-accent)" strokeWidth="3">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.03em', color: 'var(--text1)' }}>
            Simula<span style={{ color: 'var(--lime)' }}>MEI</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="desktop-only" style={{ display: 'flex', gap: 4, flex: 1 }}>
          {NAV_LINKS.map(link => {
            const isActive = link.id && activeId === link.id
            return (
              <a
                key={link.href}
                href={link.href}
                className="pressable"
                style={{
                  fontSize: 13, fontWeight: 500,
                  color: isActive ? 'var(--lime)' : 'var(--text2)',
                  padding: '6px 12px', borderRadius: 'var(--radius)',
                  position: 'relative',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.color = 'var(--text1)'
                    e.currentTarget.style.background = 'var(--bg2)'
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = isActive ? 'var(--lime)' : 'var(--text2)'
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                {link.label}
                {isActive && (
                  <span style={{
                    position: 'absolute', bottom: 2, left: 12, right: 12,
                    height: 1, background: 'var(--lime)', borderRadius: 1,
                    opacity: 0.6,
                  }} />
                )}
              </a>
            )
          })}
        </nav>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', alignItems: 'center' }}>
          <ThemeToggle />

          {isLoggedIn ? (
            <>
              <a
                href="/dashboard"
                className="desktop-only pressable"
                style={{
                  fontSize: 13, fontWeight: 600, color: 'var(--text2)',
                  padding: '8px 14px', borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--text2)'
                  e.currentTarget.style.color = 'var(--text1)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.color = 'var(--text2)'
                }}
              >
                Dashboard
              </a>
              <form action="/auth/logout" method="post" className="desktop-only" style={{ display: 'contents' }}>
                <button
                  type="submit"
                  className="pressable"
                  style={{
                    fontSize: 13, fontWeight: 500, color: 'var(--text2)',
                    padding: '8px 12px', borderRadius: 'var(--radius)',
                    border: '1px solid transparent',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = 'var(--text1)'
                    e.currentTarget.style.background = 'var(--bg2)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = 'var(--text2)'
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  Sair
                </button>
              </form>
            </>
          ) : (
            <a
              href="/auth/login"
              className="desktop-only pressable"
              style={{
                fontSize: 13, fontWeight: 500, color: 'var(--text2)',
                padding: '8px 14px', borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--text2)'
                e.currentTarget.style.color = 'var(--text1)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.color = 'var(--text2)'
              }}
            >
              Entrar
            </a>
          )}

          <a
            href="#simulador"
            className="pressable header-primary-cta"
            style={{
              fontSize: 13, fontWeight: 700,
              background: 'var(--lime)', color: 'var(--ink-on-accent)',
              padding: '8px 16px', borderRadius: 'var(--radius)',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = 'var(--lime-glow)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            Simular agora
          </a>

          <button
            className="mobile-only"
            type="button"
            onClick={() => setMenuOpen(v => !v)}
            style={{
              width: 36, height: 36, borderRadius: 'var(--radius)',
              background: 'var(--bg2)', border: '1px solid var(--border)',
              color: 'var(--text1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            aria-label="Menu"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {menuOpen
                ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
              }
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="mobile-only"
          style={{
            background: 'var(--bg1)', borderBottom: '1px solid var(--border)',
            padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 4,
          }}
        >
          {NAV_LINKS.map(link => (
            <a
              key={link.href}
              href={link.href}
              className="pressable"
              onClick={() => setMenuOpen(false)}
              style={{
                fontSize: 15, fontWeight: 500,
                color: link.id && activeId === link.id ? 'var(--lime)' : 'var(--text2)',
                padding: '10px 12px', borderRadius: 'var(--radius)',
              }}
            >
              {link.label}
            </a>
          ))}
          {isLoggedIn ? (
            <>
              <a
                href="/dashboard"
                onClick={() => setMenuOpen(false)}
                style={{
                  fontSize: 15, fontWeight: 700, color: 'var(--lime)',
                  padding: '10px 12px', borderRadius: 'var(--radius)',
                }}
              >
                Dashboard
              </a>
              <form action="/auth/logout" method="post">
                <button
                  type="submit"
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    fontSize: 15,
                    fontWeight: 600,
                    color: 'var(--text2)',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius)',
                    border: 0,
                    background: 'transparent',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Sair
                </button>
              </form>
            </>
          ) : (
            <a
              href="/auth/login"
              onClick={() => setMenuOpen(false)}
              style={{
                fontSize: 15, fontWeight: 600, color: 'var(--lime)',
                padding: '10px 12px', borderRadius: 'var(--radius)',
              }}
            >
              Entrar
            </a>
          )}
        </div>
      )}
    </header>
  )
}
