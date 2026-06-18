import { describe, expect, it } from 'vitest'
import { ACCOUNTANT_TRIAL_DAYS, getTrialProgress, getTrialUrgency } from './office'

const DAY = 24 * 60 * 60 * 1000

function iso(ms: number) {
  return new Date(ms).toISOString()
}

describe('getTrialProgress', () => {
  it('returns null when there is no trial end date', () => {
    expect(getTrialProgress(null, iso(Date.now()))).toBeNull()
  })

  it('returns null for an unparseable trial end date', () => {
    expect(getTrialProgress('not-a-date', iso(Date.now()))).toBeNull()
  })

  it('derives a 7-day total from created_at (novo onboarding Mercury)', () => {
    const now = new Date('2026-06-10T12:00:00.000Z')
    const createdAt = iso(now.getTime() - 2 * DAY) // started 2 days ago
    const trialEndsAt = iso(now.getTime() - 2 * DAY + 7 * DAY) // +7d from start
    const progress = getTrialProgress(trialEndsAt, createdAt, now)

    expect(progress).not.toBeNull()
    expect(progress!.totalDays).toBe(7)
    expect(progress!.daysRemaining).toBe(5)
    expect(progress!.daysElapsed).toBe(2)
    expect(progress!.fractionElapsed).toBeCloseTo(2 / 7, 5)
  })

  it('derives a 14-day total for legacy offices (barra calibrada corretamente)', () => {
    const now = new Date('2026-06-10T12:00:00.000Z')
    const createdAt = iso(now.getTime() - 4 * DAY)
    const trialEndsAt = iso(now.getTime() - 4 * DAY + 14 * DAY)
    const progress = getTrialProgress(trialEndsAt, createdAt, now)

    expect(progress!.totalDays).toBe(14)
    expect(progress!.daysRemaining).toBe(10)
    expect(progress!.fractionElapsed).toBeCloseTo(4 / 14, 5)
  })

  it('falls back to ACCOUNTANT_TRIAL_DAYS when created_at is missing', () => {
    const now = new Date('2026-06-10T12:00:00.000Z')
    const trialEndsAt = iso(now.getTime() + 3 * DAY)
    const progress = getTrialProgress(trialEndsAt, null, now)

    expect(progress!.totalDays).toBe(ACCOUNTANT_TRIAL_DAYS)
    expect(progress!.daysRemaining).toBe(3)
  })

  it('falls back to ACCOUNTANT_TRIAL_DAYS when computed total is non-positive (clock skew)', () => {
    const now = new Date('2026-06-10T12:00:00.000Z')
    const trialEndsAt = iso(now.getTime() + 2 * DAY)
    const createdAt = iso(now.getTime() + 5 * DAY) // created after it ends → invalid
    const progress = getTrialProgress(trialEndsAt, createdAt, now)

    expect(progress!.totalDays).toBe(ACCOUNTANT_TRIAL_DAYS)
  })

  it('clamps daysRemaining at 0 and fractionElapsed at 1 once the trial has ended', () => {
    const now = new Date('2026-06-10T12:00:00.000Z')
    const createdAt = iso(now.getTime() - 10 * DAY)
    const trialEndsAt = iso(now.getTime() - 3 * DAY) // ended 3 days ago
    const progress = getTrialProgress(trialEndsAt, createdAt, now)

    expect(progress!.daysRemaining).toBe(0)
    expect(progress!.daysElapsed).toBe(progress!.totalDays)
    expect(progress!.fractionElapsed).toBe(1)
  })
})

describe('getTrialUrgency', () => {
  const now = new Date('2026-06-10T12:00:00.000Z')

  function progressFor(totalDays: number, daysRemaining: number) {
    const trialEndsAt = iso(now.getTime() + daysRemaining * DAY)
    const createdAt = iso(now.getTime() + daysRemaining * DAY - totalDays * DAY)
    return getTrialProgress(trialEndsAt, createdAt, now)!
  }

  it('is safe at the start of a 7-day trial', () => {
    expect(getTrialUrgency(progressFor(7, 7))).toBe('safe')
    expect(getTrialUrgency(progressFor(7, 6))).toBe('safe')
  })

  it('is warning past the halfway point', () => {
    // 7d trial, 3 remaining → ~57% elapsed → warning (not yet critical)
    expect(getTrialUrgency(progressFor(7, 3))).toBe('warning')
  })

  it('is critical in the final stretch of a 7-day trial', () => {
    // criticalDays = min(2, ceil(7*0.2)=2) = 2
    expect(getTrialUrgency(progressFor(7, 2))).toBe('critical')
    expect(getTrialUrgency(progressFor(7, 1))).toBe('critical')
    expect(getTrialUrgency(progressFor(7, 0))).toBe('critical')
  })

  it('scales thresholds for a 14-day trial (never permanently yellow)', () => {
    expect(getTrialUrgency(progressFor(14, 14))).toBe('safe')
    expect(getTrialUrgency(progressFor(14, 13))).toBe('safe')
    expect(getTrialUrgency(progressFor(14, 7))).toBe('warning')
    // criticalDays = min(2, ceil(14*0.2)=3) = 2 → last 2 days are critical
    expect(getTrialUrgency(progressFor(14, 2))).toBe('critical')
  })
})
