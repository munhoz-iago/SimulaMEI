'use client'

import { useEffect, useState } from 'react'
import type { ResultadoSimulacao } from '@/types/tributario'

interface ShareResultButtonProps {
  resultado: ResultadoSimulacao
  variant?: 'partial' | 'full'
}

/**
 * Botão que gera link compartilhável da simulação.
 *
 * Os parâmetros da simulação são codificados em base64url no parâmetro `s=`
 * para evitar exposição direta de faturamento/CNAE/folha em query strings
 * legíveis (logs de servidor, referrer, histórico do browser). Não é segurança
 * real — apenas reduz leakage casual em logs.
 *
 * Em mobile com `navigator.share`, usa a sheet nativa do sistema.
 * Senão, copia pro clipboard com feedback visual.
 */
export function ShareResultButton({ resultado, variant = 'partial' }: ShareResultButtonProps) {
  const [copied, setCopied] = useState(false)
  const { entrada, alertaTeto } = resultado
  const pct = Math.round((alertaTeto.projecaoAnual / alertaTeto.tetoAnual) * 100)

  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(false), 2500)
    return () => window.clearTimeout(t)
  }, [copied])

  function buildShareUrl() {
    const payload = {
      fat: entrada.faturamentoAcumulado,
      mes: entrada.mesAtual,
      cnae: entrada.cnae,
      folha: entrada.folhaMensal,
      tipo: entrada.tipoMei,
    }
    // base64url: substitui +/= por -_ e remove padding
    const b64 = window.btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    return `${window.location.origin}/?s=${b64}`
  }

  async function handleShare() {
    const url = buildShareUrl()
    const text = `Minha simulação MEI 2026 — ${pct}% do teto usado. Veja a análise: ${url}`

    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title: 'Simulação MEI — SimulaMEI', text, url })
        setCopied(true)
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
        // outros erros: cai pro fallback de clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {}
  }

  const label = variant === 'full'
    ? 'Compartilhar análise completa'
    : 'Compartilhar resultado com contador'

  return (
    <div style={{ marginBottom: 24 }}>
      <button
        type="button"
        className="pressable"
        onClick={handleShare}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 18px',
          background: copied ? 'rgba(200,241,53,0.08)' : 'var(--bg2)',
          border: `1px solid ${copied ? 'rgba(200,241,53,0.3)' : 'var(--border2)'}`,
          borderRadius: 'var(--radius)', color: copied ? 'var(--lime)' : 'var(--text2)',
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}
      >
        {copied ? (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Compartilhado!
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <polyline points="16 6 12 2 8 6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
            {label}
          </>
        )}
      </button>
      {copied && (
        <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
          Link com seus dados copiado — envie pro seu contador ver a análise.
        </p>
      )}
    </div>
  )
}
