import { getSiteUrl } from '@/constants/site'
import type { FiscalCalendarItem } from '@/lib/monitor'
import { Resend } from 'resend'

let resendClient: Resend | null = null
const EMAIL_FONT_STACK = 'Trebuchet MS,Verdana,sans-serif'

function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('Resend is not configured.')
  }

  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY)
  }

  return resendClient
}

export function isResendConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL)
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export async function sendFiscalCalendarEmail({
  to,
  nome,
  items,
}: {
  to: string
  nome: string
  items: FiscalCalendarItem[]
}) {
  if (!isResendConfigured()) return { ok: false, skipped: true }

  const html = `
    <div style="font-family:${EMAIL_FONT_STACK};line-height:1.6;color:#111">
      <h1 style="font-size:22px;margin-bottom:12px">Calendário fiscal do mês</h1>
      <p>Olá, ${escapeHtml(nome)}.</p>
      <p>Seu resumo mensal do SimulaMEI já está pronto:</p>
      <ul>
        ${items.map(item => `<li><strong>${escapeHtml(item.title)}</strong><br/>${escapeHtml(item.body)}</li>`).join('')}
      </ul>
      <p><a href="${getSiteUrl()}/dashboard">Abrir dashboard</a></p>
    </div>
  `

  return getResendClient().emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: 'Seu calendário fiscal mensal — SimulaMEI',
    html,
  })
}

export async function sendAnexoAlertEmail({
  to,
  nome,
  from,
  toAnexo,
  mes,
  ano,
  fatorR,
}: {
  to: string
  nome: string
  from: string
  toAnexo: string
  mes: number
  ano: number
  fatorR: number
}) {
  if (!isResendConfigured()) return { ok: false, skipped: true }

  const html = `
    <div style="font-family:${EMAIL_FONT_STACK};line-height:1.6;color:#111">
      <h1 style="font-size:22px;margin-bottom:12px">Mudança de Anexo detectada</h1>
      <p>Olá, ${escapeHtml(nome)}.</p>
      <p>O SimulaMEI identificou transição de <strong>Anexo ${escapeHtml(from)}</strong> para <strong>Anexo ${escapeHtml(toAnexo)}</strong> em ${mes}/${ano}.</p>
      <p>Fator R observado: <strong>${(fatorR * 100).toFixed(1)}%</strong>.</p>
      <p><a href="${getSiteUrl()}/dashboard">Abrir dashboard</a></p>
    </div>
  `

  return getResendClient().emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: 'Alerta de mudança de Anexo — SimulaMEI',
    html,
  })
}

export async function sendAccountantLeadNotification({
  email,
  nomeEscritorio,
  telefone,
  carteiraRange,
  ferramentaAtual,
  origem,
}: {
  email: string
  nomeEscritorio: string
  telefone: string | null
  carteiraRange: string
  ferramentaAtual: string | null
  origem: string | null
}) {
  if (!isResendConfigured()) return { ok: false, skipped: true }

  const destination = process.env.ACCOUNTANT_LEAD_NOTIFY_EMAIL || process.env.RESEND_FROM_EMAIL!
  const html = `
    <div style="font-family:${EMAIL_FONT_STACK};line-height:1.6;color:#111">
      <h1 style="font-size:22px;margin-bottom:12px">Lead contador 150+</h1>
      <p>Um escritório com carteira grande solicitou acesso ao SimulaMEI.</p>
      <ul>
        <li><strong>Escritório:</strong> ${escapeHtml(nomeEscritorio)}</li>
        <li><strong>E-mail:</strong> ${escapeHtml(email)}</li>
        <li><strong>Telefone:</strong> ${escapeHtml(telefone || 'Não informado')}</li>
        <li><strong>Carteira:</strong> ${escapeHtml(carteiraRange)}</li>
        <li><strong>Ferramenta atual:</strong> ${escapeHtml(ferramentaAtual || 'Não informado')}</li>
        <li><strong>Origem:</strong> ${escapeHtml(origem || 'Não informada')}</li>
      </ul>
    </div>
  `

  return getResendClient().emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: destination,
    subject: 'Lead contador Enterprise — SimulaMEI',
    html,
  })
}

export async function sendAccountantLeadConfirmation({
  email,
  nomeEscritorio,
}: {
  email: string
  nomeEscritorio: string
}) {
  if (!isResendConfigured()) return { ok: false, skipped: true }

  const siteUrl = getSiteUrl()
  const html = `
    <div style="font-family:${EMAIL_FONT_STACK};line-height:1.6;color:#111;max-width:520px">
      <h1 style="font-size:20px;margin-bottom:8px">Cadastro recebido — SimulaMEI</h1>
      <p>Olá, <strong>${escapeHtml(nomeEscritorio)}</strong>!</p>
      <p>
        Recebemos sua solicitação de acesso ao plano contador.
        Nossa equipe entrará em contato em até <strong>48 horas</strong> conforme a faixa de carteira informada.
      </p>
      <p>Enquanto isso, você pode explorar o simulador:</p>
      <p>
        <a href="${siteUrl}/#simulador" style="color:#4b9eff">
          Acessar o SimulaMEI →
        </a>
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
      <p style="font-size:12px;color:#888">
        Você recebeu este e-mail porque se cadastrou em ${siteUrl}/para-contadores.
      </p>
    </div>
  `

  return getResendClient().emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: email,
    subject: 'Seu cadastro no SimulaMEI para Contadores foi recebido',
    html,
  })
}

