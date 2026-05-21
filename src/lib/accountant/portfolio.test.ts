import { describe, expect, it } from "vitest";
import {
  calcularDistribuicaoRisco,
  identificarOportunidades,
  gerarAlertasPrioritarios,
  analisarCarteira,
  filtrarClientes,
  PORTFOLIO_RISCO_ORDEM,
  type ClienteComSimulacao,
} from "./portfolio";

// Fixtures
const mockResultadoBase = {
  entrada: {
    faturamentoAcumulado: 40000,
    mesAtual: 6,
    cnae: "6201-5/01",
    folhaMensal: 2000,
    tipoMei: "geral" as const,
  },
  alertaTeto: {
    faturamentoAcumulado: 40000,
    tetoAnual: 81000,
    tipoMei: "geral" as const,
    projecaoAnual: 80000,
    diferenca: 1000,
    percentualUtilizado: 0.987,
    mesesRestantes: 6,
    mesesParaTeto: 1,
    mesEstourarTeto: null,
    cenario: "dentro_limite" as const,
    excessoProjetado: 0,
    percentualExcesso: 0,
  },
  fatorR: {
    folha12meses: 24000,
    rbt12: 80000,
    fatorR: 0.3,
    fatorRPercent: 30,
    atingeMinimo: true,
    anexoResultante: "III" as const,
    proLaboreMinimo: 2240,
    folhaMinimaAnual: 22400,
    folhaMinimaMensal: 2240,
    aumentoFolhaMensalNecessario: 0,
    economiaAnual: 0,
    memoriaCalculo: {
      aliquotaEfetivaAnexoV: 0.155,
      aliquotaEfetivaAnexoIII: 0.06,
      rbt12Projetado: 80000,
      diferencaAliquota: 0.095,
      economiaAnual: 7600,
    },
  },
  anexoAtual: "III" as const,
  comparativo: {
    simplesAnexoAtual: {
      rbt12: 80000,
      faixa: 4,
      aliquotaNominal: 0.13,
      parcelaDeduzir: 5610,
      aliquotaEfetiva: 0.06,
      dasAnual: 4800,
      dasMensal: 400,
      anexo: "III" as const,
    },
    presumido: {
      receitaAnual: 80000,
      categoria: "servicos" as const,
      presuncaoUtilizada: 0.32,
      irpj: 2400,
      csll: 1920,
      pis: 528,
      cofins: 2432,
      iss: 2640,
      total: 9920,
      aliquotaEfetiva: 0.124,
      inssProLabore: 2640,
      inssPatronal: 4800,
      custoTotal: 17360,
      aliquotaEfetivaCustoTotal: 0.217,
    },
    real: {
      receitaAnual: 80000,
      margemLiquida: 0.3,
      lucroEstimado: 24000,
      categoria: "servicos" as const,
      irpj: 1440,
      csll: 1200,
      pis: 528,
      cofins: 2432,
      iss: 2640,
      total: 8240,
      aliquotaEfetiva: 0.103,
      inssProLabore: 2640,
      inssPatronal: 4800,
      custoTotal: 15680,
      aliquotaEfetivaCustoTotal: 0.196,
    },
    melhorRegime: "simplesAtual" as const,
    economiaVsMelhor: 0,
  },
  taxRuleVersion: "BR-MEI-SN-2026-05-08",
  geradoEm: "2026-05-08T12:00:00Z",
};

function criarCliente(
  id: string,
  nome: string,
  percentualUtilizado: number,
  ativo = true,
  fatorROtimizado = true,
): ClienteComSimulacao {
  return {
    id,
    nome,
    email: `${id}@test.com`,
    cnae: "6201-5/01",
    tipoMei: "geral",
    ativo,
    ultimaSimulacao: {
      id: `sim-${id}`,
      resultado: {
        ...mockResultadoBase,
        alertaTeto: {
          ...mockResultadoBase.alertaTeto,
          percentualUtilizado,
        },
        fatorR: fatorROtimizado
          ? {
              ...mockResultadoBase.fatorR!,
              atingeMinimo: true,
              economiaAnual: 0,
            }
          : {
              ...mockResultadoBase.fatorR!,
              atingeMinimo: false,
              economiaAnual: 5000,
            },
      },
      createdAt: "2026-05-08T12:00:00Z",
    },
  };
}

