import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { gerarDiagnosticoFiscal } from '@/lib/ai/diagnostico'
import { getCnae, normalizeCnaeCode, simular } from '@/lib/tributario'
import type { EntradaSimulacao, ResultadoSimulacao } from '@/types/tributario'

interface SimulationRow {
  resultado: ResultadoSimulacao
}

const folhaDetalhadaSchema = z.object({
  salariosClt: z.number().finite().nonnegative().optional(),
  proLabore: z.number().finite().nonnegative().optional(),
  inssPatronal: z.number().finite().nonnegative().optional(),
  fgts: z.number().finite().nonnegative().optional(),
  rpa: z.number().finite().nonnegative().optional(),
  beneficios: z.number().finite().nonnegative().optional(),
}).strict()

const diagnosticoPostSchema = z.object({
  entrada: z.object({
    faturamentoAcumulado: z.number().finite().nonnegative(),
    mesAtual: z.number().int().min(1).max(12),
    cnae: z.string().trim().min(1).max(16),
    folhaMensal: z.number().finite().nonnegative(),
    folhaDetalhada: folhaDetalhadaSchema.optional(),
    tipoMei: z.enum(['geral', 'caminhoneiro']),
  }).strict(),
}).passthrough()

function toEntradaSimulacao(entrada: z.infer<typeof diagnosticoPostSchema>['entrada']): EntradaSimulacao | null {
  const cnae = normalizeCnaeCode(entrada.cnae)
  if (!getCnae(cnae)) return null

  return {
    faturamentoAcumulado: entrada.faturamentoAcumulado,
    mesAtual: entrada.mesAtual,
    cnae,
    folhaMensal: entrada.folhaMensal,
    ...(entrada.folhaDetalhada ? { folhaDetalhada: entrada.folhaDetalhada } : {}),
    tipoMei: entrada.tipoMei,
  }
}

// POST /api/diagnostico
// Body: { entrada: EntradaSimulacao } — recalcula a simulação no servidor
// GET  /api/diagnostico — busca a última simulação do usuário autenticado
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Autenticação obrigatória.' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    const parsed = diagnosticoPostSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Payload inválido para diagnóstico fiscal.' }, { status: 400 })
    }

    const entrada = toEntradaSimulacao(parsed.data.entrada)
    if (!entrada) {
      return NextResponse.json({ error: 'CNAE não reconhecido. Informe um código oficial válido.' }, { status: 400 })
    }

    const resultado = simular(entrada)
    const diagnostico = await gerarDiagnosticoFiscal(resultado)
    return NextResponse.json(diagnostico)
  } catch (err) {
    console.error('[/api/diagnostico] POST error:', err)
    return NextResponse.json({ error: 'Erro ao gerar diagnóstico fiscal.' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Autenticação obrigatória.' }, { status: 401 })
    }

    const { data: simulations } = await supabase
      .from('simulations')
      .select('resultado')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    const latest = (simulations?.[0] as SimulationRow | undefined)?.resultado
    if (!latest) {
      return NextResponse.json({ error: 'Nenhuma simulação encontrada.' }, { status: 404 })
    }

    const diagnostico = await gerarDiagnosticoFiscal(latest)
    return NextResponse.json(diagnostico)
  } catch (err) {
    console.error('[/api/diagnostico] GET error:', err)
    return NextResponse.json({ error: 'Erro ao gerar diagnóstico fiscal.' }, { status: 500 })
  }
}
