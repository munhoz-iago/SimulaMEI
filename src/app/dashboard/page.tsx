import Link from 'next/link'
import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  CNAE_OFICIAL_TOTAL,
  TAX_RULE_VERSION,
  gerarOportunidadesFiscais,
} from '@/lib/tributario'
import { FatorRInterativo } from '@/components/resultado/FatorRInterativo'
import { summarizeMonthlyMonitor, detectAnexoTransition, getFiscalCalendarItems } from '@/lib/monitor'
import { REGIME_LABELS } from '@/constants/tributario'
import { FREE_SIMULATION_LIMIT, PLAN_ACCENT_COLORS, PLAN_DESCRIPTIONS, PLAN_LABELS } from '@/constants/plans'
import { DeleteAccountSection } from '@/components/dashboard/DeleteAccountSection'
import { MonthlyMonitorSection } from '@/components/dashboard/MonthlyMonitorSection'
import { Panel } from '@/components/dashboard/Panel'
import { Pill } from '@/components/dashboard/Pill'
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader'
import { getDashboardContext } from '@/lib/dashboard/context'
import { getDashboardKPIs } from '@/lib/dashboard/kpis'
import { fmt, fmtPct } from '@/lib/format'
import type { ResultadoSimulacao } from '@/types/tributario'

export const metadata = {
  title: 'Dashboard — SimulaMEI',
  description: 'Área logada do SimulaMEI.',
}

interface SimulationRow {
  id: string
  created_at: string
  entrada: ResultadoSimulacao['entrada']
  resultado: ResultadoSimulacao
}

