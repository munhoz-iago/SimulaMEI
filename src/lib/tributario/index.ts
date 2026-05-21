// index.ts - Orquestrador do motor tributario SimulaMEI
// Entrada unica para toda a logica fiscal.
// TAX_RULE_VERSION: 'BR-MEI-SN-2026-04-28'

import type {
  EntradaSimulacao,
  ResultadoSimulacao,
  ComparativoRegimes,
  Anexo,
  CnaeCategoriaFiscal,
} from "@/types/tributario";
import { TAX_RULE_VERSION } from "./limitesMei";
import { calcularAlertaTeto } from "./alertas";
import { calcularFatorR, calcularFolhaFatorR, determinarAnexo } from "./fatorR";
import { calcularSimples, calcularCustoRealAnexoIV } from "./simples";
import { calcularPresumido } from "./presumido";
import { calcularReal, MARGEM_REAL_DEFAULT } from "./real";
import { calcularCLT } from "./clt";
import { getCnae } from "./cnae";

/**
 * Executa a simulacao tributaria completa.
 * Retorna alerta de teto, Fator R (se elegivel), e comparativo de regimes.
 */
export function simular(entrada: EntradaSimulacao): ResultadoSimulacao {
  const {
    faturamentoAcumulado,
    mesAtual,
    cnae,
    folhaMensal,
    folhaDetalhada,
    tipoMei,
  } = entrada;

  // 1. Alerta de teto MEI
  const alertaTeto = calcularAlertaTeto(
    faturamentoAcumulado,
    mesAtual,
    tipoMei,
  );

  // 2. Dados do CNAE
  const cnaeInfo = getCnae(cnae);
  const anexoPadrao = (cnaeInfo?.anexoPadrao ?? "III") as Anexo;
  const elegivelFatorR = cnaeInfo?.elegivelFatorR ?? false;
  // Categoria fiscal: determina presuncao correta e incidencia de ISS
  const categoria: CnaeCategoriaFiscal = cnaeInfo?.categoria ?? "servicos";

  // 3. Fator R (apenas para atividades elegiveis)
  // Assumimos folha mensal constante nos 12 meses por simplicidade de entrada do MEI.
  const folhaCalculada = calcularFolhaFatorR(folhaDetalhada, folhaMensal);
  const folhaMensalCalculada = folhaCalculada.totalMensal;
  const folha12meses = folhaCalculada.total12meses;
  const rbt12 = alertaTeto.projecaoAnual;

  let fatorRResult = null;
  let anexoAtual: Anexo = anexoPadrao;

  if (elegivelFatorR && (anexoPadrao === "V" || anexoPadrao === "III")) {
    fatorRResult = calcularFatorR(folha12meses, rbt12, folhaCalculada);
    const anexoEfetivo = determinarAnexo(
      anexoPadrao as "III" | "IV" | "V",
      elegivelFatorR,
      fatorRResult.fatorR,
    );
    anexoAtual = anexoEfetivo;
  }

  // 4. Simples Nacional - Anexo atual
  const simplesAtual = calcularSimples(rbt12, anexoAtual);

  // 5. Simples Nacional - Anexo otimo (se ha troca disponivel)
  let simplesOtimo = null;
  // Só oferece Simples Ótimo se o CNAE for elegível ao Fator R e o anexo atual for V
  if (elegivelFatorR && anexoAtual === "V") {
    simplesOtimo = calcularSimples(rbt12, "III");
  }

  // 6. Lucro Presumido - presuncao correta por categoria, INSS incluido no custoTotal
  const presumido = calcularPresumido(rbt12, categoria, folhaMensalCalculada);

  // 7. Lucro Real - mesma categoria e folha (margem padrao de 30%)
  const real = calcularReal(
    rbt12,
    MARGEM_REAL_DEFAULT,
    categoria,
    folhaMensalCalculada,
  );

  // 8. Comparativo CLT (formalizacao como empregado)
  const clt = calcularCLT(rbt12);

  // 9. Custo real Anexo IV (se aplicavel)
  const custoIV =
    anexoAtual === "IV"
      ? calcularCustoRealAnexoIV(rbt12, folhaMensalCalculada)
      : null;

  // 10. Determinar melhor regime
  // Usa custoTotal (tributos + INSS) para Presumido e Real, pois o INSS e
  // obrigatorio nesses regimes mas nao esta embutido no DAS do Simples.
  const custoSimplesAtual = custoIV ? custoIV.totalReal : simplesAtual.dasAnual;
  const custoSimplesOtimo = simplesOtimo?.dasAnual ?? Infinity;
  const custoPresumido = presumido.custoTotal;
  const custoReal = real.custoTotal;

  const menorCusto = Math.min(
    custoSimplesAtual,
    custoSimplesOtimo,
    custoPresumido,
    custoReal,
  );

  let melhorRegime: ComparativoRegimes["melhorRegime"] = "simplesAtual";
  if (menorCusto === custoSimplesOtimo) melhorRegime = "simplesOtimo";
  else if (menorCusto === custoPresumido) melhorRegime = "presumido";
  else if (menorCusto === custoReal) melhorRegime = "real";

  const economiaVsMelhor = custoSimplesAtual - menorCusto;

  const comparativo: ComparativoRegimes = {
    simplesAnexoAtual: { ...simplesAtual, anexo: anexoAtual },
    ...(simplesOtimo
      ? { simplesAnexoOtimo: { ...simplesOtimo, anexo: "III" as Anexo } }
      : {}),
    presumido,
    real,
    clt,
    melhorRegime,
    economiaVsMelhor: Math.max(0, economiaVsMelhor),
  };

  return {
    entrada: { ...entrada, folhaMensal: folhaMensalCalculada },
    alertaTeto,
    fatorR: fatorRResult,
    anexoAtual,
    comparativo,
    taxRuleVersion: TAX_RULE_VERSION,
    geradoEm: new Date().toISOString(),
  };
}

// Re-exports uteis para componentes
export {
  calcularAumentoFolhaMensalNecessario,
  calcularFatorR,
  calcularFolhaFatorR,
  calcularFolhaMinimaAnualFatorR,
  calcularInssPessoalProLabore,
  analisarFatorR,
  calcularProLaboreIdeal,
} from "./fatorR";
export {
  calcularAlertaTeto,
  getCorUrgencia,
  getMensagemAlerta,
  getNomeMes,
  ALERTA_TETO_THRESHOLDS,
  getNivelAlertaUso,
  getEstiloAlertaUso,
} from "./alertas";
export {
  buscarCnaes,
  getCnae,
  getCnaesDestaque,
  getCnaesAgrupados,
  getAnexoEfetivo,
  isKnownCnaeCode,
  normalizeCnaeCode,
  CNAE_OFICIAL_TOTAL,
  CNAE_OFICIAL_FONTE,
} from "./cnae";
export {
  LIMITES_MEI,
  TOLERANCIA_EXCESSO,
  CENARIOS_LEGISLATIVOS_NAO_VIGENTES,
  TAX_RULE_VERSION,
} from "./limitesMei";
export { calcularSimples } from "./simples";
export { FATOR_R_MINIMO } from "./fatorR";
export { calcularPresumidoServicos, calcularPresumido } from "./presumido";
export { calcularReal } from "./real";
export { calcularCLT } from "./clt";
export { gerarOportunidadesFiscais } from "./oportunidades";
export type { EvidenciaFiscal, OportunidadeFiscal } from "./oportunidades";
