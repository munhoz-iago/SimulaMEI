import { describe, expect, it } from 'vitest'
import {
  ACCOUNTANT_CHECKOUT_ENDPOINTS,
  ACCOUNTANT_PAID_PLANS,
  isAccountantPaidPlan,
} from './billing'

describe('ACCOUNTANT_CHECKOUT_ENDPOINTS', () => {
  it('maps starter to the accountant-starter checkout endpoint', () => {
    expect(ACCOUNTANT_CHECKOUT_ENDPOINTS.starter).toBe('/api/checkout/accountant-starter')
  })

  it('maps pro to the accountant-pro checkout endpoint', () => {
    expect(ACCOUNTANT_CHECKOUT_ENDPOINTS.pro).toBe('/api/checkout/accountant-pro')
  })

  it('covers every paid plan exactly once', () => {
    const keys = Object.keys(ACCOUNTANT_CHECKOUT_ENDPOINTS).sort()
    const plans = [...ACCOUNTANT_PAID_PLANS].sort()
    expect(keys).toEqual(plans)
  })
})

describe('isAccountantPaidPlan', () => {
  it('accepts starter and pro literals', () => {
    expect(isAccountantPaidPlan('starter')).toBe(true)
    expect(isAccountantPaidPlan('pro')).toBe(true)
  })

  it('rejects unknown values, undefined and non-string inputs', () => {
    expect(isAccountantPaidPlan('enterprise')).toBe(false)
    expect(isAccountantPaidPlan('Pro')).toBe(false)
    expect(isAccountantPaidPlan('')).toBe(false)
    expect(isAccountantPaidPlan(undefined)).toBe(false)
    expect(isAccountantPaidPlan(null)).toBe(false)
    expect(isAccountantPaidPlan(123)).toBe(false)
  })
})
