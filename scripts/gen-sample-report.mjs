// scripts/gen-sample-report.mjs
// Gera sample-preview.pdf e sample-full.pdf na raiz do repo para validação visual.
// NOTA: SimulationReportDocument usa aliases @/* (tsconfig) e é server-only
// (lê a fonte via process.cwd()). node/tsx puro NÃO resolvem @/* — rode da
// raiz do repo com um runner que resolva os paths do tsconfig (ou veja o
// método via vitest usado para gerar os samples desta entrega).
import { renderToFile } from '@react-pdf/renderer'
import React from 'react'
import { SimulationReportDocument } from '../src/lib/reports/SimulationReportDocument.tsx'

const resultado = {
  entrada: { cnae: '9602-5/01', faturamentoAcumulado: 54000, mesAtual: 5, folhaMensal: 0, tipoMei: 'geral' },
  alertaTeto: { projecaoAnual: 129600, tetoAnual: 81000, cenario: 'excesso_grave' },
  anexoAtual: 'III',
  fatorR: null,
  comparativo: {
    simplesAnexoAtual: { dasAnual: 8000, anexo: 'III' },
    presumido: { custoTotal: 12000 },
    real: { custoTotal: 16000 },
    melhorRegime: 'simplesAtual',
  },
  taxRuleVersion: 'BR-MEI-SN-2026-04-28',
  geradoEm: new Date().toISOString(),
}

for (const variant of ['preview', 'full']) {
  await renderToFile(
    React.createElement(SimulationReportDocument, { email: 'amostra@simulamei.com.br', resultado, oportunidades: [], variant }),
    `sample-${variant}.pdf`,
  )
  console.log(`sample-${variant}.pdf gerado`)
}
