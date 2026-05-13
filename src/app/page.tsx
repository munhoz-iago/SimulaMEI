import Script from 'next/script'
import { redirect } from 'next/navigation'
import { HomeClient } from '@/components/home/HomeClient'
import { getSiteUrl, SITE_NAME, SITE_DESCRIPTION } from '@/constants/site'
import { getProfileAccess } from '@/lib/auth/profile-access'
import { createClient } from '@/lib/supabase/server'
import { LIMITES_MEI, simular } from '@/lib/tributario'
import type { ResultadoSimulacao, TipoMei } from '@/types/tributario'

type SearchParams = Record<string, string | string[] | undefined>

function getSingleParam(params: SearchParams, key: string) {
  const value = params[key]
  return Array.isArray(value) ? value[0] : value
}

interface SharePayload {
  fat: unknown
  mes: unknown
  cnae: unknown
  folha?: unknown
  tipo?: unknown
}

function decodeBase64Share(raw: string | undefined): SharePayload | null {
  if (!raw) return null
  try {
    // base64url → base64 normal
    const b64 = raw.replace(/-/g, '+').replace(/_/g, '/')
    const pad = b64.length % 4 ? b64 + '='.repeat(4 - (b64.length % 4)) : b64
    const json = decodeURIComponent(escape(Buffer.from(pad, 'base64').toString('binary')))
    const parsed = JSON.parse(json)
    return typeof parsed === 'object' && parsed !== null ? parsed as SharePayload : null
  } catch {
    return null
  }
}

function getSharedResultado(params: SearchParams): ResultadoSimulacao | null {
  // Formato novo: ?s=<base64url-encoded JSON>
  const encoded = getSingleParam(params, 's')
  const decoded = decodeBase64Share(encoded)

  const faturamentoAcumulado = Number(decoded?.fat ?? getSingleParam(params, 'fat'))
  const mesAtual = Number(decoded?.mes ?? getSingleParam(params, 'mes'))
  const cnaeRaw = decoded?.cnae ?? getSingleParam(params, 'cnae')
  const cnae = typeof cnaeRaw === 'string' ? cnaeRaw.trim() : ''
  const folhaMensal = Number(decoded?.folha ?? getSingleParam(params, 'folha') ?? 0)
  const tipoParam = decoded?.tipo ?? getSingleParam(params, 'tipo')
  const tipoMei: TipoMei = tipoParam === 'caminhoneiro' ? 'caminhoneiro' : 'geral'

  if (
    !Number.isFinite(faturamentoAcumulado)
    || !Number.isFinite(mesAtual)
    || !Number.isFinite(folhaMensal)
    || faturamentoAcumulado <= 0
    || mesAtual < 1
    || mesAtual > 12
    || !cnae
  ) {
    return null
  }

  try {
    return simular({
      faturamentoAcumulado,
      mesAtual,
      cnae,
      folhaMensal: Math.max(0, folhaMensal),
      tipoMei,
    })
  } catch {
    return null
  }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const siteUrl = getSiteUrl()
  const params = searchParams ? await searchParams : {}
  const initialResultado = getSharedResultado(params)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const access = await getProfileAccess(supabase, user)
    redirect(access.isComplete ? '/dashboard' : '/onboarding')
  }

  const webAppSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: SITE_NAME,
        url: siteUrl,
        logo: `${siteUrl}/icons/icon-512.png`,
        description: SITE_DESCRIPTION,
        sameAs: [],
      },
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        url: siteUrl,
        name: SITE_NAME,
        publisher: { '@id': `${siteUrl}/#organization` },
        inLanguage: 'pt-BR',
      },
      {
        '@type': 'WebApplication',
        '@id': `${siteUrl}/#webapp`,
        name: SITE_NAME,
        url: siteUrl,
        description: SITE_DESCRIPTION,
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Web',
        inLanguage: 'pt-BR',
        publisher: { '@id': `${siteUrl}/#organization` },
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'BRL',
          availability: 'https://schema.org/InStock',
        },
        featureList: [
          'Simulação de teto MEI 2026',
          'Cálculo do Fator R',
          'Comparação de regimes tributários',
          '1.331 CNAEs mapeados',
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Quando devo sair do MEI?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: `Considere sair do MEI quando seu faturamento anual se aproximar do teto vigente de R$ ${LIMITES_MEI.geral.anual.toLocaleString('pt-BR')}, quando precisar contratar mais de um funcionário, ou quando sua atividade exigir regime tributário diferente. O SimulaMEI calcula a projeção de 12 meses automaticamente.`,
            },
          },
          {
            '@type': 'Question',
            name: 'Como calcular o Fator R online?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'O Fator R é a divisão da folha de salários (últimos 12 meses) pelo faturamento bruto do mesmo período. Se o resultado for ≥ 28%, você pode migrar para o Anexo III do Simples Nacional e pagar menos imposto. O SimulaMEI faz esse cálculo gratuitamente a partir do seu faturamento.',
            },
          },
          {
            '@type': 'Question',
            name: 'Qual é o teto do MEI em 2026?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: `O teto vigente do MEI é de R$ ${LIMITES_MEI.geral.anual.toLocaleString('pt-BR')} por ano para MEI geral e R$ ${LIMITES_MEI.caminhoneiro.anual.toLocaleString('pt-BR')} para MEI Caminhoneiro (MEI-C). Ultrapassar o teto obriga a migração para o Simples Nacional ou outro regime.`,
            },
          },
          {
            '@type': 'Question',
            name: 'O SimulaMEI substitui a consultoria de um contador?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Não. O SimulaMEI é uma ferramenta de estimativa baseada em regras públicas da Receita Federal. Os resultados são orientativos e não substituem a análise de um contador habilitado para sua situação específica.',
            },
          },
          {
            '@type': 'Question',
            name: 'Qual regime tributário é melhor após o MEI: Simples Nacional Anexo III ou Anexo V?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Depende do Fator R. Com Fator R ≥ 28%, o Anexo III tem alíquotas menores (a partir de 6%). Com Fator R < 28%, o Anexo V se aplica (a partir de 15,5%). O SimulaMEI calcula ambos os cenários e mostra a economia potencial.',
            },
          },
        ],
      },
    ],
  }

  return (
    <>
      <Script
        id="simulamei-webapp-schema"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }}
      />
      <HomeClient initialResultado={initialResultado} />
    </>
  )
}