describe("portfolio", () => {
  describe("calcularDistribuicaoRisco", () => {
    it("distribui clientes por nível de risco", () => {
      const clientes = [
        criarCliente("1", "João", 0.5), // saudavel
        criarCliente("2", "Maria", 0.75), // atencao
        criarCliente("3", "Pedro", 0.85), // alerta
        criarCliente("4", "Ana", 0.95), // urgente
        criarCliente("5", "Carlos", 1.05), // critico
        { ...criarCliente("6", "Sem simulação", 0.5), ultimaSimulacao: null },
      ];

      const distro = calcularDistribuicaoRisco(clientes);

      expect(distro.saudavel).toBe(1);
      expect(distro.atencao).toBe(1);
      expect(distro.alerta).toBe(1);
      expect(distro.urgente).toBe(1);
      expect(distro.critico).toBe(1);
      expect(distro.semDados).toBe(1);
    });

    it("retorna zero para carteira vazia", () => {
      const distro = calcularDistribuicaoRisco([]);

      expect(distro.saudavel).toBe(0);
      expect(distro.semDados).toBe(0);
    });
  });

  describe("identificarOportunidades", () => {
    it("identifica Fator R não otimizado", () => {
      const clientes = [
        criarCliente("1", "Otimizado", 0.5, true, true),
        criarCliente("2", "Não otimizado", 0.5, true, false),
        criarCliente("3", "Não otimizado 2", 0.6, true, false),
      ];

      const oportunidades = identificarOportunidades(clientes);

      const fatorR = oportunidades.find(
        (o) => o.tipo === "fator_r_nao_otimizado",
      );
      expect(fatorR?.quantidade).toBe(2);
      expect(fatorR?.impactoEstimadoTotal).toBeGreaterThan(0);
    });

    it("identifica clientes próximos do teto", () => {
      const clientes = [
        criarCliente("1", "Saudável", 0.5),
        criarCliente("2", "Próximo 1", 0.85),
        criarCliente("3", "Próximo 2", 0.9),
        criarCliente("4", "Acima do teto", 1.05), // não conta
      ];

      const oportunidades = identificarOportunidades(clientes);

      const proximoTeto = oportunidades.find((o) => o.tipo === "proximo_teto");
      expect(proximoTeto?.quantidade).toBe(2);
    });

    it("retorna array vazio sem oportunidades", () => {
      const clientes = [criarCliente("1", "Saudável", 0.5, true, true)];
      const oportunidades = identificarOportunidades(clientes);
      expect(oportunidades).toHaveLength(0);
    });
  });

  describe("gerarAlertasPrioritarios", () => {
    it("ordena alertas por severidade", () => {
      const clientes = [
        criarCliente("1", "Atenção", 0.75),
        criarCliente("2", "Crítico", 1.05),
        criarCliente("3", "Saudável", 0.5), // não gera alerta
      ];

      const alertas = gerarAlertasPrioritarios(clientes);

      expect(alertas[0].clienteNome).toBe("Crítico");
      expect(alertas[0].severidade).toBe("critico");
    });

    it("limita quantidade de alertas", () => {
      const clientes = Array.from({ length: 20 }, (_, i) =>
        criarCliente(String(i), `Cliente ${i}`, 0.95),
      );

      const alertas = gerarAlertasPrioritarios(clientes, 5);
      expect(alertas).toHaveLength(5);
    });

    it("inclui alerta de Fator R quando há economia significativa", () => {
      const cliente = criarCliente("1", "Fator R", 0.6, true, false);
      const alertas = gerarAlertasPrioritarios([cliente]);

      const alertaFatorR = alertas.find((a) => a.tipo === "fator_r");
      expect(alertaFatorR).toBeDefined();
      expect(alertaFatorR?.valor).toBeGreaterThan(1000);
    });
  });

  describe("analisarCarteira", () => {
    it("retorna resumo completo", () => {
      const clientes = [
        criarCliente("1", "Ativo 1", 0.5),
        criarCliente("2", "Ativo 2", 0.95),
        { ...criarCliente("3", "Inativo", 0.5), ativo: false },
      ];

      const resumo = analisarCarteira(clientes);

      expect(resumo.totalClientes).toBe(3);
      expect(resumo.clientesAtivos).toBe(2);
      expect(resumo.porRisco.saudavel).toBe(1);
      expect(resumo.porRisco.urgente).toBe(1);
      expect(resumo.ultimaAtualizacao).toBeDefined();
    });
  });

  describe("filtrarClientes", () => {
    const clientes = [
      criarCliente("1", "João Silva", 0.5),
      criarCliente("2", "Maria Santos", 0.85),
      criarCliente("3", "Pedro Costa", 0.95),
      { ...criarCliente("4", "Ana Inativa", 0.5), ativo: false },
      {
        ...criarCliente("5", "Sem Simulação Inativo", 0.5),
        ativo: false,
        ultimaSimulacao: null,
      },
    ];

    it("filtra por risco", () => {
      const filtrados = filtrarClientes(clientes, { risco: "urgente" });
      expect(filtrados).toHaveLength(1);
      expect(filtrados[0].nome).toBe("Pedro Costa");
    });

    it("filtra por status ativo", () => {
      const filtrados = filtrarClientes(clientes, { ativo: true });
      expect(filtrados).toHaveLength(3);
    });

    it("filtra por busca textual", () => {
      const filtrados = filtrarClientes(clientes, { busca: "maria" });
      expect(filtrados).toHaveLength(1);
      expect(filtrados[0].nome).toBe("Maria Santos");
    });

    it("filtra clientes sem dados", () => {
      const filtrados = filtrarClientes(clientes, {
        risco: "sem_dados",
        ativo: false,
      });
      expect(filtrados).toHaveLength(1);
      expect(filtrados[0].nome).toBe("Sem Simulação Inativo");
    });

    it("combina múltiplos filtros", () => {
      const filtrados = filtrarClientes(clientes, {
        ativo: true,
        busca: "silva",
      });
      expect(filtrados).toHaveLength(1);
      expect(filtrados[0].nome).toBe("João Silva");
    });
  });

  describe("PORTFOLIO_RISCO_ORDEM", () => {
    it("ordena do mais grave para o menos grave", () => {
      expect(PORTFOLIO_RISCO_ORDEM[0]).toBe("excesso_grave");
      expect(PORTFOLIO_RISCO_ORDEM[PORTFOLIO_RISCO_ORDEM.length - 1]).toBe(
        "saudavel",
      );
    });
  });
});
