'use client'

import posthog from 'posthog-js'

export type ProductEventName =
  | 'simulation_started'
  | 'simulation_completed'
  | 'email_captured'
  | 'fator_r_explored'
  | 'pdf_cta_clicked'
  | 'report_purchased'
  | 'monitor_waitlist_joined'
  | 'pro_upgrade_from_relatorio'
  | 'accountant_demo_requested'
  | 'accountant_signup_interest'
  | 'accountant_checkout_started'
  | 'accountant_billing_portal_opened'
  | 'checkout_auth_required'
  | 'checkout_resumed_after_login'
  | 'checkout_abandoned_at_office_setup'

export type LeadSaveStatus = 'saved' | 'failed'

/**
 * Builds the `email_captured` event payload. Centralizes the analytics
 * contract so the funnel can measure how many leads actually persisted
 * (the `/api/leads` call is non-blocking, so success was previously lost).
 */
export function buildEmailCapturedProps(
  resultado: { entrada: { cnae: string }; taxRuleVersion: string },
  leadSaveStatus: LeadSaveStatus,
): Record<string, unknown> {
  return {
    cnae: resultado.entrada.cnae,
    taxRuleVersion: resultado.taxRuleVersion,
    leadSaveStatus,
  }
}

export function captureProductEvent(
  event: ProductEventName,
  properties: Record<string, unknown> = {},
) {
  if (typeof window === 'undefined' || !posthog.__loaded) {
    return
  }

  posthog.capture(event, properties)
}
