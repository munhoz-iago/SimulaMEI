import Link from 'next/link'
import type { ReactNode } from 'react'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { getAccountantBillingState } from '@/lib/accountant/billing-state'
import { getTrialProgress, getTrialUrgency } from '@/lib/accountant/office'
import type { CurrentAccountantOffice } from '@/lib/accountant/server'

interface AccountantShellProps {
  office: CurrentAccountantOffice
  active: 'dashboard' | 'clients' | 'billing'
  children: ReactNode
}

/** Badge persistente que aparece em todas as abas quando o escritório está em trial.
 *  Cor escala conforme PROPORÇÃO do trial decorrida (não dias fixos), então
 *  funciona igual para trial de 7d ou 14d: lime no início → yellow após a metade
 *  → red nos últimos ~20% ou 2 dias. A duração total vem de (trialEndsAt - createdAt). */
function TrialBadge({ trialEndsAt, createdAt }: { trialEndsAt: string | null; createdAt: string | null | undefined }) {
  const progress = getTrialProgress(trialEndsAt, createdAt)
  if (progress === null) return null

  const days = progress.daysRemaining
  const urgency = getTrialUrgency(progress)
  const color = urgency === 'critical' ? 'var(--red)' : urgency === 'warning' ? 'var(--yellow)' : 'var(--lime)'
  const bg = urgency === 'critical' ? 'var(--tint-red)' : urgency === 'warning' ? 'var(--tint-yellow)' : 'var(--tint-lime)'
  const border = urgency === 'critical' ? 'var(--tint-red-border)' : urgency === 'warning' ? 'var(--tint-yellow-border)' : 'var(--tint-lime-border)'
  const isUrgent = urgency === 'critical'

  return (
    <Link
      href="/contador/assinatura"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 10,
        padding: '8px 14px 8px 12px',
        borderRadius: 999,
        background: bg,
        border: `1px solid ${border}`,
        color: 'var(--text1)',
        fontSize: 12, fontWeight: 700,
        textDecoration: 'none',
        transition: 'transform 160ms var(--ease-out), border-color 160ms ease',
        whiteSpace: 'nowrap',
      }}
      className="pressable"
    >
      <span
        aria-hidden
        style={{
          width: 8, height: 8, borderRadius: 99,
          background: color,
          boxShadow: `0 0 8px ${color}`,
          animation: isUrgent ? 'pulse 1.4s ease-in-out infinite' : undefined,
          flexShrink: 0,
        }}
      />
      <span style={{ color, fontWeight: 800 }}>
        {days === 0 ? 'Trial expira hoje' : days === 1 ? '1 dia de trial' : `${days} dias de trial`}
      </span>
      <span style={{ color: 'var(--text3)', fontSize: 11 }}>·</span>
      <span style={{ color: 'var(--text2)', fontSize: 11, fontWeight: 700 }}>Escolher plano →</span>
    </Link>
  )
}

const NAV_ITEMS = [
  {
    href: '/contador',
    label: 'Visão geral',
    key: 'dashboard',
    icon: (
      <>
        <rect x="3" y="3" width="7" height="7"/>
        <rect x="14" y="3" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/>
      </>
    ),
  },
  {
    href: '/contador/clientes',
    label: 'Clientes',
    key: 'clients',
    icon: (
      <>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </>
    ),
  },
  {
    href: '/contador/assinatura',
    label: 'Assinatura',
    key: 'billing',
    icon: (
      <>
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
        <line x1="1" y1="10" x2="23" y2="10"/>
      </>
    ),
  },
] as const

function PlanBadge({ plan }: { plan: string }) {
  const planNormalized = plan.toLowerCase()
  const isEnterprise = planNormalized.includes('enterprise')
  const isPro = planNormalized.includes('pro')
  const color = isEnterprise ? 'var(--lime)' : isPro ? 'var(--blue)' : 'var(--text3)'
  const bg = isEnterprise
    ? 'var(--tint-lime)'
    : isPro
      ? 'var(--tint-blue)'
      : 'var(--bg2)'
  const border = isEnterprise
    ? 'var(--tint-lime-strong)'
    : isPro
      ? 'var(--tint-blue-strong)'
      : 'var(--border)'

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 9px',
      borderRadius: 'var(--radius)',
      background: bg,
      border: `1px solid ${border}`,
      color,
      fontSize: 11,
      fontWeight: 800,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} aria-hidden />
      Plano {plan.replace('_', ' ')}
    </span>
  )
}

