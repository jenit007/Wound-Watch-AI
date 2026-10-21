import type { Patient } from '../types/patient'

export const demoPatients: Patient[] = [
  { id: 'WW-0001', ageRange: '60–69', sex: 'Female', woundLocation: 'Lower leg', woundDuration: '3–4 weeks', diabetesStatus: 'Yes', smokingStatus: 'Never', status: 'Monitoring', createdAt: '2026-10-02', source: 'demo', visits: [
    { id: 'V-1001', date: '2026-10-02', woundAreaPx: 18640, woundAreaCm2: null, notes: 'Initial synthetic example visit', source: 'demo' },
    { id: 'V-1002', date: '2026-10-09', woundAreaPx: 16980, woundAreaCm2: null, notes: 'Follow-up synthetic example visit', source: 'demo' },
    { id: 'V-1003', date: '2026-10-16', woundAreaPx: 15120, woundAreaCm2: null, notes: 'Follow-up synthetic example visit', source: 'demo' },
  ] },
  { id: 'WW-0002', ageRange: '50–59', sex: 'Male', woundLocation: 'Foot', woundDuration: '1–2 weeks', diabetesStatus: 'Unknown', smokingStatus: 'Former', status: 'Review needed', createdAt: '2026-10-05', source: 'demo', visits: [
    { id: 'V-2001', date: '2026-10-05', woundAreaPx: 9200, woundAreaCm2: null, notes: 'Initial synthetic example visit', source: 'demo' },
    { id: 'V-2002', date: '2026-10-12', woundAreaPx: 10100, woundAreaCm2: null, notes: 'Follow-up synthetic example visit', source: 'demo' },
  ] },
  { id: 'WW-0003', ageRange: '70–79', sex: 'Female', woundLocation: 'Forearm', woundDuration: '5–6 weeks', diabetesStatus: 'No', smokingStatus: 'Never', status: 'Monitoring', createdAt: '2026-10-08', source: 'demo', visits: [
    { id: 'V-3001', date: '2026-10-08', woundAreaPx: 12800, woundAreaCm2: null, notes: 'Initial synthetic example visit', source: 'demo' },
    { id: 'V-3002', date: '2026-10-15', woundAreaPx: 12740, woundAreaCm2: null, notes: 'Follow-up synthetic example visit', source: 'demo' },
  ] },
  { id: 'WW-0004', ageRange: '40–49', sex: 'Male', woundLocation: 'Hand', woundDuration: 'Under 1 week', diabetesStatus: 'No', smokingStatus: 'Unknown', status: 'Completed', createdAt: '2026-10-10', source: 'demo', visits: [
    { id: 'V-4001', date: '2026-10-10', woundAreaPx: 6400, woundAreaCm2: null, notes: 'Synthetic example visit', source: 'demo' },
  ] },
]
