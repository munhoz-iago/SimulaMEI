import { describe, expect, it } from 'vitest'
import {
  getSaoPauloDateKey,
  shouldShowTrialCheckin,
  type TrialCheckinRecord,
} from './trial-checkins'
import type { CurrentAccountantOffice } from './server'

const TRIAL_OFFICE: CurrentAccountantOffice = {
  id: 'office-1',
  name: 'Prime Contabilidade',
  plan: 'starter_trial',
  max_clients: 30,
  trial_ends_at: '2026-05-30T12:00:00.000Z',
  stripe_customer_id: null,
  stripe_subscription_id: null,
  stripe_subscription_status: null,
  current_period_end: null,
  role: 'owner',
}

const PRO_OFFICE: CurrentAccountantOffice = {
  ...TRIAL_OFFICE,
  plan: 'pro',
  max_clients: 150,
  trial_ends_at: null,
  stripe_subscription_status: 'active',
}

function checkin(overrides: Partial<TrialCheckinRecord> = {}): TrialCheckinRecord {
  return {
    id: 'checkin-1',
    office_id: 'office-1',
    user_id: 'user-1',
    shown_on: '2026-05-25',
    shown_at: '2026-05-25T12:00:00.000Z',
    answered_at: null,
    satisfaction: null,
    pain_point: null,
    free_text: null,
    cta_clicked_at: null,
    dismissed_at: null,
    created_at: '2026-05-25T12:00:00.000Z',
    updated_at: '2026-05-25T12:00:00.000Z',
    ...overrides,
  }
}

describe('getSaoPauloDateKey', () => {
  it('uses America/Sao_Paulo day boundaries instead of UTC day', () => {
    expect(getSaoPauloDateKey(new Date('2026-05-26T02:30:00.000Z'))).toBe('2026-05-25')
  })
})

describe('shouldShowTrialCheckin', () => {
  it('shows when the office is in an active trial and has no checkin today', () => {
    expect(shouldShowTrialCheckin(TRIAL_OFFICE, null, new Date('2026-05-25T12:00:00.000Z'))).toBe(true)
  })

  it('does not show again after today was already shown', () => {
    expect(shouldShowTrialCheckin(TRIAL_OFFICE, checkin(), new Date('2026-05-25T18:00:00.000Z'))).toBe(false)
  })

  it('does not show for paid plans', () => {
    expect(shouldShowTrialCheckin(PRO_OFFICE, null, new Date('2026-05-25T12:00:00.000Z'))).toBe(false)
  })

  it('does not show after the trial has expired', () => {
    expect(shouldShowTrialCheckin(TRIAL_OFFICE, null, new Date('2026-06-01T12:00:00.000Z'))).toBe(false)
  })
})