interface MonthlyInputRow {
  id: string
  ano: number
  mes: number
  faturamento_mes: number
  folha_mes: number
  rbt12: number | null
  projecao_anual: number | null
  fator_r: number | null
  anexo_calculado: string | null
  cnae: string | null
  tipo_mei: string | null
  tax_rule_version: string | null
  created_at: string
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

function formatDate(value?: string) {
  if (!value) return 'Sem data'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function metricTone(value: 'ok' | 'warn' | 'danger' | 'neutral') {
  return {
    ok: 'var(--lime)',
    warn: 'var(--yellow)',
    danger: 'var(--red)',
    neutral: 'var(--blue)',
  }[value]
}

async function getRecentSimulations(supabase: SupabaseServerClient, userId: string) {
  const { data, error } = await supabase
    .from('simulations')
    .select('id, created_at, entrada, resultado')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(8)

  if (error) {
    return {
      rows: [] as SimulationRow[],
      error: error.message,
    }
  }

  return {
    rows: (data ?? []) as SimulationRow[],
    error: null,
  }
}

async function getSimulationUsageCount(supabase: SupabaseServerClient, userId: string) {
  const { count, error } = await supabase
    .from('simulations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (error) {
    return {
      count: 0,
      error: error.message,
    }
  }

  return {
    count: count ?? 0,
    error: null,
  }
}

async function getMonthlyInputs(supabase: SupabaseServerClient, userId: string) {
  const { data, error } = await supabase
    .from('monthly_inputs')
    .select('id, ano, mes, faturamento_mes, folha_mes, rbt12, projecao_anual, fator_r, anexo_calculado, cnae, tipo_mei, tax_rule_version, created_at')
    .eq('user_id', userId)
    .order('ano', { ascending: false })
    .order('mes', { ascending: false })
    .limit(12)

  if (error) {
    return {
      rows: [] as MonthlyInputRow[],
      error: error.message,
    }
  }

  return {
    rows: (data ?? []) as MonthlyInputRow[],
    error: null,
  }
}

async function getCachedOportunidades(simulation: SimulationRow | undefined) {
  if (!simulation) return []

  return unstable_cache(
    async () => gerarOportunidadesFiscais(simulation.resultado),
    ['dashboard-oportunidades', TAX_RULE_VERSION, simulation.id],
    { revalidate: 60 * 60 },
  )()
}

export default async function DashboardPage() {
  // Contexto compartilhado (auth + onboarding + greeting) deduplicado via cache
  const ctx = await getDashboardContext()
  const supabase = await createClient()
  const user = { id: ctx.user.id, email: ctx.user.email ?? '' }
  const profile = ctx.profile
  const hasFullAdminAccess = ctx.hasFullAdminAccess

  const [simulationsResult, usageResult] = await Promise.all([
    getRecentSimulations(supabase, user.id),
    getSimulationUsageCount(supabase, user.id),
  ])

  const { rows: simulations, error: simulationsError } = simulationsResult
  const { rows: monthlyInputs, error: monthlyInputsError } = await getMonthlyInputs(supabase, user.id)
  const currentPlan = ctx.plan
  const simulationsUsed = usageResult.error ? simulations.length : usageResult.count
  const freeSimulationLimitReached = currentPlan === 'free' && simulationsUsed >= FREE_SIMULATION_LIMIT
  const latestSimulation = simulations[0]
  const latest = latestSimulation?.resultado
  const oportunidades = await getCachedOportunidades(latestSimulation)
  const impactoTotal = oportunidades.reduce((sum, item) => sum + item.impactoEstimadoAnual, 0)

  const monitoredCnaes = new Set(simulations.map(item => item.entrada?.cnae).filter(Boolean)).size
  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()
  const monitorRows = monthlyInputs
    .map(item => ({
      ano: item.ano,
      mes: item.mes,
      faturamentoMes: Number(item.faturamento_mes),
      folhaMes: Number(item.folha_mes),
      anexoCalculado: item.anexo_calculado,
      fatorR: item.fator_r,
    }))
    .sort((a, b) => (a.ano * 100 + a.mes) - (b.ano * 100 + b.mes))
  const monitorSeedRows = monitorRows.length > 0
    ? monitorRows
    : profile?.cnae_principal && profile?.tipo_mei
      ? [{
        ano: currentYear,
        mes: profile.mes_atual ?? currentMonth,
        faturamentoMes: profile.faturamento_mensal_estimado ?? 0,
        folhaMes: profile.folha_mensal ?? 0,
      }]
      : []
  const monitorSummary = profile?.cnae_principal && profile?.tipo_mei && monitorSeedRows.length > 0
    ? summarizeMonthlyMonitor({
      cnae: profile.cnae_principal,
      tipoMei: profile.tipo_mei,
      mesAtual: monitorSeedRows.at(-1)?.mes ?? currentMonth,
      historico: monitorSeedRows,
    })
    : null
  const monitorTransition = detectAnexoTransition(monitorRows)
  const faturamentoMedio = monitorRows.length > 0
    ? monitorRows.reduce((sum, r) => sum + r.faturamentoMes, 0) / monitorRows.length
    : (profile?.faturamento_mensal_estimado ?? 0)

  // KPIs unificados: prefere dados do Monitor mensal sobre simulação avulsa
  const kpis = getDashboardKPIs({
    latestSimulation: latest ?? null,
    monitorSummary,
    monthlyInputsCount: monitorRows.length,
    latestMonth: monitorRows.at(-1)?.mes ?? null,
    latestYear: monitorRows.at(-1)?.ano ?? null,
    cnae: profile?.cnae_principal,
    tipoMei: profile?.tipo_mei,
    plan: currentPlan,
    freeLimitReached: freeSimulationLimitReached,
  })
  // Aliases pra manter o resto do JSX legível e mudar o mínimo
  const usoTeto = kpis.usoTeto
  const tetoTone = kpis.tone

  const calendarItems = getFiscalCalendarItems({
    nome: profile?.nome ?? user.email?.split('@')[0] ?? 'Sua conta',
    tipoMei: profile?.tipo_mei ?? 'geral',
    anexoAtual: latest?.anexoAtual ?? 'III',
    elegivelFatorR: Boolean(latest?.fatorR),
    usoTeto,
    fatorRAtual: monitorSummary?.fatorRAtual ?? latest?.fatorR?.fatorR ?? 0,
    faturamentoMedio,
    ultimoLancamentoMes: monitorRows.at(-1)?.mes ?? null,
    ultimoLancamentoAno: monitorRows.at(-1)?.ano ?? null,
    totalLancamentos: monitorRows.length,
  })
  const completedPerspectiveCount = [
    Boolean(latest),
    oportunidades.length > 0,
    monitoredCnaes > 0,
    !simulationsError,
  ].filter(Boolean).length

  const { userName, greeting } = ctx
  const fatorRValue = latest?.fatorR?.fatorR
  const tetoColor = metricTone(tetoTone)

  return (
    <>
      {/* Header da página (sidebar vive no layout) */}
      <DashboardPageHeader
        greeting={`${greeting}, ${userName}`}
        subtitle="Acompanhe seu teto MEI, regime fiscal e oportunidades em tempo real."
        plan={currentPlan}
      />

      {/* Sidebar + greeting header agora vivem em /dashboard/layout.tsx
          e em <DashboardPageHeader/> acima. Conteúdo flui direto. */}

      {/* ── Row 1: 3 colunas principais ─────────────────────── */}
          <section style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr 0.9fr', gap: 16, marginBottom: 16 }} className="db-row1">

            {/* Card 1: Teto MEI (= Total Balance) */}
            <Panel style={{ padding: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text3)' }}>
                  Uso do Teto MEI
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {kpis.source !== 'empty' && (
                    <Pill color={kpis.source === 'monitor' ? 'var(--lime)' : 'var(--blue)'} style={{ fontSize: 9 }}>
                      {kpis.source === 'monitor' ? 'Monitor' : 'Simulação'}
                    </Pill>
                  )}
                  <Pill color={tetoColor}>{tetoTone === 'ok' ? 'Saudável' : tetoTone === 'warn' ? 'Atenção' : tetoTone === 'danger' ? 'Crítico' : 'Neutro'}</Pill>
                </div>
              </div>

              <div style={{ fontFamily: 'var(--mono)', fontSize: 48, fontWeight: 900, color: tetoColor, lineHeight: 1, marginBottom: 6 }}>
                {kpis.source !== 'empty' ? fmtPct(usoTeto) : '—'}
              </div>

              {/* Mensagem contextual dinâmica — substituiu "↑ dentro do limite" */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', marginBottom: 4 }}>
                  {kpis.contextMessage}
                </div>
                <p style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5, margin: 0 }}>
                  {kpis.contextSubMessage}
                </p>
              </div>

              {/* CTA dinâmico baseado no estado */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                <Link
                  href={kpis.primaryCta.href}
                  className="dashboard-action dashboard-primary-action"
                  style={{ padding: '9px 16px', fontSize: 13, flex: 1, justifyContent: 'center' }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                  {kpis.primaryCta.label}
                </Link>
                <Link
                  href="/dashboard/relatorio"
                  className="dashboard-action dashboard-secondary-action"
                  style={{ padding: '9px 16px', fontSize: 13 }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  PDF
                </Link>
              </div>

              {/* Barra de teto */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>Teto MEI {new Date().getFullYear()}</span>
                  <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: tetoColor }}>
                    {fmt(kpis.faturamentoAcumulado)} de {fmt(kpis.tetoAnual)}
                  </span>
                </div>
                <div role="progressbar" aria-label="Uso do teto MEI" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.min(100, usoTeto * 100))} style={{ height: 8, background: 'var(--bg3)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, Math.max(0, usoTeto * 100))}%`, height: '100%', background: tetoColor, borderRadius: 999, transition: 'width .4s ease' }} />
                </div>
              </div>

              {/* 3 métricas — agora sempre populadas dos KPIs unificados */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {[
                  {
                    label: 'Projeção 12m',
                    value: kpis.source !== 'empty' ? fmt(kpis.projecaoAnual) : '—',
                    sub: kpis.source === 'monitor' && kpis.monthsOfHistory < 3
                      ? `extrapolada de ${kpis.monthsOfHistory} mês${kpis.monthsOfHistory > 1 ? 'es' : ''}`
                      : kpis.source !== 'empty' ? 'baseada no histórico' : 'lance dados',
                  },
                  {
                    label: 'Anexo atual',
                    value: kpis.source !== 'empty' ? `Anexo ${kpis.anexoAtual}` : '—',
                    sub: kpis.fatorRAtual > 0 ? `Fator R ${fmtPct(kpis.fatorRAtual)}` : 'Fator R pendente',
                  },
                  {
                    label: 'DAS estimado',
                    value: kpis.dasMensalEstimado > 0 ? `${fmt(kpis.dasMensalEstimado)}` : '—',
                    sub: kpis.dasMensalEstimado > 0 ? '/mês' : 'sem dados',
                  },
                ].map(m => (
                  <div key={m.label} style={{ background: 'var(--bg2)', borderRadius: 'var(--radius)', padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{m.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.value}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2, lineHeight: 1.2 }}>{m.sub}</div>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Card 2: 2×2 métricas rápidas — agora alimentado pelos KPIs unificados */}
            <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: 16 }}>
              {/* Linha superior */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Panel style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 6, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--lime)', borderRadius: '8px 8px 0 0' }} />
                  <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text3)' }}>Projeção</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 900, color: 'var(--lime)', lineHeight: 1 }}>
                    {kpis.projecaoAnual > 0 ? fmt(kpis.projecaoAnual) : '—'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                    {kpis.projecaoAnual > 0
                      ? kpis.monthsOfHistory >= 3 ? 'anual estimado' : `de ${kpis.monthsOfHistory} mês${kpis.monthsOfHistory > 1 ? 'es' : ''}`
                      : 'lance dados'}
                  </span>
                </Panel>
                <Panel style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 6, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: kpis.fatorRAtual > 0 ? (kpis.fatorRAtual >= 0.28 ? 'var(--lime)' : 'var(--orange)') : 'var(--border)', borderRadius: '8px 8px 0 0' }} />
                  <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text3)' }}>Fator R</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 900, color: kpis.fatorRAtual > 0 ? (kpis.fatorRAtual >= 0.28 ? 'var(--lime)' : 'var(--orange)') : 'var(--text3)', lineHeight: 1 }}>
                    {kpis.fatorRAtual > 0 ? fmtPct(kpis.fatorRAtual) : '—'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                    {kpis.fatorRAtual > 0
                      ? (kpis.fatorRAtual >= 0.28 ? 'Anexo III ✓' : 'abaixo de 28%')
                      : 'sem folha lançada'}
                  </span>
                </Panel>
              </div>
              {/* Linha inferior */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Panel style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 6, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--blue)', borderRadius: '8px 8px 0 0' }} />
                  <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text3)' }}>Meses no histórico</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 900, color: 'var(--blue)', lineHeight: 1 }}>
                    {kpis.monthsOfHistory || simulationsUsed}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                    {kpis.monthsOfHistory > 0
                      ? kpis.hasCurrentMonthEntry ? 'mês atual lançado' : 'lance o mês corrente'
                      : currentPlan === 'free' ? `${simulationsUsed}/${FREE_SIMULATION_LIMIT} simulações` : `${simulationsUsed} simulações`}
                  </span>
                </Panel>
                <Panel style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 6, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: oportunidades.length > 0 ? 'var(--yellow)' : 'var(--border)', borderRadius: '8px 8px 0 0' }} />
                  <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text3)' }}>Oportunidades</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 900, color: oportunidades.length > 0 ? 'var(--yellow)' : 'var(--text3)', lineHeight: 1 }}>
                    {oportunidades.length}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                    {impactoTotal > 0 ? `${fmt(impactoTotal)}/ano` : oportunidades.length > 0 ? 'identificadas' : 'rode simulação'}
                  </span>
                </Panel>
              </div>
            </div>

