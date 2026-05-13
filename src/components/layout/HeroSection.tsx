'use client'

import { CNAE_OFICIAL_TOTAL, LIMITES_MEI } from '@/lib/tributario'
import { fmt, fmtPct } from '@/lib/format'
import { MonoVal, Badge } from '@/components/ui'

const HERO_TAGS = ['Regra vigente 2026', '1.331 CNAEs', 'Fator R', 'Link compartilhável']

const PREVIEW_FAT = 67500
const PREVIEW_MES = 5
const PREVIEW_PROJECAO = (PREVIEW_FAT / PREVIEW_MES) * 12
const PREVIEW_FATOR_R = 0.28
const PREVIEW_ECONOMIA = 12400

function HeroPreviewCard() {
  const teto = LIMITES_MEI.geral.anual
  const pct = (PREVIEW_FAT / teto) * 100
  const excesso = PREVIEW_PROJECAO / teto

  return (
    <div className="instrument-panel" style={{ position: 'relative' }}>
      <div className="instrument-panel-header">
        <span className="instrument-label">Prévia do resultado</span>
        <Badge color="var(--yellow)">Atenção</Badge>
      </div>
      <div style={{ padding: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 14, alignItems: 'stretch', marginBottom: 22 }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
            <div className="instrument-label" style={{ marginBottom: 8 }}>Hoje</div>
            <MonoVal size={26}>{fmt(PREVIEW_FAT)}</MonoVal>
            <div style={{ color: 'var(--text2)', fontSize: 12, marginTop: 6 }}>{pct.toFixed(0)}% do teto usado</div>
          </div>
          <div style={{ display: 'grid', placeItems: 'center', color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 12 }}>→</div>
          <div style={{ background: 'oklch(82% 0.15 85 / 0.08)', border: '1px solid oklch(82% 0.15 85 / 0.24)', borderRadius: 'var(--radius)', padding: 16 }}>
            <div className="instrument-label" style={{ marginBottom: 8 }}>Projeção 12 meses</div>
            <MonoVal size={26} color="var(--yellow)">{fmt(PREVIEW_PROJECAO)}</MonoVal>
            <div style={{ color: 'var(--yellow)', fontSize: 12, marginTop: 6 }}>{fmtPct(excesso - 1)} acima do teto</div>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>Uso do teto MEI 2026</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 800, color: 'var(--yellow)' }}>{pct.toFixed(0)}%</span>
          </div>
          <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: pct + '%', background: 'var(--yellow)', borderRadius: 999, transition: 'width 600ms var(--ease-out)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
            <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--text3)' }}>R$ 0</span>
            <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--text3)' }}>{fmt(teto)} teto</span>
          </div>
        </div>

        <div className="evidence-strip" style={{ marginBottom: 18 }}>
          <span className="evidence-pill">Fator R {fmtPct(PREVIEW_FATOR_R)}</span>
          <span className="evidence-pill">Anexo III provável</span>
          <span className="evidence-pill">Compartilhar</span>
        </div>

        <div style={{
          background: 'oklch(88% 0.19 126 / 0.07)',
          border: '1px solid oklch(88% 0.19 126 / 0.18)',
          borderRadius: 'var(--radius)',
          padding: '12px 14px',
          display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center',
        }}>
          <span style={{ fontSize: 12, color: 'var(--text2)' }}>Economia estimada ao planejar agora</span>
          <MonoVal size={16} color="var(--lime)">+{fmt(PREVIEW_ECONOMIA)}/ano</MonoVal>
        </div>
      </div>
    </div>
  )
}

export function HeroSection() {
  return (
    <section id="inicio" style={{ paddingTop: 118, paddingBottom: 16, overflow: 'hidden', position: 'relative' }}>
      <div className="section-shell hero-section-inner">
        <div
          style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(340px, 0.9fr)', gap: 60, alignItems: 'center' }}
          className="hero-grid"
        >
          {/* Left */}
          <div>
            {/* Tags: mono inline row */}
            <div className="fade-up" style={{
              fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)',
              letterSpacing: '0.05em', marginBottom: 26,
              display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0,
            }}>
              {HERO_TAGS.map((t, i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text2)' }}>{t}</span>
                  {i < HERO_TAGS.length - 1 && (
                    <span aria-hidden="true" style={{ margin: '0 10px', color: 'var(--border2)' }}>·</span>
                  )}
                </span>
              ))}
            </div>

            {/* Headline: oversized, tight */}
            <h1 className="fade-up-2" style={{
              fontSize: 'clamp(46px, 7.5vw, 92px)',
              fontWeight: 900,
              lineHeight: 0.92,
              letterSpacing: '-0.03em',
              marginBottom: 24,
              textWrap: 'balance',
            }}>
              O teto do MEI não deveria ser descoberto no susto.
            </h1>

            {/* Subhead */}
            <p className="fade-up-3" style={{
              fontSize: 'clamp(15px, 1.5vw, 17px)',
              color: 'var(--text2)',
              lineHeight: 1.65,
              marginBottom: 36,
              maxWidth: 460,
            }}>
              Simule teto, Fator R e Anexo do Simples com dados reais. O resultado sai pronto para decidir, salvar ou mandar ao contador.
            </p>

            {/* Stats: tabular */}
            <div className="fade-up-4" style={{ display: 'flex', gap: 36, flexWrap: 'wrap', marginBottom: 36, alignItems: 'flex-end' }}>
              {[
                { value: CNAE_OFICIAL_TOTAL.toLocaleString('pt-BR'), label: 'CNAEs oficiais' },
                { value: '4', label: 'regimes comparados' },
                { value: '100%', label: 'gratuito, sem cadastro' },
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontWeight: 900, fontSize: 'clamp(18px, 2vw, 22px)', color: 'var(--text1)', lineHeight: 1 }}>
                    {s.value}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.02em' }}>{s.label}</span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="fade-up-5" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a href="#simulador" className="pressable hero-cta-primary">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
                Simular agora
              </a>
              <a href="#como-calcula" className="pressable hero-cta-secondary">
                Como o cálculo funciona
                <span className="hero-arrow">→</span>
              </a>
            </div>
          </div>

          {/* Right: preview card */}
          <div className="fade-up-3 desktop-only">
            <HeroPreviewCard />
          </div>
        </div>
      </div>
      <div className="hero-gradient-fade" />
    </section>
  )
}
