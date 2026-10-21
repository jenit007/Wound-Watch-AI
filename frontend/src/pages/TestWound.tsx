import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  AlertOctagon,
  ArrowRight,
  Camera,
  FileImage,
  FolderPlus,
  History,
  LoaderCircle,
  UploadCloud,
  X,
} from 'lucide-react'
import type { AnalysisResponse, ClinicalData } from '../types/analysis'
import type { Patient } from '../types/patient'
import { analyzeWound, fetchWounds, getApiError, type WoundSummary } from '../services/api'
import { saveAnalysis } from '../data/analysisStore'
import CameraCapture from '../components/CameraCapture'
import MedicalDisclaimer from '../components/MedicalDisclaimer'

interface Props {
  patients: Patient[]
  onSaveVisit: (patientId: string, visit: Patient['visits'][number]) => void
  mode: 'demo' | 'api'
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export default function TestWound({ patients = [], onSaveVisit, mode }: Props) {
  const [params] = useSearchParams()
  const navigate = useNavigate()

  // Track mode: 'new' vs 'follow-up'
  const initialWoundId = params.get('wound') || params.get('patient') || ''
  const [entryType, setEntryType] = useState<'new' | 'followup'>(initialWoundId ? 'followup' : 'new')
  const [selectedWoundId, setSelectedWoundId] = useState(initialWoundId)
  const [newWoundLabel, setNewWoundLabel] = useState('')
  const [generatedId] = useState(() => `WOUND-${Math.floor(1000 + Math.random() * 9000)}`)
  const [storedWounds, setStoredWounds] = useState<WoundSummary[]>([])

  // Fallback to patient records if no wounds registered in database yet
  const availableWounds = useMemo(() => {
    if (storedWounds.length > 0) return storedWounds
    return patients.map((p) => ({
      wound_id: p.id,
      label: `${p.id} - ${p.woundLocation} (${p.woundDuration})`,
      created_at: p.createdAt,
      measurement_count: p.visits.length,
    }))
  }, [storedWounds, patients])

  // Minimal form fields:
  // 1. Image (file / preview)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [showCamera, setShowCamera] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  const [loading, setLoading] = useState(false)

  // 2. How long have you had this wound? (<1 week, 1–4 weeks, >4 weeks)
  const [duration, setDuration] = useState<string>('1–4 weeks')

  // 3. Is the wound getting better, staying the same, or getting worse?
  const [progression, setProgression] = useState<string>('improving')

  // 4. Warning signs checklist
  const [warningSigns, setWarningSigns] = useState<string[]>([])

  // Optional visit date (defaults to today)
  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().slice(0, 10))