            {/* Card 3: Maturidade do sistema */}
            <Panel style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text3)', marginBottom: 16 }}>
                Maturidade
              </span>

              {/* Ring visual — SVG simples */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
                <svg width="100" height="100" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="38" fill="none" stroke="var(--bg3)" strokeWidth="10"/>
                  <circle
                    cx="50" cy="50" r="38" fill="none"
                    stroke="var(--lime)" strokeWidth="10"
                    strokeDasharray={`${(completedPerspectiveCount / 4) * 238.76} 238.76`}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                    style={{ transition: 'stroke-dasharray 0.6s ease' }}
                  />
                  <text x="50" y="46" textAnchor="middle" fill="var(--text1)" fontSize="20" fontWeight="800" fontFamily="monospace">{completedPerspectiveCount}</text>
                  <text x="50" y="62" textAnchor="middle" fill="var(--text3)" fontSize="11">/4 ativas</text>
                </svg>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, flex: 1 }}>
                {[
                  { label: 'Simulação fiscal', ok: Boolean(latest) },
                  { label: 'Oportunidades', ok: oportunidades.length > 0 },
                  { label: 'CNAEs monitorados', ok: monitoredCnaes > 0 },
                  { label: 'Fonte de dados', ok: !simulationsError },
                ].map((item, i, arr) => (
                  <div key={item.label} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 0',
                    borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <span style={{ fontSize: 12, color: 'var(--text2)' }}>{item.label}</span>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: item.ok ? 'var(--lime)' : 'var(--border2)',
                      boxShadow: item.ok ? '0 0 6px var(--lime)' : 'none',
                    }} />
                  </div>
                ))}
              </div>
            </Panel>
          </section>

          {/* ── Row 2: Monitor mensal (full width, peça principal de ação) ── */}
          {profile?.cnae_principal && profile?.tipo_mei && (
            <section id="monitor" style={{ marginBottom: 16, scrollMarginTop: 24 }}>
              <Panel style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{
                  padding: '18px 24px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  background: 'linear-gradient(90deg, var(--bg1) 0%, rgba(200,241,53,0.025) 100%)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: 'rgba(200,241,53,0.1)', border: '1px solid rgba(200,241,53,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--lime)" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text3)', display: 'block', marginBottom: 2 }}>
                        Recorrência mensal
                      </span>
                      <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>Monitor — lance o mês corrente</h2>
                    </div>
                  </div>
                  <span className="db-monitor-hint" style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>
                    Atualizar todo início de mês mantém DAS, Fator R e alertas em dia
                  </span>
                </div>
                <div style={{ padding: '24px 28px' }}>
                  <MonthlyMonitorSection
                    cnae={profile.cnae_principal}
                    tipoMei={profile.tipo_mei}
                    defaultMonth={profile.mes_atual ?? currentMonth}
                    defaultYear={currentYear}
                    defaultRevenue={profile.faturamento_mensal_estimado ?? 0}
                    defaultPayroll={profile.folha_mensal ?? 0}
                    initialSummary={monitorSummary}
                    initialTransition={monitorTransition}
                    recentRows={monthlyInputs.map(item => ({
                      ano: item.ano,
                      mes: item.mes,
                      faturamentoMes: Number(item.faturamento_mes),
                      folhaMes: Number(item.folha_mes),
                      anexoCalculado: item.anexo_calculado,
                      fatorR: item.fator_r,
                    }))}
                    monthlyInputsError={monthlyInputsError}
                  />
                </div>
              </Panel>
            </section>
          )}

          {/* ── Row 2 (legado): Atividades recentes + Monitor (compacto fallback) ─ */}
          <section style={{ display: 'grid', gridTemplateColumns: profile?.cnae_principal ? '1fr' : '1fr 380px', gap: 16, marginBottom: 16 }} className="db-row2">

            {/* Tabela de simulações */}
            <Panel style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text3)', display: 'block', marginBottom: 2 }}>
                    Histórico
                  </span>
                  <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Simulações recentes</h2>
                </div>
                <Link
                  href={freeSimulationLimitReached ? '/upgrade' : '/dashboard/simular'}
                  className="dashboard-action dashboard-primary-action"
                  style={{ padding: '8px 14px', fontSize: 12 }}
                >
                  + Nova simulação
                </Link>
              </div>

              {simulationsError ? (
                <div style={{ padding: '20px 24px', background: 'rgba(255,204,0,0.05)' }}>
                  <p style={{ fontSize: 13, color: 'var(--yellow)', margin: '0 0 4px', fontWeight: 700 }}>Schema pendente no Supabase</p>
                  <p style={{ fontSize: 12, color: 'var(--text3)', margin: 0, lineHeight: 1.6 }}>
                    Tabela <code>simulations</code> não encontrada. O dashboard funciona, mas o histórico precisa da tabela e das políticas RLS.
                  </p>
                </div>
              ) : simulations.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg2)' }}>
                      {['ID', 'CNAE', 'Projeção', 'Cenário', 'Data'].map(col => (
                        <th key={col} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {simulations.map((item, i) => {
                      const isOk = item.resultado.alertaTeto.cenario === 'dentro_limite'
                      const isDanger = item.resultado.alertaTeto.cenario === 'excesso_grave'
                      const statusColor = isOk ? 'var(--lime)' : isDanger ? 'var(--red)' : 'var(--yellow)'
                      const statusLabel = isOk ? 'Saudável' : isDanger ? 'Crítico' : 'Atenção'
                      return (
                        <tr key={item.id} style={{ borderTop: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.012)' }}>
                          <td style={{ padding: '13px 16px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                            #{item.id.slice(-6).toUpperCase()}
                          </td>
                          <td style={{ padding: '13px 16px', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{item.entrada.cnae.slice(0, 32)}{item.entrada.cnae.length > 32 ? '…' : ''}</span>
                          </td>
                          <td style={{ padding: '13px 16px', fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, color: 'var(--text1)', whiteSpace: 'nowrap' }}>
                            {fmt(item.resultado.alertaTeto.projecaoAnual)}
                          </td>
                          <td style={{ padding: '13px 16px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                              <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, flexShrink: 0, boxShadow: `0 0 5px ${statusColor}` }} />
                              <span style={{ color: statusColor, fontWeight: 700 }}>{statusLabel}</span>
                            </span>
                          </td>
                          <td style={{ padding: '13px 16px', color: 'var(--text3)', fontSize: 12, whiteSpace: 'nowrap' }}>
                            {formatDate(item.created_at)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: '32px 24px', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text3)', fontSize: 13, lineHeight: 1.7, margin: '0 0 14px' }}>
                    Nenhuma simulação salva ainda. Faça uma simulação logado para ativar o histórico.
                  </p>
                  <Link href="/dashboard/simular" className="dashboard-action dashboard-primary-action" style={{ padding: '9px 16px', fontSize: 13 }}>
                    Ir para o simulador
                  </Link>
                </div>
              )}

              {currentPlan === 'free' && (
                <div style={{
                  padding: '12px 20px', borderTop: '1px solid var(--border)',
                  background: freeSimulationLimitReached ? 'rgba(255,74,74,0.06)' : 'var(--bg2)',
                  fontSize: 12, color: freeSimulationLimitReached ? 'var(--red)' : 'var(--text3)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span>{simulationsUsed} de {FREE_SIMULATION_LIMIT} simulações usadas</span>
                  {freeSimulationLimitReached && (
                    <Link href="/upgrade" style={{ fontSize: 12, fontWeight: 800, color: 'var(--lime)', textDecoration: 'none' }}>
                      Fazer upgrade →
                    </Link>
                  )}
                </div>
              )}
            </Panel>

            {/* Monitor mensal compacto — só mostra quando onboarding não foi
                completado (cnae_principal ausente). Caso contrário, o
                widget full-width acima já preenche esse papel. */}
            {!profile?.cnae_principal && (
              <Panel style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text3)', display: 'block', marginBottom: 2 }}>
                    Recorrência
                  </span>
                  <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Monitor mensal</h2>
                </div>
                <div style={{ padding: '20px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📅</div>
                  <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.7, margin: '0 0 14px' }}>
                    Complete o onboarding para ativar o monitor mensal com histórico e alerta de anexo.
                  </p>
                </div>
              </Panel>
            )}
          </section>

          {/* ── Row 3: Oportunidades + Calendário ────────────────── */}
          <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

            <Panel style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text3)', display: 'block', marginBottom: 2 }}>
                    Motor fiscal
                  </span>
                  <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Próximas melhores ações</h2>
                </div>
                {oportunidades.length > 0 && impactoTotal > 0 && (
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 800, color: 'var(--lime)' }}>
                    {fmt(impactoTotal)}/ano
                  </span>
                )}
              </div>
              <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {oportunidades.length > 0 ? oportunidades.slice(0, 3).map(item => (
                  <article key={item.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: item.prioridade === 'alta' ? 'var(--lime)' : 'var(--yellow)', background: item.prioridade === 'alta' ? 'rgba(200,241,53,0.1)' : 'rgba(245,197,66,0.1)', padding: '3px 7px', borderRadius: 4 }}>
                        {item.prioridade === 'alta' ? '▲' : '→'} {item.prioridade}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text3)', background: 'var(--bg3)', padding: '3px 7px', borderRadius: 4, fontWeight: 600 }}>{item.confianca}</span>
                    </div>
                    <h3 style={{ fontSize: 14, margin: '0 0 4px', lineHeight: 1.3, fontWeight: 700 }}>{item.titulo}</h3>
                    <p style={{ color: 'var(--text2)', fontSize: 12, lineHeight: 1.6, margin: 0 }}>{item.resumo}</p>
                  </article>
                )) : (
                  <div style={{ padding: '20px 0', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text3)', fontSize: 13, lineHeight: 1.7, margin: '0 0 12px' }}>
                      Rode uma simulação com CNAE e folha para o motor identificar oportunidades de economia.
                    </p>
                    <Link href="/dashboard/simular" className="dashboard-action dashboard-primary-action" style={{ padding: '8px 14px', fontSize: 12 }}>
                      Simular agora
                    </Link>
                  </div>
                )}
              </div>
            </Panel>

            <Panel style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text3)', display: 'block', marginBottom: 2 }}>
                  Agenda
                </span>
                <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Calendário fiscal</h2>
              </div>
              <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 0 }}>
                {calendarItems.map((item, i, arr) => {
                  // Cor base da severidade
                  const severityColors = {
                    critico: { fg: 'var(--red)', bg: 'rgba(255,59,59,0.08)', border: 'rgba(255,59,59,0.2)' },
                    atencao: { fg: 'var(--yellow)', bg: 'rgba(245,197,66,0.08)', border: 'rgba(245,197,66,0.2)' },
                    ok: { fg: 'var(--lime)', bg: 'rgba(200,241,53,0.08)', border: 'rgba(200,241,53,0.2)' },
                    info: { fg: 'var(--blue)', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.2)' },
                  } as const
                  const sev = severityColors[item.severity ?? 'info']
                  return (
                    <div
                      key={item.title}
                      style={{
                        padding: '12px 0',
                        borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                        display: 'flex', gap: 12, alignItems: 'flex-start',
                      }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: sev.bg, border: `1px solid ${sev.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={sev.fg} strokeWidth="2">
                          {item.channel === 'email' ? (
                            <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>
                          ) : item.channel === 'alerta' ? (
                            <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>
                          ) : (
                            <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>
                          )}
                        </svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2, color: 'var(--text1)' }}>{item.title}</div>
                        <p style={{ color: 'var(--text3)', fontSize: 11, lineHeight: 1.55, margin: 0 }}>{item.body}</p>
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        color: sev.fg, background: sev.bg, border: `1px solid ${sev.border}`,
                        padding: '3px 7px', borderRadius: 4,
                        flexShrink: 0, whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.04em',
                      }}>
                        {item.severity === 'critico' ? 'urgente' : item.severity === 'atencao' ? 'atenção' : item.severity === 'ok' ? 'em dia' : item.channel}
                      </span>
                    </div>
                  )
                })}

                {latest?.fatorR && latest.alertaTeto.projecaoAnual > 0 && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                    <FatorRInterativo
                      projecao={latest.alertaTeto.projecaoAnual}
                      fatorRInicial={latest.fatorR.fatorR}
                    />
                  </div>
                )}
              </div>
            </Panel>
          </section>

          {/* ── PDF CTA banner ───────────────────────────────────── */}
          <section style={{ marginBottom: 16 }}>
            <Panel style={{
              padding: '24px 32px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 24,
              borderColor: 'rgba(200,241,53,0.2)',
              background: 'linear-gradient(135deg, var(--bg1) 0%, rgba(200,241,53,0.03) 100%)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(200,241,53,0.1)', border: '1px solid rgba(200,241,53,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--lime)" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--lime)', marginBottom: 4 }}>Relatório premium</div>
                  <h2 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 4px' }}>PDF fiscal pronto para enviar ao contador</h2>
                  <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                    Comparativo de regimes, evidências de teto e memória de cálculo em um arquivo compartilhável.
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/relatorio"
                className="dashboard-action dashboard-primary-action"
                style={{ padding: '12px 22px', fontSize: 14, fontWeight: 850, whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                Gerar relatório
              </Link>
            </Panel>
          </section>

          {/* ── Bottom: Conta + Zona sensível ────────────────────── */}
          <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Panel style={{ padding: '24px 28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: `${PLAN_ACCENT_COLORS[currentPlan]}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={PLAN_ACCENT_COLORS[currentPlan]} strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text3)' }}>Conta</div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>{PLAN_LABELS[currentPlan]}</div>
                </div>
                <Pill color={PLAN_ACCENT_COLORS[currentPlan]} style={{ marginLeft: 'auto' }}>
                  {hasFullAdminAccess ? 'admin' : currentPlan}
                </Pill>
              </div>
              <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.7, margin: '0 0 4px' }}>
                {PLAN_DESCRIPTIONS[currentPlan]}
              </p>
              <p style={{ color: 'var(--text3)', fontSize: 12, lineHeight: 1.6, margin: 0 }}>
                {user.email} · {CNAE_OFICIAL_TOTAL.toLocaleString('pt-BR')} CNAEs monitorados
              </p>
            </Panel>

            <Panel style={{ padding: '24px 28px', borderColor: 'rgba(255,74,74,0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,74,74,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--red)' }}>Zona sensível</div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>Excluir conta</div>
                </div>
              </div>
              <DeleteAccountSection />
            </Panel>
          </section>
    </>
  )
}
