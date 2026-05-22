'use client'

import Link from 'next/link'
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import type { CnaeInfo } from '@/types/tributario'
import { buscarCnaes, getCnaesAgrupados } from '@/lib/tributario'
import { Badge } from '@/components/ui'

interface CnaeAutocompleteProps {
  value: CnaeInfo | null
  onChange: (cnae: CnaeInfo | null) => void
  inputId?: string
  /** Página de origem — determina para onde o link "ver ficha" aponta como ?back= */
  origin?: string
}

const ANEXO_COLORS: Record<string, string> = {
  I: 'var(--blue)',
  II: 'var(--blue)',
  III: 'var(--lime)',
  IV: 'var(--yellow)',
  V: 'var(--orange)',
}

const CATEGORIA_LABEL: Record<CnaeInfo['categoria'], string> = {
  ti_consultoria: 'TI / Consultoria',
  servicos: 'Serviços',
  comercio: 'Comércio',
  construcao: 'Construção',
  industria: 'Indústria',
}

const CATEGORIA_ORDER: CnaeInfo['categoria'][] = [
  'ti_consultoria',
  'servicos',
  'comercio',
  'construcao',
  'industria',
]

function getRegraCnaeLabel(cnae: CnaeInfo) {
  if (cnae.elegivelFatorR || cnae.fator_r_aplicavel) return 'Sujeito ao Fator R · Anexo III ou V'
  if (cnae.anexoPadrao === 'III') return 'Anexo III fixo — Fator R não se aplica'
  return `Anexo ${cnae.anexoPadrao} fixo`
}

function isClassificacaoPendente(cnae: CnaeInfo) {
  return cnae.classificacaoTributaria === 'pendente'
}

function CnaeRow({
  c,
  isLast,
  onSelect,
  fichaHref,
}: {
  c: CnaeInfo
  isLast: boolean
  onSelect: (c: CnaeInfo) => void
  fichaHref: string
}) {
  const pendente = isClassificacaoPendente(c)
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        width: '100%', padding: '10px 14px',
        background: 'none',
        borderBottom: !isLast ? '1px solid var(--border)' : 'none',
        color: 'var(--text1)', textAlign: 'left',
        transition: 'background .1s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >
      <button
        type="button"
        onClick={() => onSelect(c)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          flex: 1, minWidth: 0,
          background: 'none', border: 'none', padding: 0,
          color: 'var(--text1)', textAlign: 'left', cursor: 'pointer',
        }}
      >
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)', flexShrink: 0, minWidth: 88 }}>
          {c.cnae}
        </span>
        <span style={{ fontSize: 13, flex: 1, lineHeight: 1.4 }}>{c.descricao}</span>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
          {pendente ? (
            <Badge color="var(--yellow)" small>CNAE oficial</Badge>
          ) : (
            <Badge color={c.categoria === 'ti_consultoria' ? 'var(--lime)' : 'var(--blue)'} small>
              {CATEGORIA_LABEL[c.categoria]}
            </Badge>
          )}
          {!pendente && c.elegivelFatorR && (
            <Badge color="var(--yellow)" small>III ou V</Badge>
          )}
        </div>
      </button>
      {pendente && (
        <Link
          href={fichaHref}
          style={{ color: 'var(--lime)', fontSize: 11, textDecoration: 'none', padding: '2px 0', flexShrink: 0 }}
        >
          ver ficha
        </Link>
      )}
    </div>
  )
}