  // Fetch registered wounds from backend on mount
  useEffect(() => {
    let active = true
    fetchWounds().then((list) => {
      if (active && list.length > 0) {
        setStoredWounds(list)
        if (!selectedWoundId && initialWoundId) {
          const match = list.find((w) => w.wound_id === initialWoundId)
          if (match) setSelectedWoundId(match.wound_id)
        }
      }
    })
    return () => {
      active = false
    }
  }, [initialWoundId, selectedWoundId])

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      if (preview && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview)
      }
    }
  }, [preview])

  const effectiveWoundId = entryType === 'new' ? generatedId : selectedWoundId || generatedId
  const effectiveLabel = entryType === 'new'
    ? newWoundLabel.trim() || `Wound Record ${effectiveWoundId}`
    : storedWounds.find((w) => w.wound_id === selectedWoundId)?.label || `Wound ${effectiveWoundId}`

  function toggleWarningSign(key: string) {
    setWarningSigns((prev) => (prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]))
  }

  const isEmergency = warningSigns.includes('confusion_fainting')

  const fileSizeString = useMemo(() => {
    if (!file) return ''
    return `${(file.size / (1024 * 1024)).toFixed(2)} MB`
  }, [file])

  function handleFile(selected: File | undefined) {
    setError('')
    if (!selected) return

    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(selected.type)) {
      setError('Invalid format. Please select a valid JPEG, PNG, or WebP photograph.')
      return
    }

    if (selected.size > MAX_FILE_SIZE) {
      setError(`File size exceeds 10 MB limit (${(selected.size / (1024 * 1024)).toFixed(2)} MB). Please select a compressed image.`)
      return
    }

    setFile(selected)
    setPreview(URL.createObjectURL(selected))
    setShowCamera(false)
  }

  function handleCameraCapture(capturedFile: File, previewUrl: string) {
    setError('')
    setFile(capturedFile)
    setPreview(previewUrl)
    setShowCamera(false)
  }

  function resetImage() {
    setFile(null)
    setPreview('')
    setError('')
    setProgress(0)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!file) {
      setError('Please upload or capture a wound photograph before submitting.')
      return
    }

    setError('')
    setLoading(true)
    setProgress(20)

    const isUrgent = warningSigns.includes('confusion_fainting')
    const isHigh =
      warningSigns.includes('spreading_redness') ||
      warningSigns.includes('increasing_pain') ||
      warningSigns.includes('pus_drainage') ||
      warningSigns.includes('fever_chills')

    const clinicalPayload: ClinicalData = {
      wound_id: effectiveWoundId,
      wound_label: effectiveLabel,
      patient_id: effectiveWoundId,
      visit_date: visitDate,
      wound_duration: duration,
      progression_status: progression,
      symptoms: warningSigns.filter((s) => s !== 'confusion_fainting'),
      systemic_symptoms: isUrgent ? ['confusion', 'fainting'] : [],
      has_symptom_triage: true,
      fever_present: warningSigns.includes('fever_chills'),
      redness_extent: warningSigns.includes('spreading_redness') ? 'spreading' : 'none',
      discharge_type: warningSigns.includes('pus_drainage') ? 'purulent' : 'clear',
      pain_level: warningSigns.includes('increasing_pain') ? 'severe' : 'mild',
    }

    let persistentImageUrl = preview
    try {
      persistentImageUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => resolve(preview)
        reader.readAsDataURL(file)
      })
    } catch {
      persistentImageUrl = preview
    }

    try {
      if (mode === 'demo') {
        setProgress(60)
        await new Promise((r) => setTimeout(r, 600))
        setProgress(100)

        const generatedReqId = `DEMO-${Date.now().toString().slice(-6)}`
        const demoRisk = isUrgent ? 'URGENT' : isHigh ? 'HIGH' : duration.includes('More than 4') || progression === 'worsening' ? 'MODERATE' : 'LOW'

        const isFollowUp = entryType === 'followup'
        const baseArea = 14200
        const currentArea = isFollowUp ? Math.round(baseArea * 0.82) : baseArea

        const syntheticResponse: AnalysisResponse = {
          request_id: generatedReqId,
          model_status: 'ready',
          wound_id: effectiveWoundId,
          wound_area_px: currentArea,
          wound_area_cm2: null,
          area_change_percent: isFollowUp ? -18.0 : null,
          trajectory: isFollowUp ? 'improving' : 'insufficient_data',
          risk_level: demoRisk,
          risk_score: null,
          risk_basis: isUrgent
            ? 'Emergency systemic warning signs detected'
            : isHigh
            ? 'Signs consistent with acute localized infection'
            : demoRisk === 'MODERATE'
            ? 'Chronicity factors or comorbidities present'
            : 'No acute infection flags or emergency signs reported',
          risk_reasons: isUrgent
            ? ['Emergency warning signs reported (confusion, dizziness, or fainting).']
            : isHigh
            ? ['Signs of spreading redness, pus discharge, or fever reported.']
            : demoRisk === 'MODERATE'
            ? ['Wound duration greater than 4 weeks requires ongoing clinical review.']
            : ['No spreading redness, fever, or pus reported.', 'Standard protective hygiene recommended.'],
          recommended_action: isUrgent
            ? 'Seek immediate emergency medical evaluation (go to nearest emergency department or call 911 / 112).'
            : isHigh
            ? 'Prompt in-person clinical review recommended within 24 hours.'
            : 'Maintain clean, moisture-balanced dressings and monitor perimeter regularly.',
          risk_disclaimer: 'Preliminary software triage heuristic for research evaluation only; not a medical diagnosis.',
          healing_estimate_status: isUrgent ? 'INSUFFICIENT_DATA' : 'AVAILABLE',
          estimated_healing_time: isUrgent
            ? null
            : isFollowUp
            ? '12.4 days (~1.8 wks)'
            : duration.includes('More than 4')
            ? '8–14'
            : duration.includes('1')
            ? '1–3'
            : '3–6',
          estimated_healing_unit: isFollowUp ? 'days' : 'weeks',
          estimate_type: isFollowUp ? 'EXPERIMENTAL_PIXEL_PROJECTION' : 'RULE_BASED_ESTIMATE',
          supporting_factors: isFollowUp
            ? [
                'Observed contraction rate: 420 pixels/day across 6 elapsed days.',
                'Wound perimeter has contracted by 18.0% compared to baseline.',
                'Experimental projection to zero pixel area: ~12.4 days.',
              ]
            : ['Baseline photographic measurement established for this wound.', 'Acute presentation reported.'],
          healing_limitations: isFollowUp
            ? [
                'EXPERIMENTAL_PIXEL_PROJECTION is a mathematical extrapolation of 2D pixel contraction rate, not a verified clinical prediction.',
                'Actual physiological wound closure depends on cellular granulation, microvascular perfusion, and glycemic regulation.',
              ]
            : ['Single image baseline: a reduction rate cannot be calculated from a single photographic timepoint.'],
          healing_disclaimer: 'Healing estimates are research benchmarks and must not be used as clinical forecasts.',
          is_baseline: !isFollowUp,
          initial_area_px: baseArea,
          elapsed_days: isFollowUp ? 6 : 0,
          pixel_reduction_rate_px_per_day: isFollowUp ? 420 : null,
          estimated_remaining_days: isFollowUp ? 12.4 : null,
          estimated_remaining_weeks: isFollowUp ? 1.8 : null,
          measurements_history: isFollowUp
            ? [
                {
                  id: 'M-1',
                  recorded_at: '2026-10-15T10:00:00Z',
                  wound_area_px: baseArea,
                  wound_area_cm2: null,
                  risk_level: 'MODERATE',
                },
                {
                  id: 'M-2',
                  recorded_at: new Date().toISOString(),
                  wound_area_px: currentArea,
                  wound_area_cm2: null,
                  risk_level: demoRisk,
                },
              ]
            : [
                {
                  id: 'M-1',
                  recorded_at: new Date().toISOString(),
                  wound_area_px: baseArea,
                  wound_area_cm2: null,
                  risk_level: demoRisk,
                },
              ],
          segmentation_mask_png_base64: null,
          explanation: [
            'Automated lesion boundary detected using deep convolutional contours.',
            isFollowUp
              ? 'Sequential area comparison indicates negative percentage change consistent with healing contraction.'
              : 'Initial baseline measurement recorded for this wound.',
          ],
          warnings: [
            { message: 'Demonstration Mode: Synthetic metrics shown. No AI inference was performed.', severity: 'info' },
          ],
        }

        saveAnalysis({
          requestId: generatedReqId,
          timestamp: new Date().toISOString(),
          imageUrl: persistentImageUrl,
          clinicalData: clinicalPayload,
          response: syntheticResponse,
          mode: 'demo',
        })

        onSaveVisit(effectiveWoundId, {
          id: `V-${Date.now().toString().slice(-4)}`,
          date: visitDate,
          woundAreaPx: syntheticResponse.wound_area_px ?? null,
          woundAreaCm2: null,
          notes: `Test Your Wound analysis: ${demoRisk} risk`,
          imageUrl: persistentImageUrl,
          source: 'demo',
        })

        navigate(`/results/${generatedReqId}`)
      } else {
        // API MODE: Real FastAPI integration
        const response = await analyzeWound(file, clinicalPayload, (pct) => setProgress(pct))
        const actualReqId = response.request_id || `REQ-${Date.now().toString().slice(-6)}`

        saveAnalysis({
          requestId: actualReqId,
          timestamp: new Date().toISOString(),
          imageUrl: persistentImageUrl,
          clinicalData: clinicalPayload,
          response,
          mode: 'api',
        })

        onSaveVisit(effectiveWoundId, {
          id: `V-${Date.now().toString().slice(-4)}`,
          date: visitDate,
          woundAreaPx: response.wound_area_px ?? null,
          woundAreaCm2: response.wound_area_cm2 ?? null,
          notes: `FastAPI analysis: ${response.risk_level || 'Evaluated'}`,
          imageUrl: persistentImageUrl,
          source: 'api',
        })

        navigate(`/results/${actualReqId}`)
      }
    } catch (err) {
      console.error('Analysis submission failed:', err)
      setError(getApiError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="upload-page">
      <div className="upload-container" style={{ maxWidth: '980px', margin: '0 auto' }}>
        {/* Header */}
        <header className="page-header" style={{ marginBottom: '28px' }}>
          <div className="header-badge">EVIDENCE-BASED TRIAGE & ANALYSIS</div>
          <h1 style={{ fontSize: '30px', fontWeight: 800, margin: '6px 0 10px', color: 'var(--text-title)' }}>
            Test Your Wound
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', maxWidth: '720px', lineHeight: 1.6 }}>
            Upload or capture a photograph of your wound with minimal questions to receive instant neural network segmentation,
            preliminary clinical risk triage, and an evidence-based healing trajectory.
          </p>
        </header>

        {/* Emergency Alert Banner if Emergency Signs Checked */}
        {isEmergency && (
          <div
            style={{
              background: '#fef2f2',
              border: '2px solid #ef4444',
              borderRadius: '14px',
              padding: '18px 20px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px',
              boxShadow: '0 8px 20px rgba(239, 68, 68, 0.15)',
            }}
          >
            <AlertOctagon size={28} className="text-crimson" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ display: 'block', fontSize: '16px', color: '#991b1b', marginBottom: '4px' }}>
                URGENT: Emergency Warning Signs Reported
              </strong>
              <p style={{ margin: 0, fontSize: '13.5px', color: '#7f1d1d', lineHeight: 1.5 }}>
                Confusion, dizziness, or fainting can be life-threatening signs of systemic sepsis or severe infection.
                Do not wait for online screening — please call emergency services (911 / 112) or go to the nearest emergency department immediately.
              </p>
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {error && (
          <div
            style={{
              background: '#fff1f2',
              border: '1px solid #fecdd3',
              borderRadius: '12px',
              padding: '14px 18px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              color: '#be123c',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', fontWeight: 600 }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError('')}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#be123c' }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {/* ============================================================== */}
          {/* STEP 1: WOUND IMAGE (UPLOAD / CAMERA) */}
          {/* ============================================================== */}
          <section className="form-card" style={{ background: '#ffffff', borderRadius: '18px', padding: '28px', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary)', color: '#ffffff', fontWeight: 800, fontSize: '13px' }}>
                1
              </span>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-title)', margin: 0 }}>
                Wound Image <span style={{ color: '#ef4444' }}>*</span>
              </h2>
            </div>

            {preview ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', background: '#f8fafc', padding: '20px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ position: 'relative', maxWidth: '380px', width: '100%', maxHeight: '340px', overflow: 'hidden', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }}>
                  <img src={preview} alt="Wound preview" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  <button
                    type="button"
                    onClick={resetImage}
                    title="Remove image"
                    style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(15, 23, 42, 0.75)', color: '#ffffff', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <X size={16} />
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                  <FileImage size={16} />
                  <span>{file?.name || 'Captured photograph'}</span>
                  {fileSizeString && <span>({fileSizeString})</span>}
                  <button
                    type="button"
                    onClick={resetImage}
                    style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', padding: '0 6px' }}
                  >
                    Change Image
                  </button>
                </div>
              </div>
            ) : showCamera ? (
              <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
                <CameraCapture onCapture={handleCameraCapture} onCancel={() => setShowCamera(false)} />
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                {/* Drag and Drop Box */}
                <label
                  style={{
                    border: '2px dashed #94a3b8',
                    borderRadius: '14px',
                    padding: '36px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: '#f8fafc',
                    transition: 'all 0.2s ease',
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.currentTarget.style.borderColor = '#0ea5e9'
                    e.currentTarget.style.background = '#f0f9ff'
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault()
                    e.currentTarget.style.borderColor = '#94a3b8'
                    e.currentTarget.style.background = '#f8fafc'
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.currentTarget.style.borderColor = '#94a3b8'
                    e.currentTarget.style.background = '#f8fafc'
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleFile(e.dataTransfer.files[0])
                    }
                  }}
                >
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFile(e.target.files?.[0])}
                  />
                  <UploadCloud size={40} style={{ color: 'var(--primary)', marginBottom: '12px' }} />
                  <strong style={{ fontSize: '15px', color: 'var(--text-title)', display: 'block', marginBottom: '4px' }}>
                    Choose a photograph or drag here
                  </strong>
                  <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                    JPEG, PNG, or WebP up to 10 MB
                  </span>
                </label>

                {/* Camera Capture Card */}
                <div
                  style={{
                    border: '1.5px solid var(--border-subtle)',
                    borderRadius: '14px',
                    padding: '36px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    background: '#ffffff',
                  }}
                >
                  <Camera size={40} style={{ color: '#0d9488', marginBottom: '12px' }} />
                  <strong style={{ fontSize: '15px', color: 'var(--text-title)', display: 'block', marginBottom: '4px' }}>
                    Take Photo with Camera
                  </strong>
                  <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    Capture directly from phone or webcam
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCamera(true)}
                    className="btn btn-outline"
                    style={{ padding: '8px 18px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Camera size={15} />
                    <span>Open Camera</span>
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* ============================================================== */}
          {/* STEP 2: WOUND ASSOCIATION (NEW WOUND vs FOLLOW-UP) */}
          {/* ============================================================== */}
          <section className="form-card" style={{ background: '#ffffff', borderRadius: '18px', padding: '28px', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary)', color: '#ffffff', fontWeight: 800, fontSize: '13px' }}>
                2
              </span>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-title)', margin: 0 }}>
                  Wound Record Tracking
                </h2>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  Track a new wound or link as a follow-up image to compute your healing rate and progress graph.
                </p>
              </div>
            </div>

            {/* Entry type toggle cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  border: entryType === 'new' ? '2px solid var(--primary)' : '1.5px solid var(--border-subtle)',
                  background: entryType === 'new' ? 'var(--primary-subtle)' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <input
                  type="radio"
                  name="entryType"
                  value="new"
                  checked={entryType === 'new'}
                  onChange={() => setEntryType('new')}
                  style={{ display: 'none' }}
                />
                <FolderPlus size={20} className={entryType === 'new' ? 'text-blue' : 'text-muted'} />
                <div>
                  <strong style={{ display: 'block', fontSize: '14px', color: 'var(--text-title)' }}>
                    New Wound Record
                  </strong>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    First photo: establishes baseline area
                  </span>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  border: entryType === 'followup' ? '2px solid var(--primary)' : '1.5px solid var(--border-subtle)',
                  background: entryType === 'followup' ? 'var(--primary-subtle)' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <input
                  type="radio"
                  name="entryType"
                  value="followup"
                  checked={entryType === 'followup'}
                  onChange={() => setEntryType('followup')}
                  style={{ display: 'none' }}
                />
                <History size={20} className={entryType === 'followup' ? 'text-teal' : 'text-muted'} />
                <div>
                  <strong style={{ display: 'block', fontSize: '14px', color: 'var(--text-title)' }}>
                    Follow-up Photo
                  </strong>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Calculates pixel reduction rate & graph
                  </span>
                </div>
              </label>
            </div>

            {/* Inputs based on entry type */}
            {entryType === 'new' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Generated Wound ID
                  </label>
                  <input
                    type="text"
                    value={generatedId}
                    disabled
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#e2e8f0', fontWeight: 700, color: '#334155', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Wound Label / Location (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Left ankle scrape, Hand cut"
                    value={newWoundLabel}
                    onChange={(e) => setNewWoundLabel(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Photo Date
                  </label>
                  <input
                    type="date"
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '13px' }}
                  />
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ gridColumn: availableWounds.length > 0 ? 'span 2' : 'span 1' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Select Existing Wound to Link
                  </label>
                  {availableWounds.length > 0 ? (
                    <select
                      value={selectedWoundId}
                      onChange={(e) => setSelectedWoundId(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '13px', fontWeight: 600 }}
                    >
                      <option value="">-- Choose registered wound --</option>
                      {availableWounds.map((w) => (
                        <option key={w.wound_id} value={w.wound_id}>
                          {w.label} ({w.wound_id}) · {w.measurement_count} recorded photo(s)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Enter Wound ID (e.g. WOUND-100)"
                      value={selectedWoundId}
                      onChange={(e) => setSelectedWoundId(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '13px' }}
                    />
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Follow-up Photo Date
                  </label>
                  <input
                    type="date"
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '13px' }}
                  />
                </div>
              </div>
            )}
          </section>

          {/* ============================================================== */}
          {/* STEP 3: HOW LONG HAVE YOU HAD THIS WOUND? */}
          {/* ============================================================== */}
          <section className="form-card" style={{ background: '#ffffff', borderRadius: '18px', padding: '28px', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary)', color: '#ffffff', fontWeight: 800, fontSize: '13px' }}>
                3
              </span>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-title)', margin: 0 }}>
                  How long have you had this wound? <span style={{ color: '#ef4444' }}>*</span>
                </h2>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  Chronicity helps determine healing dynamics and risk benchmarks.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              {[
                { label: 'Less than 1 week', value: 'Less than 1 week', sub: 'Acute, recent wound' },
                { label: '1 to 4 weeks', value: '1–4 weeks', sub: 'Subacute progression' },
                { label: 'More than 4 weeks', value: 'More than 4 weeks', sub: 'Chronic presentation' },
              ].map((opt) => (
                <label
                  key={opt.value}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '16px',
                    borderRadius: '12px',
                    border: duration === opt.value ? '2px solid var(--primary)' : '1.5px solid var(--border-subtle)',
                    background: duration === opt.value ? 'var(--primary-subtle)' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '14px', color: 'var(--text-title)' }}>{opt.label}</strong>
                    <input
                      type="radio"
                      name="duration"
                      value={opt.value}
                      checked={duration === opt.value}
                      onChange={() => setDuration(opt.value)}
                    />
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{opt.sub}</span>
                </label>
              ))}
            </div>
          </section>

          {/* ============================================================== */}
          {/* STEP 4: IS THE WOUND GETTING BETTER, STAYING SAME, OR GETTING WORSE? */}
          {/* ============================================================== */}
          <section className="form-card" style={{ background: '#ffffff', borderRadius: '18px', padding: '28px', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary)', color: '#ffffff', fontWeight: 800, fontSize: '13px' }}>
                4
              </span>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-title)', margin: 0 }}>
                  Is the wound getting better, staying the same, or getting worse? <span style={{ color: '#ef4444' }}>*</span>
                </h2>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  Observed qualitative progression over recent days.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              {[
                { label: 'Getting better', value: 'improving', sub: 'Shrinking, less painful, forming clean edges' },
                { label: 'Staying the same', value: 'stable', sub: 'No significant size or symptom change' },
                { label: 'Getting worse', value: 'worsening', sub: 'Expanding, deeper, or increasing pain' },
              ].map((opt) => (
                <label
                  key={opt.value}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '16px',
                    borderRadius: '12px',
                    border: progression === opt.value ? '2px solid var(--primary)' : '1.5px solid var(--border-subtle)',
                    background: progression === opt.value ? 'var(--primary-subtle)' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '14px', color: 'var(--text-title)' }}>{opt.label}</strong>
                    <input
                      type="radio"
                      name="progression"
                      value={opt.value}
                      checked={progression === opt.value}
                      onChange={() => setProgression(opt.value)}
                    />
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{opt.sub}</span>
                </label>
              ))}
            </div>
          </section>

          {/* ============================================================== */}
          {/* STEP 5: WARNING SIGNS CHECKLIST */}
          {/* ============================================================== */}
          <section className="form-card" style={{ background: '#ffffff', borderRadius: '18px', padding: '28px', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary)', color: '#ffffff', fontWeight: 800, fontSize: '13px' }}>
                5
              </span>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-title)', margin: 0 }}>
                  Warning Signs Checklist
                </h2>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  Check any signs you are experiencing. Leave unchecked if none apply.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              {[
                {
                  id: 'spreading_redness',
                  label: 'Spreading redness or swelling around the wound margin',
                  badge: 'Infection sign',
                  badgeColor: '#f97316',
                },
                {
                  id: 'increasing_pain',
                  label: 'Increasing pain, throbbing, or intense localized warmth',
                  badge: 'Infection sign',
                  badgeColor: '#f97316',
                },
                {
                  id: 'pus_drainage',
                  label: 'Pus, yellow/green discharge, or foul-smelling fluid',
                  badge: 'Infection sign',
                  badgeColor: '#f97316',
                },
                {
                  id: 'fever_chills',
                  label: 'Fever or shaking chills',
                  badge: 'Systemic sign',
                  badgeColor: '#ef4444',
                },
                {
                  id: 'confusion_fainting',
                  label: 'Confusion, dizziness, lightheadedness, or fainting',
                  badge: 'EMERGENCY SIGN',
                  badgeColor: '#dc2626',
                  isUrgent: true,
                },
              ].map((item) => {
                const checked = warningSigns.includes(item.id)
                return (
                  <label
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 18px',
                      borderRadius: '12px',
                      border: checked
                        ? item.isUrgent
                          ? '2px solid #ef4444'
                          : '2px solid #f97316'
                        : '1.5px solid var(--border-subtle)',
                      background: checked
                        ? item.isUrgent
                          ? '#fef2f2'
                          : '#fff7ed'
                        : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleWarningSign(item.id)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '14px', fontWeight: checked ? 700 : 500, color: item.isUrgent && checked ? '#991b1b' : 'var(--text-title)' }}>
                        {item.label}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        background: checked ? item.badgeColor : '#f1f5f9',
                        color: checked ? '#ffffff' : '#64748b',
                        letterSpacing: '0.03em',
                      }}
                    >
                      {item.badge}
                    </span>
                  </label>
                )
              })}
            </div>
          </section>

          {/* Progress bar during upload */}
          {loading && (
            <div style={{ background: '#ffffff', borderRadius: '14px', padding: '18px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <LoaderCircle size={16} className="animate-spin text-teal" />
                  Analyzing photograph with deep learning pipeline...
                </span>
                <span>{progress}%</span>
              </div>
              <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #0ea5e9, #0d9488)', transition: 'width 0.3s ease' }} />
              </div>
            </div>
          )}

          {/* Submit Action Row */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px' }}>
            <button
              type="submit"
              disabled={loading || !file}
              className="btn btn-primary btn-large"
              style={{
                padding: '14px 32px',
                fontSize: '15px',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                opacity: loading || !file ? 0.6 : 1,
                cursor: loading || !file ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? (
                <>
                  <LoaderCircle size={18} className="animate-spin" />
                  <span>Processing Analysis...</span>
                </>
              ) : (
                <>
                  <span>Analyze Wound & View Results</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Medical disclaimer component */}
        <div style={{ marginTop: '36px' }}>
          <MedicalDisclaimer />
        </div>
      </div>
    </div>
  )
}
