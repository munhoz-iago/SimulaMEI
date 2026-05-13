import Link from 'next/link'
import type { OfficeClientStats } from '@/lib/accountant/server'

interface OfficeStatsCardsProps {
  stats: OfficeClientStats
  limit: number
  trialEndsAt: string | null
}

const KICKER_STYLE: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 800,
  color: 'var(--text3)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: 6,
}

export function OfficeStatsCards({ stats, limit, trialEndsAt }: OfficeStatsCardsProps) {
  const usage = limit > 0 ? Math.min(100, Math.round((stats.active / limit) * 100)) : 0
  const usageTone = usage >= 95 ? 'critico' : usage >= 80 ? 'atencao' : 'ok'
  const usageColor = usageTone === 'critico' ? 'var(--red)' : usageTone === 'atencao' ? 'var(--yellow)' : 'var(--lime)'

  return (
    <section style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr 1fr', gap: 14, marginBottom: 22 }} className="acc-stats-grid">
      {/* Card principal: Carteira ativa com barra integrada */}
      <div className="acc-card acc-fade-in" style={{ padding: '20px 22px' }}>
        <div className="acc-card-accent" style={{ background: usageColor }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={KICKER_STYLE}>Carteira ativa</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 32, fontWeight: 900, color: usageColor, lineHeight: 1 }}>
                {stats.active.toLocaleString('pt-BR')}
              </span>
              <span style={{ fontSize: 14, color: 'var(--text3)', fontWeight: 600 }}>
                / {limit.toLocaleString('pt-BR')}
              </span>
            </div>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 800,
            padding: '4px 9px',
            borderRadius: 999,
            background: `${usageColor}1a`,
            border: `1px solid ${usageColor}33`,
            color: usageColor,
            whiteSpace: 'nowrap',
          }}>
            {usage}%
          </span>
        </div>

        {/* Barra de uso */}
        <div
          aria-label={`Uso da carteira: ${usage}%`}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={usage}
          style={{
            height: 8,
            borderRadius: 999,
            background: 'var(--bg2)',
            overflow: 'hidden',
            marginBottom: 12,
          }}
        >
          <div style={{
            width: `${usage}%`,
            height: '100%',
            background: usage >= 80 ? usageColor : 'linear-gradient(90deg, var(--lime), var(--blue))',
            borderRadius: 999,
            transition: 'width .5s var(--ease-out)',
          }} />
        </div>

        {/* Sub-texto contextual */}
        <p style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5, margin: 0 }}>
          {trialEndsAt && (
            <>Trial ativo até <strong style={{ color: 'var(--text2)' }}>{trialEndsAt}</strong>. </>
          )}
          {stats.active >= limit ? (
            <>
              Limite atingido.{' '}
              <Link href="/contador/assinatura" style={{ color: usageColor, fontWeight: 700, textDecoration: 'underline' }}>
                Ver opções
              </Link>
            </>
          ) : stats.planLimitInactive > 0 ? (
            <>
              {stats.planLimitInactive} cliente(s) pausado(s) por limite.{' '}
              <Link href="/upgrade/contador" style={{ color: 'var(--orange)', fontWeight: 700, textDecoration: 'underline' }}>
                Ajustar plano
              </Link>
            </>
          ) : (
            <>Você ainda tem {limit - stats.active} {limit - stats.active === 1 ? 'vaga' : 'vagas'} para novos clientes.</>
          )}
        </p>
      </div>

      {/* Card 2: Total de clientes */}
      <div className="acc-card acc-fade-in" style={{ padding: '20px 22px', animationDelay: '60ms' }}>
        <div className="acc-card-accent" style={{ background: 'var(--blue)' }} />
        <div style={KICKER_STYLE}>Total cadastrados</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 900, color: 'var(--text1)', lineHeight: 1, marginBottom: 6 }}>
          {stats.total.toLocaleString('pt-BR')}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)' }}>
          {stats.total === 0 ? 'Sem clientes ainda' : stats.total === stats.active ? 'Todos ativos' : `${stats.active} ativos`}
        </div>
      </div>

      {/* Card 3: Pausados manualmente */}
      <div className="acc-card acc-fade-in" style={{ padding: '20px 22px', animationDelay: '120ms' }}>
        <div className="acc-card-accent" style={{ background: stats.manualInactive > 0 ? 'var(--yellow)' : 'var(--border2)' }} />
        <div style={KICKER_STYLE}>Pausados manual.</div>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 900,
          color: stats.manualInactive > 0 ? 'var(--yellow)' : 'var(--text3)',
          lineHeight: 1, marginBottom: 6,
        }}>
          {stats.manualInactive.toLocaleString('pt-BR')}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)' }}>
          {stats.manualInactive === 0 ? 'Nenhum em pausa' : 'Você pausou'}
        </div>
      </div>

      {/* Card 4: Pausados por plano */}
      <div className="acc-card acc-fade-in" style={{ padding: '20px 22px', animationDelay: '180ms' }}>
        <div className="acc-card-accent" style={{ background: stats.planLimitInactive > 0 ? 'var(--orange)' : 'var(--border2)' }} />
        <div style={KICKER_STYLE}>Pausados por plano</div>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 900,
          color: stats.planLimitInactive > 0 ? 'var(--orange)' : 'var(--text3)',
          lineHeight: 1, marginBottom: 6,
        }}>
          {stats.planLimitInactive.toLocaleString('pt-BR')}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)' }}>
          {stats.planLimitInactive === 0 ? 'Dentro do limite' : 'Reative com upgrade'}
        </div>
      </div>
    </section>
  )
}