export function AccountantShell({ office, active, children }: AccountantShellProps) {
  const billingState = getAccountantBillingState(office)
  const inTrial = billingState.kind === 'trialing'
  const trialExpired = billingState.kind === 'trial_expired'

  return (
    <main style={{
      minHeight: '100vh',
      background: 'var(--bg0)',
      color: 'var(--text1)',
      padding: '32px 32px 56px',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header coerente com /dashboard: greeting compacto + actions à direita */}
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 24,
          gap: 20,
          flexWrap: 'wrap',
        }}>
          <div>
            <h1 style={{
              fontSize: 'clamp(22px, 3vw, 28px)',
              fontWeight: 800,
              margin: '0 0 4px',
              letterSpacing: '-0.02em',
            }}>
              {office.name}
            </h1>
            <p style={{ color: 'var(--text3)', fontSize: 13, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              Painel contador · {office.role}
              <span style={{ color: 'var(--border2)' }}>·</span>
              <PlanBadge plan={office.plan} />
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
            {inTrial && <TrialBadge trialEndsAt={office.trial_ends_at} createdAt={office.created_at} />}
            <ThemeToggle size={32} />
            <Link
              href="/dashboard"
              className="dashboard-action dashboard-secondary-action"
              style={{
                padding: '7px 12px', fontSize: 12, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
              </svg>
              Dashboard
            </Link>
            <Link
              href="/contador/clientes/novo"
              className="dashboard-action dashboard-primary-action"
              style={{
                padding: '8px 14px', fontSize: 13, fontWeight: 800,
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Novo cliente
            </Link>
          </div>
        </header>

        {/* Sub-nav segmentada (estilo iOS/Bankio) — mais coerente que pills isoladas */}
        <nav
          aria-label="Navegação contador"
          className="acc-nav"
          style={{
            display: 'inline-flex',
            padding: 4,
            background: 'var(--bg1)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            gap: 2,
            marginBottom: 24,
            overflowX: 'auto',
            maxWidth: '100%',
          }}
        >
          {NAV_ITEMS.map(item => {
            const isActive = item.key === active
            return (
              <Link
                key={item.href}
                href={item.href}
                className="acc-nav-tab"
                aria-current={isActive ? 'page' : undefined}
                data-active={isActive}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  {item.icon}
                </svg>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {trialExpired && active !== 'billing' && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 18px',
            background: 'linear-gradient(90deg, var(--tint-red), rgba(255,59,59,0.02))',
            border: '1px solid var(--tint-red-border)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: 18,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'var(--tint-red-strong)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--red)', marginBottom: 2 }}>
                Trial encerrado
              </div>
              <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, margin: 0 }}>
                Escolha um plano para continuar cadastrando clientes e registrando simulações.
              </p>
            </div>
            <Link
              href="/contador/assinatura"
              className="dashboard-action dashboard-primary-action"
              style={{ padding: '8px 14px', fontSize: 12, fontWeight: 800, flexShrink: 0 }}
            >
              Escolher plano
            </Link>
          </div>
        )}

        {office.admin_access_fallback ? (
          <div
            role="alert"
            style={{
              border: '1px solid var(--tint-yellow-border)',
              background: 'var(--tint-yellow)',
              color: 'var(--yellow)',
              borderRadius: 'var(--radius)',
              padding: '14px 16px',
              marginBottom: 18,
              fontSize: 13,
              lineHeight: 1.6,
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <div>
              <strong style={{ color: 'var(--text1)' }}>Modo diagnóstico:</strong> acesso admin liberado, mas a conexão Supabase admin falhou
              {office.admin_access_error ? `: ${office.admin_access_error}` : '.'}
            </div>
          </div>
        ) : null}

        {children}
      </div>
    </main>
  )
}
