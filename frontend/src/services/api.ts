import axios from 'axios'
import type { AnalysisResponse, ClinicalData, HealthResponse, HistoricalMeasurement } from '../types/analysis'

const baseURL = (
  import.meta.env.PROD
    ? (import.meta.env.VITE_API_BASE_URL || '')
    : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000')
).replace(/\/$/, '')
export const apiClient = axios.create({ baseURL, timeout: 60000 })

export interface WoundSummary {
  wound_id: string
  label: string
  created_at: string
  wound_duration?: string | null
  progression_status?: string | null
  notes?: string | null
  measurement_count: number
  latest_recorded_at?: string | null
}

export async function checkHealth(): Promise<HealthResponse> {
  const { data } = await apiClient.get<HealthResponse>('/health')
  return data
}

export async function fetchWounds(): Promise<WoundSummary[]> {
  try {
    const { data } = await apiClient.get<{ wounds: WoundSummary[] }>('/api/wounds')
    return data.wounds || []
  } catch {
    return []
  }
}

export async function fetchWoundHistory(woundId: string): Promise<HistoricalMeasurement[]> {
  try {
    const { data } = await apiClient.get<{ wound_id: string; measurements: HistoricalMeasurement[] }>(
      `/api/wounds/${encodeURIComponent(woundId)}/history`
    )
    return data.measurements || []
  } catch {
    return []
  }
}
export async function analyzeWound(image: File, clinicalData: ClinicalData, onProgress?: (percent: number) => void): Promise<AnalysisResponse> {
  const form = new FormData()
  form.append('image', image)
  form.append('clinical_data', JSON.stringify(clinicalData))
  const { data } = await apiClient.post<AnalysisResponse>('/api/analyze', form, {
    onUploadProgress: (event) => {
      if (event.total) onProgress?.(Math.round((event.loaded / event.total) * 100))
    },
  })
  return data
}
export function getApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') return 'The analysis request timed out. Please try again.'
    if (!error.response) return `Cannot reach the WoundWatch API at ${baseURL}. Check that the FastAPI server is running and the URL is correct.`
    const detail = (error.response.data as { detail?: unknown } | undefined)?.detail
    return typeof detail === 'string' ? detail : `The server returned an error (${error.response.status}). Please try again.`
  }
  return 'Something unexpected happened. Please try again.'
}