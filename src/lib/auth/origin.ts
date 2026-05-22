import { DEFAULT_SITE_URL } from '@/constants/site'

/**
 * Hostnames canônicos de produção. OAuth callbacks vindos desses hosts
 * usam a URL estável; qualquer outro host (preview Vercel, localhost,
 * branch alias) usa `window.location.origin`.
 */
const CANONICAL_HOSTNAMES = new Set(['simulamei.com.br', 'www.simulamei.com.br'])

/**
 * Retorna a origem estável para callbacks OAuth e e-mail de auth.
 *
 * Problema que isto resolve: usar `window.location.origin` direto no
 * `redirectTo` do Google OAuth (e no `emailRedirectTo` do signUp/resend)
 * captura a URL do deployment atual do Vercel. Em produção isso é
 * inofensivo (hostname é estável). Em **preview deploys**, cada push à
 * branch gera novo deployment hash; deployments antigos podem ser
 * coletados/substituídos entre o início do fluxo OAuth e o callback do
 * provedor, resultando em 404 `DEPLOYMENT_NOT_FOUND` ao voltar.
 *
 * Estratégia: se o usuário está num hostname canônico, fixe a URL
 * canônica (estável); senão, preserve a origem atual (necessário pra
 * localhost dev e pra que preview deploys ainda completem o ciclo OAuth
 * na própria URL de preview enquanto ela existir).
 *
 * SSR safe: retorna `DEFAULT_SITE_URL` se `window` indisponível (improvável
 * em código client component, mas defesa barata).
 */
export function getAuthCallbackOrigin(): string {
  if (typeof window === 'undefined') {
    return DEFAULT_SITE_URL
  }
  if (CANONICAL_HOSTNAMES.has(window.location.hostname)) {
    return `https://${window.location.hostname}`
  }
  return window.location.origin
}
