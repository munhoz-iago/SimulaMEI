import type { CSSProperties } from 'react'

/**
 * Estilos compartilhados entre os cards editaveis da aba Conta
 * (IdentityCard, FiscalActivityCard, OperationsCard).
 *
 * Antes: 3x duplicacao de label/input/row/rowLabel/rowValue.
 * Agora: importa daqui. Mantem consistencia visual entre os 3.
 */

export const profileCardLabel: CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--text3)',
  marginBottom: 6,
}

export const profileCardInput: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border2)',
  background: 'var(--bg2)',
  color: 'var(--text1)',
  fontSize: 14,
  fontFamily: 'var(--sans, inherit)',
}

export const profileCardRowLabel: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--text3)',
}

export const profileCardRowValue: CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--text1)',
  wordBreak: 'break-word',
}

/**
 * Cria um row layout (grid 2 colunas) com largura da label customizavel.
 * Default: 120px. Operations usa 170px para acomodar labels mais longas
 * ("Faturamento mes", "Mes de referencia", etc).
 */
export function profileCardRow(labelColWidth = '120px'): CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: `${labelColWidth} 1fr`,
    gap: 10,
    alignItems: 'baseline',
  }
}
