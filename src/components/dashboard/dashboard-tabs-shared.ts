/**
 * Tipos e helpers compartilhados das tabs do dashboard, isolados do
 * componente client (`DashboardTabs.tsx`) pra poder ser consumidos por
 * Server Components (página do dashboard parseia `?aba=` server-side).
 *
 * Quando uma função pura mora num arquivo `'use client'`, Next 16 trata
 * TODOS os exports como client-only e bloqueia chamadas server-side —
 * resultando em "Attempted to call X from the server but X is on the
 * client". Daí o split.
 */

export const TABS = [
  { id: 'monitor', label: 'Monitor mensal' },
  { id: 'fator-r', label: 'Fator R' },
  { id: 'simulacoes', label: 'Simulações' },
  { id: 'agenda', label: 'Agenda fiscal' },
  { id: 'conta', label: 'Conta' },
] as const

export type DashboardTab = typeof TABS[number]['id']

export function parseDashboardTab(raw: string | string[] | undefined): DashboardTab {
  const v = Array.isArray(raw) ? raw[0] : raw
  return TABS.some(t => t.id === v) ? (v as DashboardTab) : 'monitor'
}
