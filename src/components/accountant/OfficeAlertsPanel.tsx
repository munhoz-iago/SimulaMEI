import type { OfficeAlertRecord } from '@/lib/accountant/server'
import { OfficeAlertResolveButton } from './OfficeAlertResolveButton'

interface OfficeAlertsPanelProps {
  openAlerts: OfficeAlertRecord[]
  resolvedAlerts: OfficeAlertRecord[]
}

const SEVERITY_MAP = {
  info: { color: 'var(--blue)', bg: 'rgba(96,165,250,0.08)', tag: 'info' as const, label: 'Info' },
  warn: { color: 'var(--yellow)', bg: 'rgba(245,197,66,0.08)', tag: 'warn' as const, label: 'Atenção' },
  danger: { color: 'var(--red)', bg: 'rgba(255,59,59,0.08)', tag: 'danger' as const, label: 'Crítico' },
}

function formatDate(value: string | null) {
  if (!value) return 'Sem data'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function getAlertTitle(alert: OfficeAlertRecord) {
  return alert.payload.title ?? `${alert.payload.clientName ?? 'Cliente'} exige atenção`
}

function getAlertBody(alert: OfficeAlertRecord) {
  return alert.payload.body ?? `Alerta ${alert.tipo} em ${alert.mes_referencia}.`
}

function getAlertSeverity(alert: OfficeAlertRecord) {
  const sev = alert.payload.severity
  if (sev === 'info' || sev === 'warn' || sev === 'danger') {
    return SEVERITY_MAP[sev]
  }
  return SEVERITY_MAP.warn
}

/** Ícone contextual baseado no tipo do alerta */
function getAlertIcon(tipo: string) {
  if (tipo.includes('teto') || tipo.includes('excesso')) {
    // Triângulo de aviso (teto/excesso)
    return (
      <>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </>
    )
  }
  if (tipo.includes('fator_r') || tipo.includes('anexo')) {
    // Setas opostas (transição de anexo)
    return (
      <>
        <polyline points="17 1 21 5 17 9"/>
        <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
        <polyline points="7 23 3 19 7 15"/>
        <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
      </>
    )
  }
  if (tipo.includes('das') || tipo.includes('imposto')) {
    // Cifrão (impostos)
    return (
      <>
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </>
    )
  }
  // Default: sino
  return (
    <>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </>
  )
}

export function OfficeAlertsPanel({ openAlerts, resolvedAlerts }: OfficeAlertsPanelProps) {
  return (
    <section style={{ display: 'grid', gap: 14, marginBottom: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>
            Monitoramento da carteira
          </span>
          <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>Alertas abertos</h2>
        </div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 10px',
          borderRadius: 999,
          background: openAlerts.length > 0 ? 'rgba(255,59,59,0.08)' : 'var(--bg2)',
          border: openAlerts.length > 0 ? '1px solid rgba(255,59,59,0.24)' : '1px solid var(--border)',
          color: openAlerts.length > 0 ? 'var(--red)' : 'var(--text3)',
          fontSize: 11, fontWeight: 800,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: openAlerts.length > 0 ? 'var(--red)' : 'var(--text3)',
            animation: openAlerts.length > 0 ? 'pulse 1.6s ease-in-out infinite' : undefined,
          }} aria-hidden />
          {openAlerts.length} {openAlerts.length === 1 ? 'aberto' : 'abertos'}
        </span>
      </div>

      {openAlerts.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }} className="acc-alerts-grid">
          {openAlerts.map((alert, i) => {
            const severity = getAlertSeverity(alert)
            return (
              <article
                key={alert.id}
                className="acc-alert-card acc-fade-in"
                data-severity={severity.tag}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: severity.bg,
                    border: `1px solid ${severity.color}33`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={severity.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {getAlertIcon(alert.tipo)}
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      fontSize: 10, fontWeight: 800,
                      color: severity.color,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      marginBottom: 6,
                    }}>
                      {severity.label}
                      <span style={{ color: 'var(--border2)' }}>·</span>
                      <span style={{ color: 'var(--text3)' }}>
                        {alert.tipo.replaceAll('_', ' ')} · {alert.mes_referencia}
                      </span>
                    </div>
                    <h3 style={{ color: 'var(--text1)', fontSize: 14, fontWeight: 700, margin: '0 0 6px', lineHeight: 1.35 }}>
                      {getAlertTitle(alert)}
                    </h3>
                    <p style={{ color: 'var(--text2)', fontSize: 12, lineHeight: 1.6, margin: '0 0 12px' }}>
                      {getAlertBody(alert)}
                    </p>
                    <OfficeAlertResolveButton alertId={alert.id} />
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="acc-card" style={{ padding: 24, textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'rgba(200,241,53,0.1)', border: '1px solid rgba(200,241,53,0.2)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 12,
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--lime)" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h3 style={{ color: 'var(--text1)', fontSize: 16, margin: '0 0 6px', fontWeight: 700 }}>
            Carteira em dia
          </h3>
          <p style={{ color: 'var(--text3)', fontSize: 12, lineHeight: 1.6, margin: 0, maxWidth: 480, marginInline: 'auto' }}>
            Nenhum alerta aberto. O monitoramento cria alertas quando uma simulação recente passa de 70%, 80%, 95%, 100% ou excesso grave do teto.
          </p>
        </div>
      )}

      {resolvedAlerts.length > 0 && (
        <details className="acc-card" style={{ padding: 0 }}>
          <summary style={{
            padding: '12px 18px',
            cursor: 'pointer',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontSize: 13, fontWeight: 700, color: 'var(--text2)',
            listStyle: 'none',
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Resolvidos recentes ({resolvedAlerts.length})
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </summary>
          <div style={{ display: 'grid', gap: 0, padding: '0 18px 14px' }}>
            {resolvedAlerts.map(alert => (
              <div
                key={alert.id}
                style={{
                  display: 'flex', justifyContent: 'space-between', gap: 12,
                  color: 'var(--text3)', fontSize: 12,
                  borderTop: '1px solid var(--border)',
                  paddingTop: 10, paddingBottom: 10,
                }}
              >
                <span style={{ color: 'var(--text2)' }}>{getAlertTitle(alert)}</span>
                <span style={{ textAlign: 'right' }}>
                  {formatDate(alert.resolved_at)} · {alert.resolved_by_label ?? 'não identificado'}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  )
}
