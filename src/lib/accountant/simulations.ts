import type { EntradaSimulacao, TipoMei } from '@/types/tributario'
import { getCnae, normalizeCnaeCode } from '@/lib/tributario'

export interface OfficeClientFiscalDefaults {
  cnae: string | null
  tipo_mei: string | null
}

export type OfficeClientSimulationPayload = Partial<EntradaSimulacao>

export type OfficeClientSimulationResult =
  | { ok: true; value: EntradaSimulacao }
  | { ok: false; error: string }

function isTipoMei(value: unknown): value is TipoMei {
  return value === 'geral' || value === 'caminhoneiro'
}

function isValidFolhaDetalhada(value: unknown): value is EntradaSimulacao['folhaDetalhada'] {
  if (typeof value === 'undefined') return true
  if (!value || typeof value !== 'object') return false

  return ['salariosClt', 'proLabore', 'inssPatronal', 'fgts', 'rpa', 'beneficios'].every(key => {
    const field = (value as Record<string, unknown>)[key]
    return typeof field === 'undefined' || (typeof field === 'number' && Number.isFinite(field) && field >= 0)
  })
}

function resolveCnae(payload: OfficeClientSimulationPayload, client: OfficeClientFiscalDefaults) {
  const source = typeof payload.cnae === 'string' && payload.cnae.trim()
    ? payload.cnae
    : client.cnae

  if (!source) {
    return { ok: false as const, error: 'Informe um CNAE oficial válido.' }
  }

  const normalized = normalizeCnaeCode(source)
  if (!getCnae(normalized)) {
    return { ok: false as const, error: 'CNAE não reconhecido. Informe um código oficial válido.' }
  }

  return { ok: true as const, value: normalized }
}

function resolveTipoMei(payload: OfficeClientSimulationPayload, client: OfficeClientFiscalDefaults) {
  const source = payload.tipoMei ?? client.tipo_mei ?? 'geral'
  if (!isTipoMei(source)) {
    return { ok: false as const, error: 'Tipo de MEI inválido.' }
  }

  return { ok: true as const, value: source }
}

export function normalizeOfficeClientSimulation(
  payload: OfficeClientSimulationPayload,
  client: OfficeClientFiscalDefaults,
): OfficeClientSimulationResult {
  const { faturamentoAcumulado, mesAtual, folhaMensal, folhaDetalhada } = payload

  if (
    typeof faturamentoAcumulado !== 'number' ||
    !Number.isFinite(faturamentoAcumulado) ||
    typeof mesAtual !== 'number' ||
    !Number.isInteger(mesAtual) ||
    typeof folhaMensal !== 'number' ||
    !Number.isFinite(folhaMensal) ||
    !isValidFolhaDetalhada(folhaDetalhada)
  ) {
    return {
      ok: false,
      error: 'Campos inválidos. Verifique faturamentoAcumulado, mesAtual, folhaMensal e folhaDetalhada.',
    }
  }

  if (mesAtual < 1 || mesAtual > 12) {
    return { ok: false, error: 'mesAtual deve ser entre 1 e 12.' }
  }

  if (faturamentoAcumulado < 0 || folhaMensal < 0) {
    return { ok: false, error: 'Valores monetários não podem ser negativos.' }
  }

  const cnae = resolveCnae(payload, client)
  if (!cnae.ok) return cnae

  const tipoMei = resolveTipoMei(payload, client)
  if (!tipoMei.ok) return tipoMei

  return {
    ok: true,
    value: {
      faturamentoAcumulado,
      mesAtual,
      folhaMensal,
      cnae: cnae.value,
      ...(folhaDetalhada ? { folhaDetalhada } : {}),
      tipoMei: tipoMei.value,
    },
  }
}
