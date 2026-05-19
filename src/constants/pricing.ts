export const REPORT_PRICE_CENTAVOS = 990
export const REPORT_PRICE_BRL = 9.9
export const REPORT_PRICE_LABEL = 'R$ 9,90'

/** Formata centavos como moeda BRL (ex.: 990 -> "R$ 9,90"). */
export function formatBRL(centavos: number): string {
  // Intl usa U+00A0 (NBSP, codepoint 160) como separador; normaliza para espaco ASCII.
  // String.fromCharCode(160) evita qualquer caractere invisivel no fonte.
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(new RegExp(String.fromCharCode(160), 'g'), ' ')
}
