/**
 * Regra de edição de lançamentos do Monitor mensal.
 *
 * Lançamentos podem ser corrigidos enquanto estão dentro da "janela editável":
 *   - Mês corrente: sempre editável
 *   - Mês anterior: editável até o dia 20 do mês seguinte
 *     (margem pra fechar o livro do mês com o contador)
 *   - Anterior ao mês anterior: trancado
 *
 * A lógica é compartilhada entre cliente (UI mostra cadeado/botão) e
 * servidor (POST rejeita updates fora da janela).
 */

export const EDIT_WINDOW_DAY = 20

export interface EditableResult {
  editable: boolean
  /** Mensagem amigável quando não-editável (pra mostrar em tooltip/UI) */
  reason?: string
  /** Última data em que o registro ainda pode ser editado (UTC) */
  editableUntil?: Date
}

function makeDate(ano: number, mes: number, day: number): Date {
  // Mês JS é 0-indexed
  return new Date(Date.UTC(ano, mes - 1, day))
}

/**
 * Calcula até quando um lançamento (ano, mes) pode ser editado.
 * Retorna a meia-noite (UTC) do primeiro dia em que NÃO pode mais ser editado.
 */
export function getEditableUntil(ano: number, mes: number): Date {
  // Edição vai até o dia 20 do mês SEGUINTE ao lançamento (exclusivo)
  const nextMonth = mes === 12 ? 1 : mes + 1
  const nextYear = mes === 12 ? ano + 1 : ano
  return makeDate(nextYear, nextMonth, EDIT_WINDOW_DAY + 1)
}

export function isEditable(
  ano: number,
  mes: number,
  refDate: Date = new Date(),
): EditableResult {
  const editableUntil = getEditableUntil(ano, mes)

  if (refDate < editableUntil) {
    return { editable: true, editableUntil }
  }

  return {
    editable: false,
    editableUntil,
    reason: `Lançamentos só podem ser editados até o dia ${EDIT_WINDOW_DAY} do mês seguinte. Para corrigir registros mais antigos, entre em contato com o suporte.`,
  }
}
