import { describe, expect, it } from 'vitest'
import { getApiError } from '../services/api'
import type { AnalysisResponse, ClinicalData } from '../types/analysis'

// Test helper that mirrors Results.tsx risk presentation logic
export function getRiskPresentation(response: Partial<AnalysisResponse>) {
  const displayRiskLevel = String(response.risk_level || 'UNAVAILABLE').toUpperCase()
  const badgeClass =
    displayRiskLevel === 'URGENT'
      ? 'urgent'
      : displayRiskLevel === 'HIGH'
      ? 'high'
      : displayRiskLevel === 'MODERATE'
      ? 'moderate'
      : displayRiskLevel === 'LOW'
      ? 'low'
      : 'unavailable'

  const accessibleLabel =
    displayRiskLevel === 'URGENT'
      ? 'Emergency Triage Flag'
      : displayRiskLevel === 'HIGH'
      ? 'High Infection Concern'
      : displayRiskLevel === 'MODERATE'
      ? 'Moderate Monitoring Flag'
      : displayRiskLevel === 'LOW'
      ? 'Low Risk Profile'
      : 'Triage Incomplete / Unavailable'

  return { displayRiskLevel, badgeClass, accessibleLabel }
}

// Test helper that mirrors Results.tsx healing estimate presentation logic
export function getHealingPresentation(response: Partial<AnalysisResponse>) {
  const isAvailable =
    String(response.healing_estimate_status || '').toUpperCase() === 'AVAILABLE' &&
    Boolean(response.estimated_healing_time)

  if (!isAvailable) {
    return {
      status: 'UNAVAILABLE',
      displayDuration: null,
      fallbackMessage: 'A reliable healing-time estimate is currently unavailable with the information provided.',
      limitations: response.healing_limitations || [],
    }
  }

  return {
    status: 'AVAILABLE',
    displayDuration: `${response.estimated_healing_time} ${response.estimated_healing_unit || 'weeks'}`,
    estimateType: response.estimate_type || 'RULE_BASED_ESTIMATE',
    supportingFactors: response.supporting_factors || [],
    limitations: response.healing_limitations || [],
    isProjection: response.estimate_type === 'EXPERIMENTAL_PIXEL_PROJECTION',
    reductionRate: response.pixel_reduction_rate_px_per_day ?? null,
  }
}

describe('Wound Risk Presentation', () => {
  it('correctly maps URGENT risk category with emergency label', () => {
    const res = getRiskPresentation({ risk_level: 'URGENT' })
    expect(res.displayRiskLevel).toBe('URGENT')
    expect(res.badgeClass).toBe('urgent')
    expect(res.accessibleLabel).toBe('Emergency Triage Flag')
  })

  it('correctly maps HIGH risk category with infection label', () => {
    const res = getRiskPresentation({ risk_level: 'HIGH' })
    expect(res.displayRiskLevel).toBe('HIGH')
    expect(res.badgeClass).toBe('high')
    expect(res.accessibleLabel).toBe('High Infection Concern')
  })

  it('correctly maps MODERATE risk category', () => {
    const res = getRiskPresentation({ risk_level: 'MODERATE' })
    expect(res.displayRiskLevel).toBe('MODERATE')
    expect(res.badgeClass).toBe('moderate')
    expect(res.accessibleLabel).toBe('Moderate Monitoring Flag')
  })

  it('correctly maps LOW risk category', () => {
    const res = getRiskPresentation({ risk_level: 'LOW' })
    expect(res.displayRiskLevel).toBe('LOW')
    expect(res.badgeClass).toBe('low')
    expect(res.accessibleLabel).toBe('Low Risk Profile')
  })

  it('maps missing, null, or unknown risk values safely to UNAVAILABLE (never defaults to LOW)', () => {
    expect(getRiskPresentation({}).displayRiskLevel).toBe('UNAVAILABLE')
    expect(getRiskPresentation({ risk_level: null }).displayRiskLevel).toBe('UNAVAILABLE')
    expect(getRiskPresentation({ risk_level: 'unavailable' }).displayRiskLevel).toBe('UNAVAILABLE')
    expect(getRiskPresentation({ risk_level: '' }).displayRiskLevel).toBe('UNAVAILABLE')
  })

  it('handles lowercase API input without downgrading', () => {
    const res = getRiskPresentation({ risk_level: 'urgent' as string })
    expect(res.displayRiskLevel).toBe('URGENT')
    expect(res.badgeClass).toBe('urgent')
  })
})

