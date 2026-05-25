/**
 * Sanitiza valores exportados para XLSX contra formula injection.
 *
 * Excel e Google Sheets interpretam strings iniciadas por =, +, -, @,
 * tab ou carriage return como formulas. Prefixar com aspas simples força
 * tratamento como texto literal.
 */
export function sanitizeXlsxCell(value: string): string {
  if (!value) return value
  const first = value.charAt(0)
  return first === '=' || first === '+' || first === '-' || first === '@' || first === '\t' || first === '\r'
    ? `'${value}`
    : value
}
