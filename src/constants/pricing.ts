export const REPORT_PRICE_CENTAVOS = 990
export const REPORT_PRICE_BRL = 9.9
export const REPORT_PRICE_LABEL = 'R$ 9,90'

/** Formata centavos como moeda BRL (ex.: 990 -> "R$ 9,90"). */
export function formatBRL(centavos: number): string {
  return (centavos / 100)
    .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    // Intl usa U+00A0 (NBSP) como separador; normaliza para espaço ASCII.
    .replace(/ /g, ' ')
}
