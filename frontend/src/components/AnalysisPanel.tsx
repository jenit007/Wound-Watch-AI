import { AlertTriangle, CheckCircle2, CircleHelp, Info, ShieldAlert } from 'lucide-react'
import type { AnalysisResponse } from '../types/analysis'
import { formatNumber, titleCase } from '../utils/format'

function listText(item: unknown): string {
  if (typeof item === 'string') return item
  if (item && typeof item === 'object') {
    const value = item as { message?: string; detail?: string; text?: string; title?: string }
    return [value.title, value.detail || value.text || value.message].filter(Boolean).join(': ')
  }
  return String(item)
}
export default function AnalysisPanel({ result, imageUrl }: { result: AnalysisResponse; imageUrl?: string }) {
  const warnings = Array.isArray(result.warnings) ? result.warnings : []
  const explanations = Array.isArray(result.explanation) ? result.explanation : []
  const mask = typeof result.segmentation_mask_png_base64 === 'string' ? result.segmentation_mask_png_base64 : null
  const maskUrl = mask ? (mask.startsWith('data:') ? mask : `data:image/png;base64,${mask}`) : null
  const trajectory = typeof result.trajectory === 'string' ? result.trajectory : null
  const risk = typeof result.risk_level === 'string' ? result.risk_level : null
  const change = typeof result.area_change_percent === 'number' && Number.isFinite(result.area_change_percent) ? result.area_change_percent : null
  return <div className="analysis-result">
    <div className="section-heading"><div><span className="eyebrow">MODEL OUTPUT</span><h2>Analysis summary</h2></div><span className="model-chip"><span/> {result.model_status || 'Status unavailable'}</span></div>
    <div className="assessment-banner"><div className="assessment-symbol"><Info size={20}/></div><div><strong>Research assessment only</strong><p>These are model-generated outputs, not a diagnosis or treatment recommendation. Review alongside clinical judgement.</p></div></div>
    <div className="result-metrics">
      <div className="result-metric"><span>Wound area</span><strong>{formatNumber(typeof result.wound_area_px === 'number' ? result.wound_area_px : null)} <small>px</small></strong><p>Pixel area</p></div>
      <div className="result-metric"><span>Calibrated area</span><strong>{result.wound_area_cm2 == null ? '—' : <>{formatNumber(result.wound_area_cm2)} <small>cm²</small></>}</strong><p>{result.wound_area_cm2 == null ? 'Valid scale not available' : 'Physical area'}</p></div>
      <div className="result-metric"><span>Area change</span><strong className={change == null ? '' : change < 0 ? 'good-text' : change > 0 ? 'warn-text' : ''}>{change == null ? '—' : `${change > 0 ? '+' : ''}${formatNumber(change)}%`}</strong><p>Compared with prior visit</p></div>
    </div>
    <div className="image-comparison"><div className="image-result-card"><div className="image-card-title">Original image</div>{imageUrl ? <img src={imageUrl} alt="Uploaded wound image" /> : <div className="image-unavailable"><CircleHelp size={22}/><span>Image unavailable</span></div>}</div><div className="image-result-card"><div className="image-card-title">Segmentation overlay <span className="optional-tag">OPTIONAL</span></div>{maskUrl ? <img src={maskUrl} alt="Model segmentation mask overlay" /> : <div className="image-unavailable"><CircleHelp size={22}/><span>Model did not return a mask</span></div>}</div></div>
    <div className="result-grid"><div className="result-info-card"><h3><CheckCircle2 size={17}/> Trajectory assessment</h3><div className={`trajectory-value ${trajectory || ''}`}>{titleCase(trajectory)}</div><p>Model assessment across available visits. Insufficient history may limit this output.</p></div><div className="result-info-card"><h3><ShieldAlert size={17}/> Risk-level assessment</h3><div className={`risk-value ${risk || ''}`}>{titleCase(risk)}</div><p>Not a calibrated medical probability. Risk score: {typeof result.risk_score === 'number' ? formatNumber(result.risk_score) : 'Unavailable'}.</p></div></div>
    <div className="detail-card"><h3><Info size={17}/> Explainability</h3>{explanations.length ? <ul className="explanation-list">{explanations.map((item, i) => <li key={i}>{listText(item)}</li>)}</ul> : <p className="muted">The model did not provide explanation details for this result.</p>}</div>
    <div className={`warning-card ${warnings.length ? 'has-warnings' : ''}`}><h3><AlertTriangle size={17}/> Model warnings</h3>{warnings.length ? <ul>{warnings.map((warning, i) => <li key={i}>{listText(warning)}</li>)}</ul> : <p className="muted">No warnings were returned by the API. This does not confirm that the wound is safe or risk-free.</p>}</div>
    {result.request_id && <p className="request-id">Request ID: <code>{result.request_id}</code></p>}
  </div>
}