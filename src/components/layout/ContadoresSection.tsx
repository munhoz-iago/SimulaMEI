'use client'

import { AccountantLeadForm } from '@/components/accountant/AccountantLeadForm'

const FEATURES = [
  'Relatório exportável em PDF com seus dados',
  'API disponível para integração com sistemas contábeis',
  'Motor de cálculo auditável e versionado',
  'Suporte a múltiplos CNAEs e regimes',
]

const PLANS_PREVIEW = [
  { name: 'Starter', price: 'R$ 97/mês', limit: 'Até 30 clientes', cta: 'Quero o Starter', carteiraHint: '21-50' },
  { name: 'Pro', price: 'R$ 247/mês', limit: 'Até 150 clientes', highlight: true, cta: 'Quero o Pro', carteiraHint: '51-150' },
  { name: 'Enterprise', price: 'Sob consulta', limit: 'Sem limite', cta: 'Falar com equipe', carteiraHint: '150+' },
]

export function ContadoresSection() {
  return (
    <section id="contadores" style={{ padding: '96px 0 110px', background: 'var(--bg1)', borderTop: '1px solid var(--border)' }}>
      <div className="section-shell">
        <div className="im-section-header">
          <span className="im-section-number" data-reveal>03 / Contadores</span>
          <div data-reveal style={{ '--reveal-delay': '80' } as React.CSSProperties}>
            <h2 className="im-section-title">Um painel de carteira antes da urgência aparecer.</h2>
            <p className="im-section-lead">
              A versão para escritórios transforma simulações avulsas em triagem recorrente: clientes em risco, relatórios por conversa e alertas de teto.
            </p>
          </div>
        </div>
        <div
          style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.05fr) minmax(340px, 0.95fr)', gap: 50, alignItems: 'start' }}
          className="cnt-grid"
        >
          {/* Left: pitch */}
          <div className="instrument-panel" data-reveal style={{ '--reveal-delay': '160' } as React.CSSProperties}>
            <div className="instrument-panel-header">
              <span className="instrument-label">Rotina do escritório</span>
              <span style={{ color: 'var(--orange)', fontSize: 12, fontWeight: 900 }}>150+ clientes</span>
            </div>

            <div style={{ padding: 28 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13, marginBottom: 28 }}>
              {FEATURES.map((item, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '34px minmax(0, 1fr)', gap: 12, alignItems: 'center', fontSize: 14, color: 'var(--text2)' }}>
                  <span style={{
                    color: 'var(--orange)',
                    border: '1px solid oklch(73% 0.18 52 / 0.26)',
                    background: 'oklch(73% 0.18 52 / 0.09)',
                    borderRadius: 'var(--radius)',
                    height: 28,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--mono)',
                    fontSize: 11,
                    fontWeight: 900,
                  }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {item}
                </div>
              ))}
            </div>

            <div className="accountant-plan-preview-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {PLANS_PREVIEW.map(plan => (
                <div
                  key={plan.name}
                  className="surface-hover"
                  style={{
                    border: `1px solid ${plan.highlight ? 'var(--orange)' : 'var(--border)'}`,
                    background: plan.highlight ? 'oklch(73% 0.18 52 / 0.07)' : 'var(--bg2)',
                    borderRadius: 'var(--radius)',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div style={{ fontWeight: 900, fontSize: 13, color: plan.highlight ? 'var(--orange)' : 'var(--text1)' }}>
                    {plan.name}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--text1)' }}>
                    {plan.price}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>{plan.limit}</div>
                  <a
                    href="#contadores-form"
                    className="pressable"
                    onClick={() => {
                      try {
                        sessionStorage.setItem('accountantPreselect', JSON.stringify({
                          plan: plan.name,
                          carteiraRange: plan.carteiraHint,
                        }))
                      } catch {}
                      const el = document.getElementById('contadores-form')
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }}
                    style={{
                      fontSize: 11, fontWeight: 700,
                      color: plan.highlight ? 'var(--ink-on-warm)' : 'var(--text2)',
                      background: plan.highlight ? 'var(--orange)' : 'var(--bg3)',
                      border: `1px solid ${plan.highlight ? 'var(--orange)' : 'var(--border)'}`,
                      borderRadius: 6, padding: '5px 8px',
                      textDecoration: 'none', textAlign: 'center',
                      display: 'block',
                    }}
                  >
                    {plan.cta} →
                  </a>
                </div>
              ))}
            </div>

            {/* Garantia */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--lime)" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                Cancele quando quiser · Garantia de 7 dias (CDC, art. 49) · Sem fidelidade
              </span>
            </div>
            </div>{/* /padding wrapper */}
          </div>

          {/* Right: formulário unificado */}
          <div
            id="contadores-form"
            className="instrument-panel"
            data-reveal
            style={{ '--reveal-delay': '220' } as React.CSSProperties}
          >
            <div className="instrument-panel-header">
              <span className="instrument-label">Acesso para escritórios</span>
            </div>
            <div style={{ padding: '24px 28px' }}>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 24 }}>
              Plano contador com clientes ilimitados e relatórios com sua marca.
            </p>
            <AccountantLeadForm source="home" />
            </div>{/* /padding wrapper */}
          </div>
        </div>
      </div>
    </section>
  )
}
