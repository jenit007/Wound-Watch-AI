import { useCallback, useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'

// Main 5 Pages
import Home from './pages/Home'
import About from './pages/About'
import WoundCare from './pages/WoundCare'
import TestWound from './pages/TestWound'
import Results from './pages/Results'
import Contact from './pages/Contact'

// Clinical Workspace Pages
import Dashboard from './pages/Dashboard'
import Patients from './pages/Patients'
import PatientDetail from './pages/PatientDetail'
import History from './pages/History'

import { demoPatients } from './data/demo'
import type { Patient, Visit } from './types/patient'
import { checkHealth } from './services/api'

const mode = import.meta.env.VITE_APP_MODE === 'api' ? 'api' : 'demo'

export default function App() {
  const [patients, setPatients] = useState<Patient[]>(() =>
    demoPatients.map((p) => ({ ...p, visits: [...p.visits] }))
  )
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline' | 'not-checked'>(
    mode === 'api' ? 'checking' : 'not-checked'
  )

  useEffect(() => {
    if (mode !== 'api') return
    let active = true
    checkHealth()
      .then((res) => {
        if (active) setApiStatus(res.status === 'ok' ? 'online' : 'offline')
      })
      .catch(() => {
        if (active) setApiStatus('offline')
      })
    return () => {
      active = false
    }
  }, [])

  const addPatient = useCallback(
    (patient: Patient) => setPatients((current) => [patient, ...current]),
    []
  )

  const deletePatient = useCallback(
    (id: string) => setPatients((current) => current.filter((p) => p.id !== id)),
    []
  )

  const updatePatient = useCallback(
    (patient: Patient) =>
      setPatients((current) =>
        current.map((p) => (p.id === patient.id ? patient : p))
      ),
    []
  )

  const saveVisit = useCallback(
    (patientId: string, visit: Visit) =>
      setPatients((current) => {
        // If patient exists, append to their visits; if not, create a new local patient
        const existing = current.find((p) => p.id === patientId)
        if (existing) {
          return current.map((p) =>
            p.id === patientId ? { ...p, visits: [...p.visits, visit] } : p
          )
        }
        const newPatient: Patient = {
          id: patientId,
          ageRange: '50–59',
          sex: 'Not specified',
          woundLocation: 'Lower leg',
          woundDuration: '1–2 weeks',
          diabetesStatus: 'Unknown',
          smokingStatus: 'Unknown',
          status: 'Monitoring',
          createdAt: new Date().toISOString().slice(0, 10),
          source: 'local',
          visits: [visit],
        }
        return [newPatient, ...current]
      }),
    []
  )

  return (
    <Routes>
      <Route element={<AppLayout mode={mode} apiStatus={apiStatus} />}>
        {/* Page 1 — Home */}
        <Route index element={<Home mode={mode} />} />

        {/* Page 2 — About Us */}
        <Route path="about" element={<About />} />

        {/* Page 3 — Wound Care & Awareness */}
        <Route path="wound-care" element={<WoundCare />} />

        {/* Page 4 — Test Your Wound */}
        <Route
          path="test-wound"
          element={<TestWound patients={patients} onSaveVisit={saveVisit} mode={mode} />}
        />
        {/* Backward compatibility aliases */}
        <Route path="upload" element={<Navigate to="/test-wound" replace />} />
        <Route path="test" element={<Navigate to="/test-wound" replace />} />

        {/* Results Page */}
        <Route path="results/:requestId" element={<Results patients={patients} />} />

        {/* Page 5 — Contact Us */}
        <Route path="contact" element={<Contact />} />

        {/* Preserved Clinical Workspace Pages */}
        <Route
          path="dashboard"
          element={<Dashboard patients={patients} mode={mode} apiStatus={apiStatus} />}
        />
        <Route
          path="patients"
          element={
            <Patients
              patients={patients}
              onAdd={addPatient}
              onUpdate={updatePatient}
              onDelete={deletePatient}
              mode={mode}
            />
          }
        />
        <Route
          path="patients/:id"
          element={<PatientDetail patients={patients} onDelete={deletePatient} />}
        />
        <Route path="history" element={<History patients={patients} mode={mode} />} />

        {/* Catch-all redirect to Home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}