export type ReportVariant = 'full' | 'preview'

/** Texto da marca d'água: só no preview. */
export function reportWatermark(variant: ReportVariant): string | null {
  return variant === 'preview' ? 'AMOSTRA' : null
}

/** Fonte de título: marca se o Font.register funcionou, senão Helvetica. */
export function resolveHeadingFont(registerOk: boolean): string {
  return registerOk ? 'SpaceGrotesk' : 'Helvetica'
}