export function CnaeAutocomplete({ value, onChange, inputId, origin }: CnaeAutocompleteProps) {
  const [query, setQuery] = useState(value?.descricao ?? '')
  const [open, setOpen] = useState(false)
  const [menuPlacement, setMenuPlacement] = useState<'down' | 'up'>('down')
  const [menuMaxHeight, setMenuMaxHeight] = useState(420)
  const [focused, setFocused] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const agrupados = useMemo(() => getCnaesAgrupados(5), [])

  const searchResults = useMemo(() => {
    if (!query || query.length < 2) return null
    return buscarCnaes(query).slice(0, 10)
  }, [query])

  const updateMenuLayout = useCallback(() => {
    if (typeof window === 'undefined' || !ref.current) return

    const rect = ref.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom - 12
    const spaceAbove = rect.top - 12
    const shouldOpenUp = spaceBelow < 260 && spaceAbove > spaceBelow
    const availableSpace = shouldOpenUp ? spaceAbove : spaceBelow

    setMenuPlacement(shouldOpenUp ? 'up' : 'down')
    setMenuMaxHeight(Math.min(420, Math.max(160, availableSpace)))
  }, [])

  const openMenu = useCallback(() => {
    setOpen(true)
    requestAnimationFrame(updateMenuLayout)
  }, [updateMenuLayout])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!open) return

    updateMenuLayout()
    window.addEventListener('resize', updateMenuLayout)
    window.addEventListener('scroll', updateMenuLayout, true)

    return () => {
      window.removeEventListener('resize', updateMenuLayout)
      window.removeEventListener('scroll', updateMenuLayout, true)
    }
  }, [open, updateMenuLayout])

  function select(cnae: CnaeInfo) {
    setQuery(cnae.descricao)
    onChange(cnae)
    setOpen(false)
  }

  function fichaHref(cnae: CnaeInfo) {
    const base = `/cnae/${encodeURIComponent(cnae.cnae)}`
    return origin ? `${base}?back=${encodeURIComponent(origin)}` : base
  }

  return (
    <div className="cnae-autocomplete" ref={ref} style={{ position: 'relative', zIndex: open ? 40 : 1 }}>
      <div
        style={{
          display: 'flex', alignItems: 'center',
          background: 'var(--bg2)',
          border: `1px solid ${focused ? 'var(--blue)' : 'var(--border)'}`,
          borderRadius: 'var(--radius)', padding: '0 12px', gap: 8,
          transition: 'border-color .15s',
        }}
      >
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          id={inputId}
          value={query}
          onChange={e => {
            setQuery(e.target.value)
            openMenu()
            onChange(null)
          }}
          onFocus={() => { setFocused(true); openMenu() }}
          onBlur={() => setFocused(false)}
          placeholder="Busque atividade ou código CNAE..."
          style={{
            background: 'none', border: 'none', outline: 'none',
            color: 'var(--text1)', fontSize: 14, padding: '12px 0',
            width: '100%', fontFamily: 'var(--sans)',
          }}
        />
        {value && (
          <Badge
            color={isClassificacaoPendente(value) ? 'var(--yellow)' : ANEXO_COLORS[value.anexoPadrao] ?? 'var(--lime)'}
            small
          >
            {isClassificacaoPendente(value)
              ? 'Validar anexo'
              : value.elegivelFatorR ? 'III/V' : `Anexo ${value.anexoPadrao}`}
          </Badge>
        )}
      </div>
      {value && !isClassificacaoPendente(value) && (
        <div style={{
          marginTop: 8,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 8px',
          border: `1px solid ${value.elegivelFatorR ? 'rgba(245,197,66,0.24)' : 'rgba(200,241,53,0.18)'}`,
          borderRadius: 'var(--radius-sm)',
          background: value.elegivelFatorR ? 'rgba(245,197,66,0.07)' : 'rgba(200,241,53,0.05)',
          color: value.elegivelFatorR ? 'var(--yellow)' : 'var(--lime)',
          fontSize: 11,
          fontWeight: 700,
        }}>
          {getRegraCnaeLabel(value)}
        </div>
      )}

      {open && (
        <div
          className="cnae-autocomplete-menu"
          style={{
            position: 'absolute',
            top: menuPlacement === 'down' ? 'calc(100% + 4px)' : undefined,
            bottom: menuPlacement === 'up' ? 'calc(100% + 4px)' : undefined,
            left: 0,
            right: 0,
            background: 'var(--bg2)', border: '1px solid var(--border2)',
            borderRadius: 'var(--radius)', zIndex: 50,
            boxShadow: '0 8px 32px rgba(0,0,0,.4)',
            maxHeight: menuMaxHeight,
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {/* Busca ativa */}
          {searchResults && searchResults.length > 0 && (
            <>
              <SectionHeader label={`${searchResults.length} resultado${searchResults.length > 1 ? 's' : ''}`} />
              {searchResults.map((c, i) => (
                <CnaeRow key={c.cnae} c={c} isLast={i === searchResults.length - 1} onSelect={select} fichaHref={fichaHref(c)} />
              ))}
            </>
          )}

          {searchResults && searchResults.length === 0 && (
            <div style={{ padding: '16px 14px', fontSize: 13, color: 'var(--text3)', lineHeight: 1.6 }}>
              <p style={{ margin: '0 0 10px' }}>
                Nenhum CNAE encontrado. <b>Nem toda atividade é permitida ao MEI</b> —
                tente o código oficial (formato 0000-0/00) ou a descrição exata.
              </p>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <Link href="/cnae" style={{ color: 'var(--lime)', textDecoration: 'none', fontWeight: 700 }}>
                  Buscar na base completa →
                </Link>
                <Link href="/aprenda/quando-sair-do-mei" style={{ color: 'var(--blue)', textDecoration: 'none', fontWeight: 700 }}>
                  Quando sair do MEI →
                </Link>
                <a
                  href={`mailto:?subject=${encodeURIComponent('Sugerir CNAE — SimulaMEI')}&body=${encodeURIComponent('Atividade/código CNAE que não encontrei: ')}`}
                  style={{ color: 'var(--text2)', textDecoration: 'none', fontWeight: 700 }}
                >
                  Sugerir CNAE
                </a>
              </div>
            </div>
          )}

          {/* Lista por categorias (sem query) */}
          {!searchResults && CATEGORIA_ORDER.map(cat => {
            const items = agrupados[cat]
            if (!items || items.length === 0) return null
            return (
              <div key={cat}>
                <SectionHeader label={CATEGORIA_LABEL[cat]} />
                {items.map((c, i) => (
                  <CnaeRow key={c.cnae} c={c} isLast={i === items.length - 1} onSelect={select} fichaHref={fichaHref(c)} />
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{
      padding: '8px 14px 4px',
      fontSize: 10, color: 'var(--text3)',
      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg1)',
    }}>
      {label}
    </div>
  )
}
