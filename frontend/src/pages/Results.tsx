import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Activity,
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  HelpCircle,
  History,
  Info,
  LineChart as LineChartIcon,
  PlusCircle,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { HistoricalMeasurement } from '../types/analysis'
import type { Patient } from '../types/patient'
import { getAnalysis, sampleStoredAnalyses, type StoredAnalysis } from '../data/analysisStore'
import { fetchWoundHistory } from '../services/api'
import { formatDate, formatNumber, titleCase } from '../utils/format'
import MedicalDisclaimer from '../components/MedicalDisclaimer'

function renderHighlightedText(text: string) {
  if (!text) return null
  // Match risk elements (URGENT, HIGH, MODERATE, MEDIUM, LOW) and week/day durations (e.g. 3-6 weeks, 1-3 weeks, 4+ weeks, 12.4 days)
  const regex = /(\bURGENT\b|\bHIGH\b|\bMODERATE\b|\bMEDIUM\b|\bLOW\b|\b\d+(?:[–-]\d+)?\+?\s*(?:weeks?|wks?|days?|months?)\b)/gi
  const parts = text.split(regex)
  return (
    <>
      {parts.map((part, index) => {
        if (regex.test(part)) {
          regex.lastIndex = 0
          const lower = part.toLowerCase()
          const isUrgent = lower.includes('urgent')
          const isHigh = lower.includes('high')
          const isMod = lower.includes('moderate') || lower.includes('medium')
          const isLow = lower.includes('low')
          const color = isUrgent
            ? '#dc2626'
            : isHigh
            ? '#ea580c'
            : isMod
            ? '#d97706'
            : isLow
            ? '#059669'
            : '#0f766e'

          return (
            <strong key={index} style={{ fontWeight: 800, color }}>
              {part}
            </strong>
          )
        }
        return part
      })}
    </>
  )
}

interface Props {
  patients: Patient[]
}

