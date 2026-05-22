import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getCnae, normalizeCnaeCode } from '@/lib/tributario'
import { normalizeBoundedText, ONBOARDING_TEXT_LIMITS } from '@/lib/validation'

const UF_RE = /^[A-Z]{2}$/

// Schema: todos os campos opcionais. Se enviado, valida.
// `.strict()` rejeita campos desconhecidos com erro de parse (400).
const PayloadSchema = z.object({
  nome: z.string().optional(),
  nomeNegocio: z.string().optional(),
  telefone: z.string().optional(),
  cnaePrincipal: z.string().optional(),
  tipoMei: z.enum(['geral', 'caminhoneiro']).optional(),
  municipio: z.string().optional(),
  uf: z.string().optional(),
  faturamentoMensalEstimado: z.number().finite().nonnegative().optional(),
  faturamentoAcumuladoAtual: z.number().finite().nonnegative().optional(),
  folhaMensal: z.number().finite().nonnegative().optional(),
  mesAtual: z.number().int().min(1).max(12).optional(),
  objetivoPrincipal: z.string().optional(),
}).strict()

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Autenticação obrigatória.' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = PayloadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Payload inválido.', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  // Normaliza cada campo presente. Aborta no primeiro inválido pra dar mensagem útil.
  const updates: Record<string, unknown> = {}

  if (parsed.data.nome !== undefined) {
    const n = normalizeBoundedText(parsed.data.nome, ONBOARDING_TEXT_LIMITS.nome)
    if (!n) return NextResponse.json({ error: 'Nome inválido.' }, { status: 400 })
    updates.nome = n
  }
  if (parsed.data.nomeNegocio !== undefined) {
    const n = normalizeBoundedText(parsed.data.nomeNegocio, ONBOARDING_TEXT_LIMITS.nomeNegocio)
    if (!n) return NextResponse.json({ error: 'Nome do negócio inválido.' }, { status: 400 })
    updates.nome_negocio = n
  }
  if (parsed.data.telefone !== undefined) {
    const n = normalizeBoundedText(parsed.data.telefone, ONBOARDING_TEXT_LIMITS.telefone)
    if (!n) return NextResponse.json({ error: 'Telefone inválido.' }, { status: 400 })
    updates.telefone = n
  }
  if (parsed.data.cnaePrincipal !== undefined) {
    const cnae = normalizeCnaeCode(parsed.data.cnaePrincipal)
    if (!cnae || !getCnae(cnae)) {
      return NextResponse.json({ error: 'CNAE não reconhecido. Informe um código oficial válido.' }, { status: 400 })
    }
    updates.cnae_principal = cnae
  }
  if (parsed.data.tipoMei !== undefined) {
    updates.tipo_mei = parsed.data.tipoMei
  }
  if (parsed.data.municipio !== undefined) {
    const m = normalizeBoundedText(parsed.data.municipio, ONBOARDING_TEXT_LIMITS.municipio)
    if (!m) return NextResponse.json({ error: 'Município inválido.' }, { status: 400 })
    updates.municipio = m
  }
  if (parsed.data.uf !== undefined) {
    const ufRaw = normalizeBoundedText(parsed.data.uf, 2)
    const uf = ufRaw?.toUpperCase() ?? ''
    if (!UF_RE.test(uf)) {
      return NextResponse.json({ error: 'UF deve ter 2 letras maiúsculas.' }, { status: 400 })
    }
    updates.uf = uf
  }
  if (parsed.data.faturamentoMensalEstimado !== undefined) {
    updates.faturamento_mensal_estimado = parsed.data.faturamentoMensalEstimado
  }
  if (parsed.data.faturamentoAcumuladoAtual !== undefined) {
    updates.faturamento_acumulado_atual = parsed.data.faturamentoAcumuladoAtual
  }
  if (parsed.data.folhaMensal !== undefined) {
    updates.folha_mensal = parsed.data.folhaMensal
  }
  if (parsed.data.mesAtual !== undefined) {
    updates.mes_atual = parsed.data.mesAtual
  }
  if (parsed.data.objetivoPrincipal !== undefined) {
    const o = normalizeBoundedText(parsed.data.objetivoPrincipal, ONBOARDING_TEXT_LIMITS.objetivoPrincipal)
    if (!o) return NextResponse.json({ error: 'Objetivo inválido.' }, { status: 400 })
    updates.objetivo_principal = o
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo válido para atualizar.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) {
    console.error('[/api/profile PATCH] error:', error.message)
    return NextResponse.json({ error: 'Não foi possível salvar agora.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
