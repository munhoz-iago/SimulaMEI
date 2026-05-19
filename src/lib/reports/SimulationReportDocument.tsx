import React from 'react'
import { Document, Page, StyleSheet, Text, View, Font } from '@react-pdf/renderer'
import type { ResultadoSimulacao } from '@/types/tributario'
import type { OportunidadeFiscal } from '@/lib/tributario'
import { getCnae, TAX_RULE_VERSION } from '@/lib/tributario'
import { FONTES_FISCAIS } from '@/lib/tributario/oportunidades/fontes'
import { resultadoVisibilidade } from '@/components/resultado/CnaePendenteNotice'
import { buildRegimePreview } from '@/components/resultado/RegimePreviewLocked'
import { usoTetoPercent } from '@/components/simulador/usoTeto'
import { getLegalIdentity } from '@/constants/site'
import { reportWatermark, resolveHeadingFont, type ReportVariant } from './reportTemplate'

let REGISTER_OK = false
try {
  Font.register({
    family: 'SpaceGrotesk',
    src: 'https://fonts.gstatic.com/s/spacegrotesk/v16/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj62UXskPMBBSSJLm2E.ttf',
  })
  REGISTER_OK = true
} catch {
  REGISTER_OK = false
}

const HEAD = resolveHeadingFont(REGISTER_OK)
const INK = '#0F1B14'
const LIME = '#5B7F1F'
const MUTED = '#6B7280'
const BORDER = '#E5E7EB'

const styles = StyleSheet.create({
  page: { paddingTop: 0, paddingBottom: 56, paddingHorizontal: 0, fontSize: 10, fontFamily: 'Helvetica', color: INK },
  headerBand: { backgroundColor: INK, color: '#FFFFFF', padding: 28, marginBottom: 18 },
  brand: { fontSize: 18, fontFamily: HEAD, fontWeight: 700 },
  brandLime: { color: '#C8F135' },
  headSub: { fontSize: 9, color: '#C9D2CC', marginTop: 6 },
  body: { paddingHorizontal: 28 },
  h2: { fontSize: 13, fontFamily: HEAD, fontWeight: 700, marginBottom: 8, color: INK },
  block: { marginBottom: 16, padding: 14, border: `1 solid ${BORDER}`, borderRadius: 6 },
  row: { display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  rowK: { color: MUTED },
  rowV: { fontWeight: 700 },
  barRow: { display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  barLabel: { width: 110, fontSize: 9 },
  barTrack: { flexGrow: 1, height: 10, backgroundColor: '#F1F3F0', borderRadius: 3 },
  barFill: { height: 10, borderRadius: 3, backgroundColor: '#9CB4C0' },
  barBest: { backgroundColor: LIME },
  oppTitle: { fontWeight: 700, marginBottom: 2 },
  opp: { marginBottom: 8 },
  footer: { position: 'absolute', bottom: 20, left: 28, right: 28, fontSize: 8, color: MUTED, display: 'flex', flexDirection: 'row', justifyContent: 'space-between' },
  wm: { position: 'absolute', top: '42%', left: '8%', fontSize: 64, color: '#000000', opacity: 0.07, transform: 'rotate(-28deg)' },
})

export function SimulationReportDocument({
  email,
  resultado,
  oportunidades,
  variant = 'full',
}: {
  email: string
  resultado: ResultadoSimulacao
  oportunidades: OportunidadeFiscal[]
  variant?: ReportVariant
}) {
  const legal = getLegalIdentity()
  const wm = reportWatermark(variant)
  const classificacao = getCnae(resultado.entrada.cnae)?.classificacaoTributaria
  const vis = resultadoVisibilidade(classificacao)
  const pctTeto = usoTetoPercent(resultado.alertaTeto.projecaoAnual, resultado.alertaTeto.tetoAnual)
  const bars = vis.mostrarTributacao ? buildRegimePreview(resultado.comparativo) : []

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {wm && <Text style={styles.wm} fixed>{wm}</Text>}

        <View style={styles.headerBand}>
          <Text style={styles.brand}>Simula<Text style={styles.brandLime}>MEI</Text> — Relatório fiscal</Text>
          <Text style={styles.headSub}>
            {email} · Gerado em {new Date(resultado.geradoEm).toLocaleString('pt-BR')} · Motor {TAX_RULE_VERSION.replace('BR-MEI-SN-', 'v')}
          </Text>
          <Text style={styles.headSub}>{legal.line}</Text>
        </View>

        <View style={styles.body}>
          <View style={styles.block}>
            <Text style={styles.h2}>Resumo do cenário</Text>
            <View style={styles.row}><Text style={styles.rowK}>CNAE</Text><Text style={styles.rowV}>{resultado.entrada.cnae}</Text></View>
            <View style={styles.row}><Text style={styles.rowK}>Faturamento acumulado</Text><Text style={styles.rowV}>R$ {resultado.entrada.faturamentoAcumulado.toLocaleString('pt-BR')}</Text></View>
            <View style={styles.row}><Text style={styles.rowK}>Projeção anual</Text><Text style={styles.rowV}>R$ {resultado.alertaTeto.projecaoAnual.toLocaleString('pt-BR')}</Text></View>
            <View style={styles.row}><Text style={styles.rowK}>Uso do teto</Text><Text style={styles.rowV}>{pctTeto.toFixed(0)}%</Text></View>
            {vis.mostrarTributacao && (
              <View style={styles.row}><Text style={styles.rowK}>Anexo atual</Text><Text style={styles.rowV}>{resultado.anexoAtual}</Text></View>
            )}
          </View>

          {vis.mostrarTributacao ? (
            <View style={styles.block}>
              <Text style={styles.h2}>Comparativo de regimes</Text>
              {bars.map(b => (
                <View key={b.label} style={styles.barRow}>
                  <Text style={styles.barLabel}>{b.label}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, b.melhor ? styles.barBest : {}, { width: `${Math.max(b.pct, 4)}%` }]} />
                  </View>
                </View>
              ))}
              <Text style={{ fontSize: 8, color: MUTED, marginTop: 4 }}>Barra menor = menor custo. Verde = regime mais barato.</Text>
            </View>
          ) : (
            <View style={styles.block}>
              <Text style={styles.h2}>Anexo e Fator R indisponíveis</Text>
              <Text>Teto e projeção acima são exatos. Este CNAE é oficial mas ainda sem curadoria tributária — Anexo, alíquota e Fator R não são exibidos para não apresentar estimativa não verificada como confiável.</Text>
            </View>
          )}

          <View style={styles.block}>
            <Text style={styles.h2}>Oportunidades identificadas</Text>
            {oportunidades.length > 0 ? oportunidades.slice(0, 4).map(item => (
              <View key={item.id} style={styles.opp}>
                <Text style={styles.oppTitle}>{item.titulo}</Text>
                <Text>{item.resumo}</Text>
              </View>
            )) : <Text>Nenhuma oportunidade relevante para o cenário atual.</Text>}
          </View>

          <View style={styles.block}>
            <Text style={styles.h2}>Fontes & metodologia</Text>
            <Text>Fonte: {FONTES_FISCAIS.resolucaoCgsn140.titulo} · {FONTES_FISCAIS.simplesNacionalLegislacao.titulo}</Text>
            <Text style={{ marginTop: 4 }}>Motor {TAX_RULE_VERSION.replace('BR-MEI-SN-', 'v')} · Metodologia completa em /metodologia</Text>
            <Text style={{ marginTop: 6, color: MUTED }}>Estimativa educacional — não substitui análise de contador habilitado pelo CRC. {legal.line}.</Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>{legal.line}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
