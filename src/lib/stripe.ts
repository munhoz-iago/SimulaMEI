import Stripe from 'stripe'
import { getSiteUrl, SITE_NAME } from '@/constants/site'
import { REPORT_PRICE_CENTAVOS } from '@/constants/pricing'

let stripeClient: Stripe | null = null

export const STRIPE_PRODUCTS = {
  relatorio: {
    product: 'relatorio',
    priceId: process.env.STRIPE_PRICE_REPORT_ID ?? '',
    valorCentavos: REPORT_PRICE_CENTAVOS,
    successPath: '/relatorio?checkout=success',
    cancelPath: '/relatorio?checkout=cancel',
  },
  monitor_mensal: {
    product: 'monitor_mensal',
    priceId: process.env.STRIPE_PRICE_MONITOR_ID ?? '',
    valorCentavos: 1900,
    successPath: '/upgrade?checkout=success',
    cancelPath: '/upgrade?checkout=cancel',
  },
  accountant_starter: {
    product: 'accountant_starter',
    priceId: process.env.STRIPE_PRICE_ACCOUNTANT_STARTER_ID ?? '',
    valorCentavos: 9700,
    successPath: '/upgrade/contador?checkout=success&plan=starter',
    cancelPath: '/upgrade/contador?checkout=cancel&plan=starter',
  },
  accountant_pro: {
    product: 'accountant_pro',
    priceId: process.env.STRIPE_PRICE_ACCOUNTANT_PRO_ID ?? '',
    valorCentavos: 24700,
    successPath: '/upgrade/contador?checkout=success&plan=pro',
    cancelPath: '/upgrade/contador?checkout=cancel&plan=pro',
  },
} as const

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}

export function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Stripe is not configured.')
  }

  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      maxNetworkRetries: 2,
    })
  }

  return stripeClient
}

export function getCheckoutUrl(path: string) {
  return `${getSiteUrl()}${path}`
}

/**
 * Microcopy customizada por produto. Aparece no checkout do Stripe (logo
 * acima do botão de pagar e ao lado dos termos). Sem isso, o Stripe usa
 * textos genéricos em inglês.
 *
 * Limite do Stripe: 1.200 chars por campo, e a microcopy é renderizada
 * apenas em locales suportados (pt-BR é suportado).
 */
type ProductKey = keyof typeof STRIPE_PRODUCTS

const CHECKOUT_COPY: Record<ProductKey, {
  submit: string
  terms: string
  description?: string
}> = {
  relatorio: {
    submit: 'Após o pagamento, o PDF fica disponível imediatamente em /dashboard/relatorio.',
    terms: 'Compra única, sem assinatura. Garantia de 7 dias (CDC art. 49) caso o PDF não corresponda ao esperado.',
  },
  monitor_mensal: {
    submit: 'Assinatura mensal recorrente. Cobrança automática no Stripe a cada 30 dias.',
    terms: 'Cancele a qualquer momento pelo Customer Portal. Sem fidelidade. Garantia de 7 dias (CDC art. 49).',
  },
  accountant_starter: {
    submit: 'Plano Starter ativa o painel contador com carteira de até 30 clientes MEI.',
    terms: 'Cancele a qualquer momento. Sem multa de cancelamento. Garantia de 7 dias (CDC art. 49).',
  },
  accountant_pro: {
    submit: 'Plano Pro libera carteira de 150 clientes, API e relatórios com sua marca.',
    terms: 'Cancele a qualquer momento. Sem multa de cancelamento. Garantia de 7 dias (CDC art. 49).',
  },
}

interface CheckoutOptions {
  product: ProductKey
  userId: string
  userEmail?: string | null
  mode: 'payment' | 'subscription'
  /** Se true, coleta CNPJ/CPF (default true pra B2B/MEI) */
  collectTaxId?: boolean
  /** Metadata adicional além de user_id + produto */
  extraMetadata?: Record<string, string>
}

/**
 * Cria uma sessão de checkout do Stripe já com:
 * - locale pt-BR
 * - microcopy em português apropriada por produto
 * - coleta de CNPJ/CPF (tax_id_collection)
 * - aceite obrigatório de termos de serviço
 * - link pro customer portal após pagamento (pra subscriptions)
 *
 * Branding visual (logo, cores, fonte) é configurado no Dashboard
 * Stripe → Settings → Branding e aplicado automaticamente.
 */
export async function createBrandedCheckoutSession(opts: CheckoutOptions): Promise<Stripe.Checkout.Session> {
  const product = STRIPE_PRODUCTS[opts.product]
  const copy = CHECKOUT_COPY[opts.product]

  return getStripeClient().checkout.sessions.create({
    mode: opts.mode,
    locale: 'pt-BR',
    customer_email: opts.userEmail ?? undefined,
    line_items: [
      {
        price: product.priceId,
        quantity: 1,
      },
    ],
    // Microcopy localizada
    custom_text: {
      submit: { message: copy.submit },
      terms_of_service_acceptance: { message: copy.terms },
    },
    // Força aceite explícito dos termos
    consent_collection: {
      terms_of_service: 'required',
    },
    // Pede CNPJ/CPF (essencial pra B2B + emissão de nota fiscal)
    tax_id_collection: opts.collectTaxId !== false
      ? { enabled: true }
      : undefined,
    // Permite descontos via cupom (vamos criar cupons depois sem mudar código)
    allow_promotion_codes: true,
    // URLs com flag de status pra UI confirmar resultado
    success_url: `${getCheckoutUrl(product.successPath)}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: getCheckoutUrl(product.cancelPath),
    // Metadata pra webhook + auditoria
    metadata: {
      user_id: opts.userId,
      produto: product.product,
      site: SITE_NAME,
      ...(opts.extraMetadata ?? {}),
    },
    // Pra subscriptions, também passa pra subscription metadata
    ...(opts.mode === 'subscription'
      ? {
          subscription_data: {
            metadata: {
              user_id: opts.userId,
              produto: product.product,
              ...(opts.extraMetadata ?? {}),
            },
          },
        }
      : {}),
  })
}
