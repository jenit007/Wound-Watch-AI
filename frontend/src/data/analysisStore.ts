import type { AnalysisResponse, ClinicalData } from '../types/analysis'

export interface StoredAnalysis {
  requestId: string
  timestamp: string
  imageUrl: string
  clinicalData: ClinicalData
  response: AnalysisResponse
  mode: 'demo' | 'api'
}

const STORAGE_KEY = 'woundwatch_analyses_cache'

// Pre-seeded demo analyses so any /results/DEMO-... URL or direct visit works out-of-the-box
export const sampleStoredAnalyses: Record<string, StoredAnalysis> = {
  'DEMO-948120': {
    requestId: 'DEMO-948120',
    timestamp: '2026-10-21T10:30:00.000Z',
    imageUrl: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80',
    clinicalData: {
      patient_id: 'WW-0001',
      visit_date: '2026-10-21',
      wound_location: 'Lower leg',
      wound_duration: '3–4 weeks',
      age_range: '60–69',
      diabetes_status: 'Yes',
      smoking_status: 'Never',
      notes: 'Synthetic sample analysis for demonstration and UI review.',
    },
    response: {
      request_id: 'DEMO-948120',
      model_status: 'ready',
      wound_area_px: 13950,
      wound_area_cm2: null, // Null to demonstrate scale marker missing gracefully
      area_change_percent: -7.7,
      trajectory: 'improving',
      risk_level: 'MODERATE',
      risk_score: null,
      risk_basis: 'Presence of diabetic comorbidity and subacute duration with no acute spreading infection flags',
      risk_reasons: [
        'Patient has recorded diabetes diagnosis, warranting ongoing vascular and neuropathic monitoring.',
        'Wound duration is approximately 3–4 weeks with contracting perimeter.',
        'No emergency systemic symptoms or purulent pus drainage reported.',
      ],
      recommended_action: 'Continue prescribed offloading protocol and outpatient wound clinic follow-up. Seek prompt review if pain, erythema, or heat increases.',
      risk_disclaimer: 'Preliminary software triage heuristic for research evaluation only; not a clinical diagnosis.',
      healing_estimate_status: 'AVAILABLE',
      estimated_healing_time: '8–14',
      estimated_healing_unit: 'weeks',
      estimate_type: 'RULE_BASED_ESTIMATE',
      supporting_factors: [
        'Reported chronicity of 3–4 weeks with documented diabetic status',
        'Area delta shows active -7.7% contraction between sequential visits',
      ],
      healing_limitations: [
        'Published DFU healing benchmarks (Sheehan et al.) require strict offloading and HbA1c control.',
        'Photographic 2D assessment cannot evaluate sub-dermal perfusion or depth.',
      ],
      healing_disclaimer: 'Healing estimates are literature-derived research benchmarks and should not be interpreted as a guarantee of closure.',
      segmentation_mask_png_base64: null,
      explanation: [
        'Epithelial margin advancement observed along superior edge.',
        'Total pixel area reduced by approximately 7.7% compared with previous synthetic visit.',
        'Physical area in cm² is unavailable because no standardized calibration marker was detected in the frame.',
      ],
      warnings: [
        { message: 'Calibration scale not detected. Measurements provided in pixel dimensions only.', severity: 'info' },
        { message: 'Model outputs are uncalibrated research prototypes. Independent clinical review is required.', severity: 'warning' },
      ],
    },
    mode: 'demo',
  },
  'DEMO-CALIBRATED': {
    requestId: 'DEMO-CALIBRATED',
    timestamp: '2026-10-21T11:15:00.000Z',
    imageUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80',
    clinicalData: {
      patient_id: 'WW-0003',
      visit_date: '2026-10-21',
      wound_location: 'Forearm',
      wound_duration: '5–6 weeks',
      age_range: '70–79',
      diabetes_status: 'No',
      smoking_status: 'Never',
      notes: 'Sample visit with calibrated physical area marker detected.',
    },
    response: {
      request_id: 'DEMO-CALIBRATED',
      model_status: 'ready',
      wound_area_px: 11820,
      wound_area_cm2: 4.85,
      area_change_percent: -7.2,
      trajectory: 'improving',
      risk_level: 'LOW',
      risk_score: null,
      risk_basis: 'Acute/subacute clean lesion profile without infection signs or systemic symptoms',
      risk_reasons: [
        'No spreading redness, fever, or purulent drainage reported.',
        'Negative area delta (-7.2%) indicates active wound margin contraction.',
        'No emergency red flags present.',
      ],
      recommended_action: 'Maintain standard moisture-balanced protective dressing and observe for infection signs.',
      risk_disclaimer: 'Preliminary software triage heuristic for research evaluation only; not a clinical diagnosis.',
      healing_estimate_status: 'AVAILABLE',
      estimated_healing_time: '3–6',
      estimated_healing_unit: 'weeks',
      estimate_type: 'RULE_BASED_ESTIMATE',
      supporting_factors: [
        'Non-diabetic forearm lesion with steady area reduction',
        'Calibrated area of 4.85 cm² provides baseline contraction index',
      ],
      healing_limitations: [
        'Closure timeframe assumes no external friction or secondary contamination.',
      ],
      healing_disclaimer: 'Healing estimates are literature-derived research benchmarks and should not be interpreted as a guarantee of closure.',
      segmentation_mask_png_base64: null,
      explanation: [
        'Physical scale fiducial marker detected with high fiducial confidence (0.98).',
        'Physical area calculated as 4.85 cm² using calibrated pixels-per-millimeter ratio.',
        'Negative percentage change indicates ongoing reduction in lesion footprint.',
      ],
      warnings: [],
    },
    mode: 'demo',
  },
}

export function saveAnalysis(record: StoredAnalysis): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const current: Record<string, StoredAnalysis> = raw ? JSON.parse(raw) : {}
    current[record.requestId] = record
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  } catch {
    // Fallback if localStorage is disabled
    sampleStoredAnalyses[record.requestId] = record
  }
}

export function getAnalysis(requestId: string): StoredAnalysis | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed: Record<string, StoredAnalysis> = JSON.parse(raw)
      if (parsed[requestId]) return parsed[requestId]
    }
  } catch {
    // Ignore error
  }
  return sampleStoredAnalyses[requestId] || sampleStoredAnalyses['DEMO-948120'] || null
}