export async function sendOfficeAlertEmail({
  to,
  nome,
  officeName,
  clientName,
  title,
  body,
}: {
  to: string
  nome: string
  officeName: string
  clientName: string
  title: string
  body: string
}) {
  if (!isResendConfigured()) return { ok: false, skipped: true }

  const html = `
    <div style="font-family:${EMAIL_FONT_STACK};line-height:1.6;color:#111">
      <h1 style="font-size:22px;margin-bottom:12px">${escapeHtml(title)}</h1>
      <p>Olá, ${escapeHtml(nome)}.</p>
      <p>O SimulaMEI identificou um alerta para <strong>${escapeHtml(clientName)}</strong> no escritório <strong>${escapeHtml(officeName)}</strong>.</p>
      <p>${escapeHtml(body)}</p>
      <p><a href="${getSiteUrl()}/contador">Abrir painel contador</a></p>
    </div>
  `

  return getResendClient().emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: `Alerta fiscal: ${clientName} — SimulaMEI`,
    html,
  })
}

export async function sendPaymentFailedNotification({
  to,
  officeName,
}: {
  to: string
  officeName: string
}) {
  if (!isResendConfigured()) return { ok: false, skipped: true }

  const html = `
    <div style="font-family:${EMAIL_FONT_STACK};line-height:1.6;color:#111;max-width:520px">
      <h1 style="font-size:20px;margin-bottom:8px">Falha na cobrança — SimulaMEI</h1>
      <p>Olá, <strong>${escapeHtml(officeName)}</strong>.</p>
      <p>
        Não conseguimos cobrar sua assinatura recorrente. O escritório foi marcado como
        <strong>pagamento pendente</strong> e novas simulações podem ser bloqueadas até a regularização.
      </p>
      <p>
        <a href="${getSiteUrl()}/contador/assinatura" style="color:#4b9eff">
          Atualizar forma de pagamento →
        </a>
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
      <p style="font-size:12px;color:#888">
        Se já regularizou o pagamento, este aviso será limpo automaticamente na próxima cobrança bem-sucedida.
      </p>
    </div>
  `

  return getResendClient().emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: 'Falha na cobrança da sua assinatura — SimulaMEI',
    html,
  })
}

export async function sendSubscriptionPausedNotification({
  to,
  officeName,
}: {
  to: string
  officeName: string
}) {
  if (!isResendConfigured()) return { ok: false, skipped: true }

  const html = `
    <div style="font-family:${EMAIL_FONT_STACK};line-height:1.6;color:#111;max-width:520px">
      <h1 style="font-size:20px;margin-bottom:8px">Assinatura pausada — SimulaMEI</h1>
      <p>Olá, <strong>${escapeHtml(officeName)}</strong>.</p>
      <p>
        Sua assinatura foi pausada. Clientes acima do limite do plano Starter podem ter sido desativados.
        Reative o pagamento para retomar a carteira completa.
      </p>
      <p>
        <a href="${getSiteUrl()}/contador/assinatura" style="color:#4b9eff">
          Reativar assinatura →
        </a>
      </p>
    </div>
  `

  return getResendClient().emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: 'Sua assinatura foi pausada — SimulaMEI',
    html,
  })
}

export async function sendRefundNotification({
  to,
  officeName,
}: {
  to: string
  officeName: string
}) {
  if (!isResendConfigured()) return { ok: false, skipped: true }

  const html = `
    <div style="font-family:${EMAIL_FONT_STACK};line-height:1.6;color:#111;max-width:520px">
      <h1 style="font-size:20px;margin-bottom:8px">Reembolso processado — SimulaMEI</h1>
      <p>Olá, <strong>${escapeHtml(officeName)}</strong>.</p>
      <p>
        Confirmamos um reembolso da sua última cobrança. O escritório foi rebaixado para o plano Starter
        e clientes acima do novo limite foram desativados.
      </p>
      <p>
        Caso queira reassinar o plano Pro, basta acessar o portal de cobrança:
      </p>
      <p>
        <a href="${getSiteUrl()}/upgrade/contador" style="color:#4b9eff">
          Ver planos disponíveis →
        </a>
      </p>
    </div>
  `

  return getResendClient().emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: 'Reembolso processado — SimulaMEI',
    html,
  })
}

/**
 * Notifica admin (ADMIN_EMAIL) quando um chargeback eh aberto. Inclui dados
 * minimos da dispute pro time agir no Dashboard Stripe.
 */
export async function sendDisputeNotification({
  adminEmail,
  officeName,
  disputeId,
  reason,
  amountCents,
  currency,
}: {
  adminEmail: string
  officeName: string
  disputeId: string
  reason: string | null
  amountCents: number
  currency: string
}) {
  if (!isResendConfigured()) return { ok: false, skipped: true }

  const amountBrl = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountCents / 100)

  const html = `
    <div style="font-family:${EMAIL_FONT_STACK};line-height:1.6;color:#111;max-width:560px">
      <h1 style="font-size:20px;margin-bottom:8px">Chargeback aberto — ação necessária</h1>
      <p>O cliente <strong>${escapeHtml(officeName)}</strong> abriu uma dispute na Stripe.</p>
      <ul>
        <li><strong>Dispute ID:</strong> ${escapeHtml(disputeId)}</li>
        <li><strong>Motivo:</strong> ${escapeHtml(reason ?? 'não informado')}</li>
        <li><strong>Valor:</strong> ${escapeHtml(amountBrl)}</li>
      </ul>
      <p>
        O escritório foi marcado com <code>disputed_at</code>. Acompanhe e responda no
        <a href="https://dashboard.stripe.com/disputes/${encodeURIComponent(disputeId)}" style="color:#4b9eff">
          Dashboard Stripe →
        </a>
      </p>
    </div>
  `

  return getResendClient().emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: adminEmail,
    subject: `Chargeback aberto: ${officeName} — SimulaMEI`,
    html,
  })
}
