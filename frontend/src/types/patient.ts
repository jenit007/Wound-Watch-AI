export type Visit = {
  id: string
  date: string
  woundAreaPx: number | null
  woundAreaCm2: number | null
  notes: string
  imageUrl?: string
  source: 'demo' | 'api'
}
export type Patient = {
  id: string
  ageRange: string
  sex: string
  woundLocation: string
  woundDuration: string
  diabetesStatus: 'Yes' | 'No' | 'Unknown'
  smokingStatus: 'Current' | 'Former' | 'Never' | 'Unknown'
  status: 'Monitoring' | 'Review needed' | 'Completed'
  createdAt: string
  visits: Visit[]
  source: 'demo' | 'local'
}