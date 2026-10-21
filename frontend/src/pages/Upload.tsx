import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, ArrowRight, CheckCircle2, FileImage, ImagePlus, LoaderCircle, RotateCcw, UploadCloud, X } from 'lucide-react'
import type { AnalysisResponse, ClinicalData } from '../types/analysis'
import type { Patient } from '../types/patient'
import { analyzeWound, getApiError } from '../services/api'
import AnalysisPanel from '../components/AnalysisPanel'

export default function Upload({ patients, onSaveVisit, mode }: { patients: Patient[]; onSaveVisit: (patientId: string, visit: Patient['visits'][number]) => void; mode: 'demo' | 'api' }) {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [patientId, setPatientId] = useState(params.get('patient') || '')
  const [visitDate, setVisitDate] = useState(new Date().toISOString().slice(0,10))
  const [duration, setDuration] = useState('')
  const [location, setLocation] = useState('')
  const [diabetes, setDiabetes] = useState('Unknown')
  const [smoking, setSmoking] = useState('Unknown')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResponse | null>(null)
  const [resultImage, setResultImage] = useState('')
  const selected = patients.find((p) => p.id === patientId)
  useEffect(() => {
    if (!selected) return
    setDuration(selected.woundDuration)
    setLocation(selected.woundLocation)
    setDiabetes(selected.diabetesStatus)
    setSmoking(selected.smokingStatus)
  }, [patientId]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (preview.startsWith('blob:')) URL.revokeObjectURL(preview) }, [preview])
  const canAnalyze = Boolean(file && patientId && visitDate && !loading)
  const fileSize = useMemo(() => file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : '', [file])
  function chooseFile(next: File | undefined) {
    setError(''); setResult(null)
    if (!next) return
    if (!['image/jpeg','image/png','image/webp'].includes(next.type)) { setError('Choose a JPEG, PNG or WebP image.'); return }
    if (next.size > 10 * 1024 * 1024) { setError('The image is larger than 10 MB. Choose a smaller image.'); return }
    setFile(next); setPreview(URL.createObjectURL(next))
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !selected) { setError('Choose an image and a patient record before continuing.'); return }
    setError(''); setLoading(true); setProgress(0); setResult(null)
    const clinicalData: ClinicalData = { patient_id: patientId, visit_date: visitDate, wound_location: location || undefined, wound_duration: duration || undefined, age_range: selected.ageRange, diabetes_status: diabetes, smoking_status: smoking, notes: notes || undefined }
    try {
      if (mode === 'demo') {
        setError('Demo mode is enabled. No AI inference was performed. Switch VITE_APP_MODE=api to submit this image to the FastAPI backend.')
        return
      }
      const response = await analyzeWound(file, clinicalData, setProgress)
      setResult(response); setResultImage(preview)
      onSaveVisit(patientId, { id: `API-${Date.now().toString().slice(-6)}`, date: visitDate, woundAreaPx: typeof response.wound_area_px === 'number' ? response.wound_area_px : null, woundAreaCm2: typeof response.wound_area_cm2 === 'number' ? response.wound_area_cm2 : null, notes: notes || 'API analysis visit', imageUrl: preview, source: 'api' })
    } catch (err) { setError(getApiError(err)) } finally { setLoading(false) }
  }
  function reset() { setFile(null); setPreview(''); setResult(null); setError(''); setProgress(0) }
  return <div className="page-stack"><div className="page-toolbar"><div><h2>New wound analysis</h2><p>Prepare a visit image and the available clinical context.</p></div><div className="secure-note"><span/> Local preview · secure API transfer</div></div>
    {mode === 'demo' && <div className="demo-notice compact"><span className="demo-notice-icon"><ImagePlus size={18}/></span><div><strong>Demo mode — analysis disabled</strong><p>You can test the upload workflow and image preview. No predictions are generated or implied.</p></div></div>}
    <form onSubmit={submit} className="upload-layout"><div className="upload-main"><section className="panel upload-panel"><div className="panel-heading"><div><h3><span className="step-number">1</span> Upload wound image</h3><p>Use a clear, well-lit image. Avoid identifiable features.</p></div><span className="optional-tag">REQUIRED</span></div>
      {!file ? <label className="dropzone" htmlFor="wound-file"><input id="wound-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e)=>chooseFile(e.target.files?.[0])}/><div className="dropzone-icon"><UploadCloud size={25}/></div><strong>Choose a wound image</strong><span>Drag and drop is not required — browse your device</span><span className="file-types">JPEG, PNG or WebP · Max 10 MB</span><span className="browse-button">Browse files</span></label> : <div className="preview-card"><img src={preview} alt="Preview of selected wound image"/><div className="preview-info"><div className="preview-file-icon"><FileImage size={18}/></div><div><strong>{file.name}</strong><span>{fileSize} · Ready to submit</span></div><button className="icon-button" type="button" onClick={reset} aria-label="Remove selected image"><X size={18}/></button></div></div>}
      {error && <div className={`form-alert ${error.startsWith('Demo mode') ? 'info-alert' : ''}`} role="alert"><AlertCircle size={17}/><span>{error}</span></div>}
      {loading && <div className="upload-progress"><div className="progress-label"><span><LoaderCircle size={15}/> Sending image to model service…</span><strong>{progress}%</strong></div><div className="progress-track"><span style={{width:`${progress}%`}}/></div></div>}
    </section>
    <section className="panel"><div className="panel-heading"><div><h3><span className="step-number">2</span> Visit details</h3><p>Only include metadata available for this visit.</p></div></div><div className="form-grid"><label>Patient record <span className="required">*</span><select required value={patientId} onChange={(e)=>setPatientId(e.target.value)}><option value="">Select patient ID</option>{patients.map((p)=><option key={p.id} value={p.id}>{p.id} · {p.woundLocation}</option>)}</select></label><label>Visit date <span className="required">*</span><input type="date" required value={visitDate} onChange={(e)=>setVisitDate(e.target.value)}/></label><label>Wound location<select value={location} onChange={(e)=>setLocation(e.target.value)}><option value="">Not specified</option><option>Lower leg</option><option>Foot</option><option>Heel</option><option>Hand</option><option>Forearm</option><option>Torso</option><option>Other</option></select></label><label>Wound duration<select value={duration} onChange={(e)=>setDuration(e.target.value)}><option value="">Unknown</option><option>Under 1 week</option><option>1–2 weeks</option><option>3–4 weeks</option><option>5–6 weeks</option><option>7+ weeks</option></select></label><label>Diabetes status<select value={diabetes} onChange={(e)=>setDiabetes(e.target.value)}><option>Unknown</option><option>Yes</option><option>No</option></select></label><label>Smoking status<select value={smoking} onChange={(e)=>setSmoking(e.target.value)}><option>Unknown</option><option>Never</option><option>Former</option><option>Current</option></select></label><label className="span-two">Visit notes <span className="optional-label">Optional</span><textarea rows={3} value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="Add concise, de-identified notes relevant to this visit…"/></label></div></section>
    <div className="form-submit-row"><span><span className="required">*</span> Required fields</span><button type="submit" className="primary-button" disabled={!canAnalyze}>{loading ? <><LoaderCircle size={17} className="spin"/> Analyzing…</> : mode === 'demo' ? <><ImagePlus size={17}/> Test upload workflow</> : <>Analyze wound <ArrowRight size={17}/></>}</button></div>
    </div><aside className="upload-aside"><div className="aside-info-card"><div className="aside-info-icon"><CheckCircle2 size={20}/></div><h3>Before you begin</h3><ul><li>Use a sharp, well-lit image with the wound in focus.</li><li>Keep camera distance and angle as consistent as possible between visits.</li><li>Include a scale reference if calibrated area is needed.</li><li>Do not include names, faces or other identifying details.</li></ul></div><div className="aside-info-card muted-aside"><div className="aside-info-icon blue"><AlertCircle size={20}/></div><h3>Research use only</h3><p>Outputs depend on image quality, available history and model limitations. They are not a diagnosis and should not replace professional assessment.</p></div>{selected && <div className="selected-patient-card"><span className="eyebrow">SELECTED RECORD</span><strong>{selected.id}</strong><span>{selected.woundLocation} · {selected.woundDuration}</span><span>{selected.visits.length} previous {selected.visits.length===1?'visit':'visits'}</span><button type="button" className="text-link" onClick={()=>navigate(`/patients/${selected.id}`)}>View record <ArrowRight size={14}/></button></div>}</aside></form>
    {result && <section className="panel result-panel"><div className="panel-heading"><div><h3><CheckCircle2 size={18}/> Analysis response received</h3><p>Returned fields are shown as provided by the backend.</p></div><button className="secondary-button" onClick={reset}><RotateCcw size={15}/> New analysis</button></div><AnalysisPanel result={result} imageUrl={resultImage}/></section>}
    <p className="page-disclaimer">Image submission sends the selected image and clinical metadata to the configured API in API mode. Use only data you are authorized to process.</p>
  </div>
}