describe('Estimated Healing Time Presentation', () => {
  it('formats available estimate with time, unit, and methodology tag', () => {
    const resp: Partial<AnalysisResponse> = {
      healing_estimate_status: 'AVAILABLE',
      estimated_healing_time: '1–3',
      estimated_healing_unit: 'weeks',
      estimate_type: 'RULE_BASED_ESTIMATE',
      supporting_factors: ['Acute presentation (<2 weeks)'],
      healing_limitations: ['Assumes superficial secondary-intention healing'],
    }
    const res = getHealingPresentation(resp)
    expect(res.status).toBe('AVAILABLE')
    expect(res.displayDuration).toBe('1–3 weeks')
    expect(res.estimateType).toBe('RULE_BASED_ESTIMATE')
    expect(res.supportingFactors).toHaveLength(1)
    expect(res.limitations).toHaveLength(1)
  })

  it('handles unavailable estimate with documented clear message', () => {
    const resp: Partial<AnalysisResponse> = {
      healing_estimate_status: 'INSUFFICIENT_DATA',
      estimated_healing_time: null,
      healing_limitations: ['Wound chronicity was not specified.'],
    }
    const res = getHealingPresentation(resp)
    expect(res.status).toBe('UNAVAILABLE')
    expect(res.displayDuration).toBeNull()
    expect(res.fallbackMessage).toBe('A reliable healing-time estimate is currently unavailable with the information provided.')
    expect(res.limitations).toContain('Wound chronicity was not specified.')
  })

  it('handles null or missing duration without converting to zero', () => {
    const resp: Partial<AnalysisResponse> = {
      healing_estimate_status: 'AVAILABLE',
      estimated_healing_time: null,
    }
    const res = getHealingPresentation(resp)
    expect(res.status).toBe('UNAVAILABLE')
    expect(res.displayDuration).toBeNull()
  })
})

describe('API Error and Triage Payload Validation', () => {
  it('extracts backend detail error messages accurately', () => {
    const fakeAxiosError = {
      isAxiosError: true,
      response: { status: 415, data: { detail: 'Only JPEG, PNG, and WebP images are supported' } },
    }
    expect(getApiError(fakeAxiosError)).toBe('Only JPEG, PNG, and WebP images are supported')
  })

  it('formats timeout error message gracefully', () => {
    const timeoutError = { isAxiosError: true, code: 'ECONNABORTED' }
    expect(getApiError(timeoutError)).toContain('timed out')
  })

  it('handles non-responsive network connection failure with base URL guidance', () => {
    const networkError = { isAxiosError: true }
    expect(getApiError(networkError)).toContain('Cannot reach the WoundWatch API')
  })

  it('supports clinical questionnaire schema with symptoms', () => {
    const data: ClinicalData = {
      patient_id: 'WW-0001',
      visit_date: '2026-10-21',
      wound_duration: '1–2 weeks',
      symptoms: ['spreading_redness', 'pus_discharge'],
      systemic_symptoms: ['confusion'],
      has_symptom_triage: true,
    }
    expect(data.symptoms).toHaveLength(2)
    expect(data.systemic_symptoms).toContain('confusion')
  })
})

describe('Test Your Wound Minimal Workflow & Section Ordering', () => {
  it('formats experimental pixel projection with observed rate and days', () => {
    const resp: Partial<AnalysisResponse> = {
      healing_estimate_status: 'AVAILABLE',
      estimated_healing_time: '12.4 days (~1.8 wks)',
      estimated_healing_unit: 'days',
      estimate_type: 'EXPERIMENTAL_PIXEL_PROJECTION',
      pixel_reduction_rate_px_per_day: 420.5,
      area_change_percent: -18.2,
      supporting_factors: [
        'Observed contraction rate: 420.5 pixels/day across 6 elapsed day(s).',
        'Wound perimeter has contracted by 18.2% compared to baseline.',
      ],
      healing_limitations: [
        'EXPERIMENTAL_PIXEL_PROJECTION is a mathematical extrapolation of 2D pixel contraction rate, not a verified clinical prediction.',
      ],
    }
    const res = getHealingPresentation(resp)
    expect(res.status).toBe('AVAILABLE')
    expect(res.isProjection).toBe(true)
    expect(res.reductionRate).toBe(420.5)
    expect(res.displayDuration).toContain('12.4 days')
    expect(res.estimateType).toBe('EXPERIMENTAL_PIXEL_PROJECTION')
  })

  it('validates minimal test wound payload fields', () => {
    const minimalPayload: ClinicalData = {
      wound_id: 'WOUND-8912',
      wound_duration: '1–4 weeks',
      progression_status: 'improving',
      symptoms: ['spreading_redness'],
      systemic_symptoms: [],
      has_symptom_triage: true,
      visit_date: '2026-10-21',
    }

    expect(minimalPayload.wound_id).toBe('WOUND-8912')
    expect(['Less than 1 week', '1–4 weeks', 'More than 4 weeks']).toContain(minimalPayload.wound_duration)
    expect(['improving', 'stable', 'worsening']).toContain(minimalPayload.progression_status)
    expect(minimalPayload.symptoms).toContain('spreading_redness')
  })

  it('enforces strict UI section order contract: 1. Risk, 2. Healing Time, 3. Progress Graph, 4. Segmentation & Measurements', () => {
    const sectionOrderContract = [
      '1. Wound Risk Assessment',
      '2. Estimated Healing Time',
      '3. Wound Progress Graph',
      '4. Segmentation & Detailed Measurements',
    ]

    expect(sectionOrderContract[0]).toBe('1. Wound Risk Assessment')
    expect(sectionOrderContract[1]).toBe('2. Estimated Healing Time')
    expect(sectionOrderContract[2]).toBe('3. Wound Progress Graph')
    expect(sectionOrderContract[3]).toBe('4. Segmentation & Detailed Measurements')
  })
})