export default function Results({ patients }: Props) {
  const { requestId = '' } = useParams<{ requestId: string }>()

  const [storedRecord, setStoredRecord] = useState<StoredAnalysis | null>(null)
  const [maskOpacity, setMaskOpacity] = useState(60)
  const [viewMode, setViewMode] = useState<'overlay' | 'side-by-side'>('overlay')
  const [dbHistory, setDbHistory] = useState<HistoricalMeasurement[]>([])

  useEffect(() => {
    const found = getAnalysis(requestId)
    if (found) {
      setStoredRecord(found)
    } else {
      setStoredRecord(sampleStoredAnalyses['DEMO-948120'])
    }
  }, [requestId])

  const response = storedRecord?.response
  const clinical = storedRecord?.clinicalData
  const imageUrl = storedRecord?.imageUrl

  const effectiveWoundId =
    response?.wound_id || clinical?.wound_id || clinical?.patient_id || ''

  // Fetch SQLite history from backend if available
  useEffect(() => {
    let active = true
    if (effectiveWoundId) {
      fetchWoundHistory(effectiveWoundId).then((records) => {
        if (active && records && records.length > 0) {
          setDbHistory(records)
        }
      })
    }
    return () => {
      active = false
    }
  }, [effectiveWoundId])

  // Linked patient fallback from memory
  const linkedPatient = useMemo(() => {
    if (!clinical?.patient_id) return null
    return patients.find((p) => p.id === clinical.patient_id) || null
  }, [clinical?.patient_id, patients])

  // Consolidated progress chart data
  const chartData = useMemo(() => {
    if (dbHistory.length > 0) {
      return dbHistory
        .filter((m) => typeof m.wound_area_px === 'number')
        .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
        .map((m) => ({
          date: formatDate(m.recorded_at),
          rawDate: m.recorded_at,
          area: m.wound_area_px,
          cm2: m.wound_area_cm2,
        }))
    }

    if (response?.measurements_history && response.measurements_history.length > 0) {
      return [...response.measurements_history]
        .filter((m) => typeof m.wound_area_px === 'number')
        .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
        .map((m) => ({
          date: formatDate(m.recorded_at),
          rawDate: m.recorded_at,
          area: m.wound_area_px,
          cm2: m.wound_area_cm2,
        }))
    }

    if (linkedPatient && linkedPatient.visits.length > 0) {
      return [...linkedPatient.visits]
        .filter((v) => typeof v.woundAreaPx === 'number')
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((v) => ({
          date: formatDate(v.date),
          rawDate: v.date,
          area: v.woundAreaPx as number,
          cm2: v.woundAreaCm2,
        }))
    }

    if (typeof response?.wound_area_px === 'number') {
      return [
        {
          date: formatDate(clinical?.visit_date || new Date().toISOString()),
          rawDate: clinical?.visit_date || new Date().toISOString(),
          area: response.wound_area_px,
          cm2: response.wound_area_cm2,
        },
      ]
    }

    return []
  }, [dbHistory, response, linkedPatient, clinical])

  const displayHealingWeeks = useMemo(() => {
    if (response?.estimated_healing_time) {
      const raw = response.estimated_healing_time.trim()
      const unit = (response.estimated_healing_unit || 'weeks').trim().toUpperCase()
      if (raw.toLowerCase().includes('week') || raw.toLowerCase().includes('wk') || raw.toLowerCase().includes('day')) {
        return raw.toUpperCase()
      }
      return `${raw} ${unit}`
    }
    if (typeof response?.estimated_remaining_weeks === 'number') {
      return `~${response.estimated_remaining_weeks} WEEKS`
    }
    return null
  }, [response])

  const progressChartData = useMemo(() => {
    if (chartData.length >= 2) {
      return chartData
    }
    if (chartData.length === 1) {
      const pt = chartData[0]
      const area = pt.area
      const closureLabel = displayHealingWeeks ? `Closure (${displayHealingWeeks})` : 'Target Closure'
      return [
        {
          date: `${pt.date} (Baseline)`,
          area: area,
          label: 'Baseline Area',
        },
        {
          date: `Projected ${closureLabel}`,
          area: 0,
          label: 'Target Closure',
        },
      ]
    }
    if (typeof response?.wound_area_px === 'number') {
      const area = response.wound_area_px
      const closureLabel = displayHealingWeeks ? `Closure (${displayHealingWeeks})` : 'Target Closure'
      const curDate = formatDate(clinical?.visit_date || new Date().toISOString())
      return [
        {
          date: `${curDate} (Baseline)`,
          area: area,
          label: 'Baseline Area',
        },
        {
          date: `Projected ${closureLabel}`,
          area: 0,
          label: 'Target Closure',
        },
      ]
    }
    return []
  }, [chartData, response, clinical, displayHealingWeeks])

  function exportReport() {
    if (!response || !clinical) return
    const lines = [
      '=================================================================',
      'WOUNDWATCH AI — RESEARCH COMPUTER VISION ANALYSIS REPORT',
      '=================================================================',
      `Generated: ${new Date().toLocaleString()}`,
      `Request ID: ${response.request_id || requestId}`,
      `Wound ID: ${effectiveWoundId || 'Not specified'}`,
      `Execution Mode: ${storedRecord?.mode === 'demo' ? 'Synthetic Demo Sample' : 'FastAPI Integration'}`,
      `Visit Date: ${clinical.visit_date || 'Not specified'}`,
      `Duration: ${clinical.wound_duration || 'Not specified'}`,
      `Progression Status: ${clinical.progression_status || 'Not specified'}`,
      '',
      '--- 1. WOUND RISK ASSESSMENT ---',
      `Risk Category: ${String(response.risk_level || 'UNAVAILABLE').toUpperCase()}`,
      `Risk Basis: ${response.risk_basis || 'Automated symptom triage evaluation'}`,
      `Recommended Action: ${response.recommended_action || 'N/A'}`,
      ...(Array.isArray(response.risk_reasons) && response.risk_reasons.length
        ? response.risk_reasons.map((r) => `* Reason: ${r}`)
        : []),
      '',
      '--- 2. ESTIMATED HEALING TIME ---',
      `Status: ${response.healing_estimate_status || 'INSUFFICIENT_DATA'}`,
      `Estimated Time: ${response.estimated_healing_time ? `${response.estimated_healing_time} ${response.estimated_healing_unit || 'weeks'}` : 'Unavailable (Baseline/Insufficient parameters)'}`,
      `Estimate Methodology: ${response.estimate_type || 'NOT_AVAILABLE'}`,
      `Observed Reduction Rate: ${typeof response.pixel_reduction_rate_px_per_day === 'number' ? `${response.pixel_reduction_rate_px_per_day} px/day` : 'N/A (Baseline single image)'}`,
      `Area Change: ${typeof response.area_change_percent === 'number' ? `${response.area_change_percent > 0 ? '+' : ''}${formatNumber(response.area_change_percent)}%` : 'Baseline'}`,
      ...(Array.isArray(response.supporting_factors) && response.supporting_factors.length
        ? response.supporting_factors.map((f) => `* Factor: ${f}`)
        : []),
      ...(Array.isArray(response.healing_limitations) && response.healing_limitations.length
        ? response.healing_limitations.map((l) => `! Limitation: ${l}`)
        : []),
      '',
      '--- 3. MEASURED QUANTITATIVE DIMENSIONS ---',
      `Calculated Pixel Area: ${typeof response.wound_area_px === 'number' ? `${formatNumber(response.wound_area_px)} px` : 'Unavailable'}`,
      `Calibrated Area: ${typeof response.wound_area_cm2 === 'number' ? `${formatNumber(response.wound_area_cm2)} cm²` : 'Unavailable (Scale marker not detected)'}`,
      `Trajectory: ${response.trajectory || 'Unavailable'}`,
      '',
      '=================================================================',
      'DISCLAIMER: Research and educational screening software only.',
      'Must be reviewed by a licensed healthcare professional.',
      '=================================================================',
    ]

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `woundwatch-analysis-${response.request_id || requestId}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!response) {
    return (
      <div className="section-container" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <h2>Loading Analysis Results…</h2>
        <p>Retrieving model response records.</p>
      </div>
    )
  }

  const isDemo = storedRecord?.mode === 'demo'
  const explanations = Array.isArray(response.explanation) ? response.explanation : []
  const warnings = Array.isArray(response.warnings) ? response.warnings : []
  const maskBase64 = response.segmentation_mask_png_base64
  const maskDataUrl = maskBase64
    ? maskBase64.startsWith('data:')
      ? maskBase64
      : `data:image/png;base64,${maskBase64}`
    : null

  const displayRiskLevel = String(response.risk_level || 'UNAVAILABLE').toUpperCase()
  const riskBadgeClass =
    displayRiskLevel === 'URGENT'
      ? 'urgent'
      : displayRiskLevel === 'HIGH'
      ? 'high'
      : displayRiskLevel === 'MODERATE'
      ? 'moderate'
      : displayRiskLevel === 'LOW'
      ? 'low'
      : 'unavailable'

  const riskIcon =
    displayRiskLevel === 'URGENT' ? (
      <AlertOctagon size={16} />
    ) : displayRiskLevel === 'HIGH' ? (
      <AlertTriangle size={16} />
    ) : displayRiskLevel === 'MODERATE' ? (
      <AlertCircle size={16} />
    ) : displayRiskLevel === 'LOW' ? (
      <CheckCircle2 size={16} />
    ) : (
      <HelpCircle size={16} />
    )

  const actionBoxClass =
    displayRiskLevel === 'URGENT'
      ? 'urgent-action'
      : displayRiskLevel === 'HIGH'
      ? 'high-action'
      : displayRiskLevel === 'MODERATE'
      ? 'moderate-action'
      : 'low-action'

  const actionTextClass =
    displayRiskLevel === 'URGENT'
      ? 'text-crimson'
      : displayRiskLevel === 'HIGH'
      ? 'text-amber'
      : 'text-emerald'

  const riskReasons = Array.isArray(response.risk_reasons) ? response.risk_reasons : []
  const supportingFactors = Array.isArray(response.supporting_factors) ? response.supporting_factors : []
  const healingLimitations = Array.isArray(response.healing_limitations) ? response.healing_limitations : []

  const isBaseline = Boolean(response.is_baseline || chartData.length <= 1)
  const isProjection = response.estimate_type === 'EXPERIMENTAL_PIXEL_PROJECTION'

  return (
    <div className="results-page-wrapper">
      <div className="results-container">
        {/* Breadcrumb Navigation */}
        <div className="results-top-nav">
          <Link to="/test-wound" className="btn-back">
            <ArrowLeft size={16} />
            <span>Test Another Wound</span>
          </Link>
          <div className="results-breadcrumbs">
            <Link to="/">Dashboard</Link>
            <ChevronRight size={14} />
            <Link to="/test-wound">Test Wound</Link>
            <ChevronRight size={14} />
            <span>Analysis Results</span>
          </div>
        </div>

        {/* Results Header Card */}
        <header className="results-header-card" style={{ marginBottom: '24px' }}>
          <div className="results-header-left">
            <div className="results-id-row">
              <span className="results-badge">ANALYSIS REPORT</span>
              <span className="results-id">
                Request: <code>{response.request_id || requestId}</code>
              </span>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '6px 0 4px', color: 'var(--text-title)' }}>
              Wound Assessment & Progress Summary
            </h1>
            <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-muted)' }}>
              Wound Record: <strong>{effectiveWoundId || 'Not specified'}</strong> · Date:{' '}
              <strong>{clinical?.visit_date || 'Today'}</strong> · Duration:{' '}
              <strong>{clinical?.wound_duration || 'Not specified'}</strong>
            </p>
          </div>

          <div className="results-header-right">
            <div className={`status-pill ${response.model_status || 'ready'}`}>
              <CheckCircle2 size={16} />
              <span>Status: {response.model_status || 'Ready'}</span>
            </div>
            {isDemo && (
              <span className="demo-chip large">
                <Sparkles size={13} /> SYNTHETIC DEMO OUTPUT
              </span>
            )}
          </div>
        </header>

        {/* Demo Mode Notice Banner */}
        {isDemo && (
          <div className="demo-notice-banner" style={{ marginBottom: '24px' }}>
            <Sparkles size={18} />
            <div>
              <strong>Demonstration Mode:</strong> Output synthesized for prototype review. To run real deep-learning U-Net inference, ensure FastAPI is running and set <code>VITE_APP_MODE=api</code>.
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* STRICT ORDER SECTION 1: WOUND RISK ASSESSMENT (TOP)               */}
        {/* ================================================================= */}
        <section
          className="assessment-card"
          style={{
            marginBottom: '24px',
            border: displayRiskLevel === 'URGENT' ? '2px solid #ef4444' : displayRiskLevel === 'HIGH' ? '2px solid #f97316' : '1px solid var(--border-subtle)',
          }}
        >
          <div className="assessment-card-header">
            <div className="assessment-card-title">
              <ShieldAlert size={22} className="text-blue" />
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-title)' }}>
                  1. Wound Risk Assessment{displayRiskLevel && displayRiskLevel !== 'UNAVAILABLE' ? (
                    <> (<strong style={{ fontWeight: 800, color: displayRiskLevel === 'URGENT' ? '#dc2626' : displayRiskLevel === 'HIGH' ? '#ea580c' : displayRiskLevel === 'MODERATE' ? '#d97706' : '#059669' }}>{displayRiskLevel === 'MODERATE' ? 'MEDIUM / MODERATE' : displayRiskLevel}</strong>)</>
                  ) : ''}
                </h2>
                <p style={{ fontSize: '12.5px', margin: '2px 0 0', color: 'var(--text-muted)' }}>
                  Clinical safety triage evaluating reported warning signs, infection markers, and chronicity
                </p>
              </div>
            </div>

            {/* Prominent Risk Level Badge */}
            <div className={`risk-badge-large ${riskBadgeClass}`}>
              {riskIcon}
              <span>{displayRiskLevel}</span>
            </div>
          </div>

          {/* Basis Statement */}
          <div className="risk-basis-box">
            <strong>Basis of Assessment</strong>
            <span>
              {renderHighlightedText(response.risk_basis ||
                'Conservative software triage evaluation of reported warning signs, chronicity, and progression status.')}
            </span>
          </div>

          {/* Reasons List */}
          <div style={{ marginBottom: '14px' }}>
            <strong
              style={{
                fontSize: '12px',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                letterSpacing: '0.04em',
                display: 'block',
                marginBottom: '8px',
              }}
            >
              Identified Observations & Clinical Reasons:
            </strong>
            {riskReasons.length > 0 ? (
              <ul className="results-list">
                {riskReasons.map((reason, idx) => (
                  <li key={idx}>
                    <CheckCircle2 size={15} className="list-icon text-teal" />
                    <span>{renderHighlightedText(reason)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-text">No acute warning signs reported in the triage checklist.</p>
            )}
          </div>

          {/* Recommended Action Guidance Box */}
          {response.recommended_action && (
            <div className={`action-guidance-box ${actionBoxClass}`} style={{ marginTop: '4px' }}>
              <div className={`action-guidance-header ${actionTextClass}`}>
                <Activity size={14} />
                <span>Recommended Action & Next Steps</span>
              </div>
              <p>{renderHighlightedText(response.recommended_action)}</p>
            </div>
          )}

          {/* Disclaimer */}
          <p className="risk-disclaimer-note" style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <strong>Triage Notice:</strong>{' '}
            {response.risk_disclaimer ||
              'Automated software heuristic for educational and screening assistance; not a medical diagnosis.'}
          </p>
        </section>

        {/* ================================================================= */}
        {/* STRICT ORDER SECTION 2: ESTIMATED HEALING TIME (SECOND)          */}
        {/* ================================================================= */}
        <section className="assessment-card" style={{ marginBottom: '24px' }}>
          <div className="assessment-card-header">
            <div className="assessment-card-title">
              <Clock size={22} className="text-teal" />
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-title)' }}>
                  2. Estimated Healing Time{displayHealingWeeks ? (
                    <> (<strong style={{ fontWeight: 800, color: '#0f766e' }}>{displayHealingWeeks}</strong>)</>
                  ) : ''}
                </h2>
                <p style={{ fontSize: '12.5px', margin: '2px 0 0', color: 'var(--text-muted)' }}>
                  {isProjection
                    ? 'Observed pixel reduction rate and linear projection to wound closure'
                    : isBaseline
                    ? 'Baseline single photograph recorded · longitudinal rate requires follow-up'
                    : 'Evidence-based literature healing benchmark'}
                </p>
              </div>
            </div>

            <span className="healing-type-tag">
              {isProjection
                ? 'EXPERIMENTAL PIXEL PROJECTION'
                : isBaseline
                ? 'BASELINE TIMEPOINT'
                : response.estimate_type === 'RULE_BASED_ESTIMATE'
                ? 'LITERATURE BENCHMARK'
                : 'TRAJECTORY EVALUATION'}
            </span>
          </div>

          {/* HERO METRIC DISPLAY */}
          {isProjection ? (
            /* Follow-up image with observed contraction rate */
            <div
              style={{
                background: '#f0fdfa',
                border: '1.5px solid #99f6e4',
                borderRadius: '14px',
                padding: '20px',
                marginBottom: '18px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#0d9488', letterSpacing: '0.04em', display: 'block', marginBottom: '4px' }}>
                    Projected Time to Full Closure
                  </span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <strong style={{ fontSize: '36px', fontWeight: 800, color: '#134e4a', fontFamily: 'Manrope, sans-serif' }}>
                      ~{response.estimated_remaining_days}
                    </strong>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: '#0f766e' }}>
                      days (~{response.estimated_remaining_weeks} weeks)
                    </span>
                  </div>
                </div>

                {/* Reduction metrics pill group */}
                <div style={{ display: 'flex', gap: '16px', background: '#ffffff', padding: '10px 16px', borderRadius: '10px', border: '1px solid #ccfbf1' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>
                      REDUCTION RATE
                    </span>
                    <strong style={{ fontSize: '15px', color: '#047857' }}>
                      {response.pixel_reduction_rate_px_per_day} px/day
                    </strong>
                  </div>
                  <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '16px' }}>
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>
                      AREA CONTRACTION
                    </span>
                    <strong style={{ fontSize: '15px', color: '#047857' }}>
                      {response.area_change_percent}%
                    </strong>
                  </div>
                  <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '16px' }}>
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>
                      ELAPSED
                    </span>
                    <strong style={{ fontSize: '15px', color: '#334155' }}>
                      {response.elapsed_days} day(s)
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          ) : response.estimated_healing_time ? (
            /* Evidence-based literature benchmark healing time */
            <div
              style={{
                background: '#f0fdfa',
                border: '1.5px solid #99f6e4',
                borderRadius: '14px',
                padding: '20px',
                marginBottom: '18px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#0d9488', letterSpacing: '0.04em', display: 'block', marginBottom: '4px' }}>
                    Evidence-Based Estimated Healing Time
                  </span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <strong style={{ fontSize: '36px', fontWeight: 800, color: '#134e4a', fontFamily: 'Manrope, sans-serif' }}>
                      {response.estimated_healing_time}
                    </strong>
                    <span style={{ fontSize: '20px', fontWeight: 800, color: '#0f766e' }}>
                      {response.estimated_healing_unit || 'weeks'}
                    </span>
                  </div>
                </div>

                <div style={{ background: '#ffffff', padding: '10px 16px', borderRadius: '10px', border: '1px solid #ccfbf1' }}>
                  <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>
                    BENCHMARK METHODOLOGY
                  </span>
                  <strong style={{ fontSize: '13px', color: '#0d9488' }}>
                    {response.estimate_type === 'RULE_BASED_ESTIMATE' ? 'Literature Clinical Benchmark' : response.estimate_type}
                  </strong>
                </div>
              </div>

              {isBaseline && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #ccfbf1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Info size={15} className="text-teal" />
                  <span style={{ fontSize: '12.5px', color: '#115e59' }}>
                    Initial photographic baseline recorded ({typeof response.wound_area_px === 'number' ? `${formatNumber(response.wound_area_px)} px` : 'recorded'}). Upload a second photograph in 3–7 days to calculate your observed pixel reduction rate.
                  </span>
                </div>
              )}
            </div>
          ) : isBaseline ? (
            /* Single image baseline state */
            <div
              style={{
                background: '#f8fafc',
                border: '1.5px dashed #cbd5e1',
                borderRadius: '14px',
                padding: '20px',
                marginBottom: '18px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <Info size={24} className="text-blue" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ display: 'block', fontSize: '15px', color: 'var(--text-title)', marginBottom: '4px' }}>
                    Baseline Measurement Established ({typeof response.wound_area_px === 'number' ? `${formatNumber(response.wound_area_px)} px` : 'Recorded'})
                  </strong>
                  <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                    Healing rates and estimated closure times require sequential photographs to calculate the rate of boundary contraction.
                    Upload a second photograph in 3–7 days to calculate your observed pixel reduction rate (px/day) and display the healing trajectory trend line.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Stalled or expanding lesion */
            <div
              style={{
                background: '#fffbeb',
                border: '1.5px solid #fde047',
                borderRadius: '14px',
                padding: '20px',
                marginBottom: '18px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <TrendingUp size={24} className="text-amber" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ display: 'block', fontSize: '15px', color: '#b45309', marginBottom: '4px' }}>
                    Non-Contracting or Stalled Wound Profile ({response.area_change_percent ? `+${response.area_change_percent}%` : 'Unchanged'})
                  </strong>
                  <p style={{ margin: 0, fontSize: '13.5px', color: '#92400e', lineHeight: 1.55 }}>
                    Wound area has not decreased over the monitored period. A linear closure projection cannot be calculated while the wound is expanding or unchanged.
                    Professional clinical evaluation by a certified wound care specialist is recommended.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Supporting Factors */}
          <div style={{ marginBottom: '14px' }}>
            <strong
              style={{
                fontSize: '12px',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                letterSpacing: '0.04em',
                display: 'block',
                marginBottom: '8px',
              }}
            >
              Supporting Factors & Observations:
            </strong>
            <ul className="results-list">
              {supportingFactors.map((factor, idx) => (
                <li key={idx}>
                  <CheckCircle2 size={15} className="list-icon text-teal" />
                  <span>{renderHighlightedText(factor)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Limitations */}
          {healingLimitations.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <strong
                style={{
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  letterSpacing: '0.04em',
                  display: 'block',
                  marginBottom: '8px',
                }}
              >
                Model Limitations & Nuances:
              </strong>
              <ul className="results-list">
                {healingLimitations.map((lim, idx) => (
                  <li key={idx}>
                    <Info size={15} className="list-icon text-amber" />
                    <span>{renderHighlightedText(lim)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Disclaimer */}
          <p className="risk-disclaimer-note" style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <strong>Healing Rate Notice:</strong>{' '}
            {response.healing_disclaimer ||
              'Linear pixel projections are experimental software benchmarks and must not be interpreted as guaranteed medical forecasts.'}
          </p>
        </section>

        {/* ================================================================= */}
        {/* STRICT ORDER SECTION 3: WOUND PROGRESS GRAPH (THIRD)             */}
        {/* ================================================================= */}
        <section
          className="results-chart-section"
          style={{
            background: '#ffffff',
            border: '1px solid var(--border-subtle)',
            borderRadius: '18px',
            padding: '28px',
            marginBottom: '28px',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <LineChartIcon size={20} className="text-teal" />
                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-title)' }}>
                  3. Wound Progress Graph <strong style={{ fontWeight: 800, color: '#0d9488' }}>(Area px)</strong>
                </h2>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                Chronological wound area trajectory recorded across {chartData.length} photographic visit(s) for record{' '}
                <strong>{effectiveWoundId}</strong>.
              </p>
            </div>

            {/* Quick Action: Upload follow-up image */}
            <Link
              to={`/test-wound?wound=${encodeURIComponent(effectiveWoundId)}`}
              className="btn btn-primary"
              style={{
                padding: '9px 18px',
                fontSize: '13px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <PlusCircle size={15} />
              <span>Add Follow-up Photo</span>
            </Link>
          </div>

          {/* GRAPH CANVAS - ALWAYS DISPLAYED OF AREA PX */}
          <div>
            {/* Quick trend summary banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#f8fafc',
                padding: '12px 18px',
                borderRadius: '10px',
                border: '1px solid var(--border-subtle)',
                marginBottom: '18px',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700 }}>BASELINE:</span>
                <strong style={{ fontSize: '13.5px', fontWeight: 800, color: '#0d9488' }}>
                  {formatNumber(progressChartData[0]?.area ?? response.wound_area_px ?? 0)} px
                </strong>
                <span style={{ color: '#94a3b8' }}>➔</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700 }}>
                  {chartData.length >= 2 ? 'LATEST:' : 'PROJECTED CLOSURE:'}
                </span>
                <strong style={{ fontSize: '13.5px', fontWeight: 800, color: chartData.length >= 2 ? '#0d9488' : '#0369a1' }}>
                  {chartData.length >= 2
                    ? `${formatNumber(chartData[chartData.length - 1].area)} px`
                    : '0 px (Full Closure)'}
                </strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {typeof response.area_change_percent === 'number' && (
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      fontWeight: 800,
                      background: response.area_change_percent < 0 ? '#ecfdf5' : '#fffbeb',
                      color: response.area_change_percent < 0 ? '#047857' : '#b45309',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {response.area_change_percent < 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                    <span>{response.area_change_percent}% total change</span>
                  </span>
                )}
                {typeof response.pixel_reduction_rate_px_per_day === 'number' && (
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      fontWeight: 800,
                      background: '#e0f2fe',
                      color: '#0369a1',
                    }}
                  >
                    {response.pixel_reduction_rate_px_per_day} px/day reduction
                  </span>
                )}
                {chartData.length <= 1 && (
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      fontWeight: 800,
                      background: '#e0f2fe',
                      color: '#0369a1',
                    }}
                  >
                    Baseline & Trajectory Target
                  </span>
                )}
              </div>
            </div>

            {/* Recharts Area Chart of Area (px) */}
            <div className="results-chart-wrap" style={{ height: '280px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={progressChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="resultsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#0d9488" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                    tickFormatter={(v) => `${Math.round(v / 1000)}k px`}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1.5px solid #cbd5e1',
                      boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15)',
                      background: '#ffffff',
                      fontWeight: 700,
                    }}
                    formatter={(val) => [`${formatNumber(Number(val))} px`, 'Wound Area (px)']}
                  />
                  <Area
                    type="monotone"
                    dataKey="area"
                    stroke="#0d9488"
                    strokeWidth={3}
                    fill="url(#resultsGrad)"
                    dot={{ r: 6, fill: '#0d9488', stroke: '#ffffff', strokeWidth: 2 }}
                    activeDot={{ r: 8, fill: '#0d9488', stroke: '#ffffff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Single Baseline informative note beneath graph when 1 visit */}
            {chartData.length <= 1 && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  background: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <History size={22} className="text-teal" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    <strong>Single Baseline Measurement Recorded:</strong> Current area plotted at{' '}
                    <strong style={{ color: '#0d9488' }}>
                      {formatNumber(response.wound_area_px ?? 0)} px
                    </strong>
                    . A sequential reduction rate (px/day) will be calculated once you upload your second photograph.
                  </span>
                </div>
                <Link
                  to={`/test-wound?wound=${encodeURIComponent(effectiveWoundId)}`}
                  className="btn btn-outline"
                  style={{ padding: '7px 16px', fontSize: '12.5px', fontWeight: 700 }}
                >
                  Add Follow-up Photo
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* ================================================================= */}
        {/* STRICT ORDER SECTION 4: SEGMENTATION & DETAILED MEASUREMENTS (4th) */}
        {/* ================================================================= */}
        <section
          style={{
            background: '#ffffff',
            border: '1px solid var(--border-subtle)',
            borderRadius: '18px',
            padding: '28px',
            marginBottom: '28px',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-title)' }}>
                4. Segmentation & Detailed Measurements
              </h2>
              <p style={{ fontSize: '12.5px', margin: '2px 0 0', color: 'var(--text-muted)' }}>
                Inspect the trained PyTorch U-Net binary mask contour overlay and quantitative 2D dimensions.
              </p>
            </div>

            {/* View Mode Switcher */}
            <div className="view-mode-toggles">
              <button
                type="button"
                className={`toggle-btn ${viewMode === 'overlay' ? 'active' : ''}`}
                onClick={() => setViewMode('overlay')}
              >
                Overlay View
              </button>
              <button
                type="button"
                className={`toggle-btn ${viewMode === 'side-by-side' ? 'active' : ''}`}
                onClick={() => setViewMode('side-by-side')}
              >
                Side-by-Side
              </button>
            </div>
          </div>

          {/* Primary Quantitative Dimensions Grid */}
          <div className="metrics-summary-grid" style={{ marginBottom: '24px' }}>
            <div className="metric-card">
              <span className="metric-label">Calculated Area (Pixels)</span>
              <strong className="metric-value">
                {typeof response.wound_area_px === 'number'
                  ? `${formatNumber(response.wound_area_px)}`
                  : 'Unavailable'}
                <small> px</small>
              </strong>
              <span className="metric-sub">Direct 2D pixel contour sum</span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Physical Calibrated Area</span>
              <strong className="metric-value">
                {typeof response.wound_area_cm2 === 'number' ? (
                  <>
                    {formatNumber(response.wound_area_cm2)} <small>cm²</small>
                  </>
                ) : (
                  <span className="text-muted">Unavailable</span>
                )}
              </strong>
              <span className="metric-sub">
                {typeof response.wound_area_cm2 === 'number'
                  ? 'Calibrated metric scale detected'
                  : 'Scale marker absent · physical area disabled'}
              </span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Area Delta vs Baseline</span>
              <strong className="metric-value">
                {typeof response.area_change_percent === 'number' ? (
                  <span className={response.area_change_percent < 0 ? 'text-emerald' : 'text-amber'}>
                    {response.area_change_percent > 0 ? '+' : ''}
                    {formatNumber(response.area_change_percent)}%
                  </span>
                ) : (
                  <span className="text-muted">Baseline Record</span>
                )}
              </strong>
              <span className="metric-sub">
                {typeof response.area_change_percent === 'number'
                  ? 'Longitudinal percentage change'
                  : 'First recorded visit for this wound'}
              </span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Trajectory Assessment</span>
              <strong className="metric-value">
                <span className={`trajectory-text ${response.trajectory || ''}`}>
                  {titleCase(response.trajectory || 'Unavailable')}
                </span>
              </strong>
              <span className="metric-sub">
                {response.trajectory === 'improving'
                  ? 'Contracting boundary footprint'
                  : response.trajectory === 'worsening'
                  ? 'Expanding perimeter footprint'
                  : 'Comparative progression signal'}
              </span>
            </div>
          </div>

          {/* Opacity slider for overlay mode */}
          {viewMode === 'overlay' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                Mask Opacity: {maskOpacity}%
              </span>
              <input
                type="range"
                min="0"
                max="100"
                value={maskOpacity}
                onChange={(e) => setMaskOpacity(Number(e.target.value))}
                style={{ width: '140px', cursor: 'pointer' }}
              />
            </div>
          )}

          {/* VISUAL VIEWER STAGE */}
          {viewMode === 'overlay' ? (
            <div className="viewer-stage overlay-stage">
              {imageUrl ? (
                <div className="overlay-wrapper">
                  <img src={imageUrl} alt="Original wound photograph" className="base-viewer-img" />
                  {maskDataUrl ? (
                    <div
                      className="mask-real-overlay"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        opacity: maskOpacity / 100,
                        backgroundColor: '#0ea5e9',
                        WebkitMaskImage: `url(${maskDataUrl})`,
                        maskImage: `url(${maskDataUrl})`,
                        WebkitMaskSize: 'contain',
                        maskSize: 'contain',
                        WebkitMaskRepeat: 'no-repeat',
                        maskRepeat: 'no-repeat',
                        WebkitMaskPosition: 'center',
                        maskPosition: 'center',
                        pointerEvents: 'none',
                        filter: 'drop-shadow(0 0 14px rgba(14, 165, 233, 0.9))',
                      }}
                    />
                  ) : (
                    <div
                      className="mask-layer-simulation"
                      style={{
                        opacity: maskOpacity / 100,
                      }}
                    />
                  )}
                </div>
              ) : (
                <div className="empty-image-box">
                  <AlertCircle size={28} />
                  <span>No image was preserved for this analysis session.</span>
                </div>
              )}
            </div>
          ) : (
            /* Side-by-side viewer */
            <div className="viewer-stage side-by-side-stage">
              <div className="side-card">
                <div className="side-card-header">Original Photograph</div>
                {imageUrl ? (
                  <img src={imageUrl} alt="Original wound photograph" className="side-img" />
                ) : (
                  <div className="empty-image-box">No original image</div>
                )}
              </div>

              <div className="side-card">
                <div className="side-card-header">
                  <span>Binary Segmentation Mask</span>
                  <span className="tag-pill">U-NET MASK</span>
                </div>
                {maskDataUrl ? (
                  <div className="mask-sim-container" style={{ background: '#0b1320', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={maskDataUrl} alt="Binary segmentation mask" className="side-img" style={{ objectFit: 'contain' }} />
                  </div>
                ) : imageUrl ? (
                  <div className="mask-sim-container">
                    <img src={imageUrl} alt="Mask background" className="side-img grayscale" />
                    <div className="mask-tint-overlay" />
                  </div>
                ) : (
                  <div className="empty-image-box">No mask available</div>
                )}
              </div>
            </div>
          )}

          {/* Model Explanation & Algorithmic Notes */}
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
            <strong
              style={{
                fontSize: '12px',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                letterSpacing: '0.04em',
                display: 'block',
                marginBottom: '8px',
              }}
            >
              Model Explanation & Algorithmic Notes:
            </strong>
            <ul className="results-list">
              {explanations.map((item, idx) => (
                <li key={idx}>
                  <CheckCircle2 size={15} className="list-icon text-teal" />
                  <span>{typeof item === 'string' ? item : item.title || item.detail || item.text}</span>
                </li>
              ))}
            </ul>
            {warnings.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <strong
                  style={{
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    letterSpacing: '0.04em',
                    display: 'block',
                    marginBottom: '8px',
                  }}
                >
                  Algorithmic Warnings & Research Disclosures:
                </strong>
                <ul className="results-list">
                  {warnings.map((w, idx) => (
                    <li key={idx}>
                      <Info size={15} className="list-icon text-amber" />
                      <span>{typeof w === 'string' ? w : w.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* Export Report Action Row */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '32px' }}>
          <button
            type="button"
            onClick={exportReport}
            className="btn btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '13.5px', fontWeight: 700 }}
          >
            <Download size={16} />
            <span>Export Quantitative Report (.txt)</span>
          </button>
        </div>

        {/* Global Medical Disclaimer Banner */}
        <MedicalDisclaimer />
      </div>
    </div>
  )
}
