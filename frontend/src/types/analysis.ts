export interface VisitMeasurementInput {
  visit_date: string
  area_cm2?: number | null
  area_px?: number | null
}

export interface ClinicalData {
  patient_id?: string
  wound_id?: string
  wound_label?: string
  visit_date?: string
  wound_location?: string
  wound_duration?: string
  age_range?: string
  diabetes_status?: string
  smoking_status?: string
  notes?: string
  visits?: VisitMeasurementInput[]
  pixels_per_cm?: number | null
  symptoms?: string[]
  systemic_symptoms?: string[]
  redness_extent?: string
  pain_level?: string
  discharge_type?: string
  fever_present?: boolean
  has_symptom_triage?: boolean
  has_professional_assessment?: boolean
  progression_status?: string
  features?: Record<string, unknown>
}

export interface HistoricalMeasurement {
  id?: string
  wound_id?: string
  recorded_at: string
  wound_area_px: number
  wound_area_cm2?: number | null
  risk_level?: string | null
  notes?: string | null
}

export interface AnalysisResponse {
  request_id?: string
  model_status?: string
  wound_id?: string | null
  wound_area_px?: number | null
  wound_area_cm2?: number | null
  area_change_percent?: number | null
  trajectory?: 'improving' | 'stable' | 'worsening' | 'insufficient_data' | 'unavailable' | string | null
  risk_level?: 'LOW' | 'MODERATE' | 'HIGH' | 'URGENT' | 'UNAVAILABLE' | string | null
  risk_score?: number | null
  risk_basis?: string | null
  risk_reasons?: string[] | null
  recommended_action?: string | null
  risk_disclaimer?: string | null
  healing_estimate_status?: 'AVAILABLE' | 'INSUFFICIENT_DATA' | 'MODEL_UNAVAILABLE' | string | null
  estimated_healing_time?: string | null
  estimated_healing_unit?: string | null
  estimate_type?: 'ML_PREDICTION' | 'RULE_BASED_ESTIMATE' | 'EXPERIMENTAL_PIXEL_PROJECTION' | 'OBSERVED_PIXEL_TREND' | 'NOT_AVAILABLE' | string | null
  supporting_factors?: string[] | null
  healing_limitations?: string[] | null
  healing_disclaimer?: string | null
  segmentation_mask_png_base64?: string | null
  is_baseline?: boolean | null
  initial_area_px?: number | null
  elapsed_days?: number | null
  pixel_reduction_rate_px_per_day?: number | null
  estimated_remaining_days?: number | null
  estimated_remaining_weeks?: number | null
  measurements_history?: HistoricalMeasurement[] | null
  explanation?: Array<string | { title?: string; detail?: string; text?: string }> | null
  warnings?: Array<string | { message?: string; severity?: string }> | null
  [key: string]: unknown
}

export interface HealthResponse {
  status: string
}
