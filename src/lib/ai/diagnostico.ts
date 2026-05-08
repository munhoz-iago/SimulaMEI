import Anthropic from '@anthropic-ai/sdk'
import type { ResultadoSimulacao } from '@/types/tributario'
import { getCnae } from '@/lib/tributario'

const DIAGNOSTICO_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5'
const DIAGNOSTICO_MAX_TOKENS = 1024

export interface DiagnosticoFiscal {
  resumoExecutivo: string
  situacaoTeto: {
    diagnostico: string
    interpretacao: string
    acaoRecomendada: string
  }
  oportunidadesFiscais: Array<{
    titulo: string
    economia: string
    descricao: string
    dificuldade: 'baixa' | 'média' | 'alta'
    prazo: 'imediato' | '30 dias' | '3 meses' | '6 meses'
  }>
  proximosPassos: Array<{
    ordem: number
    acao: string
    motivo: string
  }>
  alertas: Array<{
    tipo: 'risco' | 'oportunidade' | 'prazo'
    mensagem: string
  }>
  perguntasParaContador: string[]
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function buildPrompt(resultado: ResultadoSimulacao): string {
  const { entrada, alertaTeto, fatorR, anexoAtual, comparativo } = resultado
  const cnaeInfo = getCnae(entrada.cnae)

  const simplesAtual = comparativo.simplesAnexoAtual
  const presumido = comparativo.presumido
  const real = comparativo.real
  const melhorRegime = comparativo.melhorRegime

  const melhorRegimeLabel: Record<string, string> = {
    simplesAtual: `Simples Nacional (Anexo ${anexoAtual})`,
    simplesOtimo: 'Simples Nacional (Anexo III)',
    presumido: 'Lucro Presumido',
    real: 'Lucro Real',
  }

  const custoAtual = simplesAtual.dasAnual
  return `Você é um consultor tributário especializado em MEI e Simples Nacional no Brasil.
Analise os dados fiscais abaixo e produza um relatório de diagnóstico empresarial em português, com linguagem acessível para um empreendedor — não para um contador.

## Dados do negócio

CNAE: ${entrada.cnae} — ${cnaeInfo?.descricao ?? 'Atividade não identificada'} (${cnaeInfo?.categoria ?? ''})
Tipo MEI: ${entrada.tipoMei}
Mês atual: ${entrada.mesAtual}/2026
Faturamento acumulado: R$ ${formatBRL(alertaTeto.faturamentoAcumulado)}
Projeção anual: R$ ${formatBRL(alertaTeto.projecaoAnual)}
Teto MEI 2026: R$ ${formatBRL(alertaTeto.tetoAnual)}
Uso do teto: ${alertaTeto.percentualUtilizado.toFixed(1)}%
Folha mensal (pró-labore + funcionários): R$ ${formatBRL(entrada.folhaMensal)}

## Motor tributário

Anexo atual do Simples: ${anexoAtual}
Alíquota efetiva atual: ${simplesAtual.aliquotaEfetiva.toFixed(2)}%
DAS anual estimado: R$ ${formatBRL(simplesAtual.dasAnual)}

${fatorR ? `Fator R: ${fatorR.fatorRPercent.toFixed(1)}% — ${fatorR.atingeMinimo ? 'Elegível ao Anexo III' : 'Abaixo de 28%, no Anexo V'}
Anexo resultante pelo Fator R: ${fatorR.anexoResultante}
Pró-labore mínimo para atingir 28%: R$ ${formatBRL(fatorR.proLaboreMinimo)}/mês
Economia anual estimada se elegível Anexo III: R$ ${formatBRL(fatorR.economiaAnual)}` : 'Fator R: não se aplica ao CNAE informado'}

Comparativo de regimes:
- Simples Nacional (Anexo ${anexoAtual}): R$ ${formatBRL(custoAtual)}/ano (${simplesAtual.aliquotaEfetiva.toFixed(2)}%)
- Lucro Presumido: R$ ${formatBRL(presumido.total)}/ano (${presumido.aliquotaEfetiva.toFixed(2)}%)
- Lucro Real: R$ ${formatBRL(real.total)}/ano (${real.aliquotaEfetiva.toFixed(2)}%)
- Melhor regime identificado: ${melhorRegimeLabel[melhorRegime]}
- Economia vs regime atual: R$ ${formatBRL(comparativo.economiaVsMelhor)}/ano

## Instruções de saída

Produza um relatório JSON com EXATAMENTE esta estrutura (sem texto fora do JSON):

{
  "resumoExecutivo": "2-3 frases diretas sobre a situação fiscal atual do negócio. Sem jargão.",
  "situacaoTeto": {
    "diagnostico": "frase curta: verde/atenção/crítico",
    "interpretacao": "o que o número significa na prática para esse negócio específico",
    "acaoRecomendada": "o que fazer nos próximos 30-90 dias"
  },
  "oportunidadesFiscais": [
    {
      "titulo": "nome da oportunidade",
      "economia": "valor em R$ ou faixa",
      "descricao": "explicação em 1-2 frases com linguagem de dono de negócio",
      "dificuldade": "baixa | média | alta",
      "prazo": "imediato | 30 dias | 3 meses | 6 meses"
    }
  ],
  "proximosPassos": [
    {
      "ordem": 1,
      "acao": "descrição clara da ação",
      "motivo": "por que isso importa agora"
    }
  ],
  "alertas": [
    {
      "tipo": "risco | oportunidade | prazo",
      "mensagem": "alerta específico com número quando possível"
    }
  ],
  "perguntasParaContador": [
    "pergunta específica que o MEI deveria fazer ao contador ou ao SimulaMEI"
  ]
}

Regras:
- Máximo 3 oportunidades fiscais, priorizadas por impacto financeiro
- Máximo 4 próximos passos, em ordem de urgência
- Máximo 3 alertas
- Máximo 4 perguntas para o contador
- Nunca mencione valores fictícios — use apenas os dados fornecidos
- ${fatorR ? 'Analise a oportunidade do Fator R com os dados fornecidos' : 'Não mencione Fator R pois não se aplica ao CNAE informado'}
- Tom: direto, encorajador, sem alarmismo desnecessário`
}

export async function gerarDiagnosticoFiscal(
  resultado: ResultadoSimulacao,
): Promise<DiagnosticoFiscal> {
  const client = new Anthropic()
  const prompt = buildPrompt(resultado)

  const response = await client.messages.create({
    model: DIAGNOSTICO_MODEL,
    max_tokens: DIAGNOSTICO_MAX_TOKENS,
    messages: [{ role: 'user', content: prompt }],
  })

  const textBlock = response.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Resposta inesperada da API Claude')
  }

  const json = textBlock.text.trim()
  return JSON.parse(json) as DiagnosticoFiscal
}
