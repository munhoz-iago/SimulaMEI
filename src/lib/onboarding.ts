export interface UserProfileOnboarding {
  id: string
  email: string
  nome: string | null
  nome_negocio: string | null
  telefone: string | null
  cnae_principal: string | null
  tipo_mei: 'geral' | 'caminhoneiro' | null
  municipio: string | null
  uf: string | null
  faturamento_mensal_estimado: number | null
  faturamento_acumulado_atual: number | null
  folha_mensal: number | null
  mes_atual: number | null
  objetivo_principal: string | null
  atividades_realizadas: string | null
  onboarding_completed_at: string | null
  plano: 'free' | 'pro' | null
}

/**
 * Verifica se o onboarding está concluído.
 *
 * Cuidado com a semântica: a PR #6 (`PATCH /api/profile`) permite o usuário
 * LIMPAR `nome_negocio` e `telefone` (string vazia) na aba Conta. Antes,
 * `profile.x && ...` (truthy check) rejeitava `''` como se fosse "vazio
 * por nunca ter preenchido", mandando o user pra `/onboarding` mesmo
 * tendo já completado o wizard.
 *
 * Política nova: `null` = nunca preenchido (onboarding incompleto).
 * String vazia (`''`) = preenchido e depois limpo conscientemente
 * (onboarding completo). `nome_negocio` e `telefone` usam check
 * permissivo (`!== null`). Os outros mantêm truthy check porque o
 * PATCH não permite limpá-los.
 */
export function isOnboardingComplete(profile: Partial<UserProfileOnboarding> | null | undefined) {
  return Boolean(
    profile?.onboarding_completed_at &&
    profile.nome &&
    profile.nome_negocio !== null && profile.nome_negocio !== undefined &&
    profile.telefone !== null && profile.telefone !== undefined &&
    profile.cnae_principal &&
    profile.tipo_mei &&
    profile.municipio &&
    profile.uf &&
    typeof profile.faturamento_acumulado_atual === 'number' &&
    typeof profile.folha_mensal === 'number' &&
    typeof profile.mes_atual === 'number' &&
    profile.objetivo_principal &&
    profile.atividades_realizadas,
  )
}
