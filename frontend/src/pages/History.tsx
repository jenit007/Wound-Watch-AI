import { useMemo, useState } from 'react'
import { Download, FileDown, FileSpreadsheet, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Patient } from '../types/patient'
import { formatDate, formatNumber } from '../utils/format'
export default function History({ patients, mode }: { patients: Patient[]; mode: 'demo' | 'api' }) {
  const [search, setSearch] = useState('')
  const rows = useMemo(() => patients.flatMap((p) => p.visits.map((v) => ({ ...v, patientId: p.id, location: p.woundLocation, patientSource: p.source }))).filter((v) => v.patientId.toLowerCase().includes(search.toLowerCase()) || v.location.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>b.date.localeCompare(a.date)), [patients, search])
  function exportCsv() {
    const headers = ['patient_id','visit_id','visit_date','wound_location','wound_area_px','wound_area_cm2','notes','record_source']
    const quote = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const csv = [headers.join(','), ...rows.map((r) => [r.patientId,r.id,r.date,r.location,r.woundAreaPx,r.woundAreaCm2,r.notes,r.source].map(quote).join(','))].join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const a = document.createElement('a'); a.href = url; a.download = 'woundwatch-visit-history.csv'; a.click(); URL.revokeObjectURL(url)
  }
  function exportReport() {
    const report = ['WoundWatch AI — Visit history report', `Generated: ${new Date().toLocaleString()}`, `Mode: ${mode === 'demo' ? 'Demo / synthetic records' : 'API mode / local records'}`, 'Research prototype only — not for diagnosis or treatment decisions.', '', ...rows.map((r) => `${r.patientId} | ${formatDate(r.date)} | ${r.location} | area: ${formatNumber(r.woundAreaPx)} px | calibrated: ${r.woundAreaCm2 == null ? 'unavailable' : `${formatNumber(r.woundAreaCm2)} cm²`} | ${r.notes}`)]
    const url = URL.createObjectURL(new Blob([report.join('\n')], { type: 'text/plain;charset=utf-8;' }))
    const a = document.createElement('a'); a.href = url; a.download = 'woundwatch-visit-report.txt'; a.click(); URL.revokeObjectURL(url)
  }
  return <div className="page-stack"><div className="page-toolbar"><div><h2>Reports & history</h2><p>Explore visit measurements and export a copy for research review.</p></div><div className="toolbar-buttons"><button className="secondary-button" onClick={exportReport}><FileDown size={16}/> Export report</button><button className="primary-button" onClick={exportCsv}><Download size={16}/> Export CSV</button></div></div>{mode === 'demo' && <div className="inline-note"><span className="demo-dot"/> Demo visits contain synthetic measurements, not real patient data or actual model outputs.</div>}
    <div className="history-summary"><div><span>Visits in view</span><strong>{rows.length}</strong></div><div><span>Patient records</span><strong>{new Set(rows.map((r)=>r.patientId)).size}</strong></div><div><span>Calibrated measurements</span><strong>{rows.filter((r)=>r.woundAreaCm2!=null).length}</strong></div></div>
    <div className="table-panel"><div className="table-toolbar"><div className="search-field"><Search size={17}/><input aria-label="Search visit history" placeholder="Search patient ID or location…" value={search} onChange={(e)=>setSearch(e.target.value)}/></div><div className="export-hint"><FileSpreadsheet size={16}/> CSV is ready for spreadsheet tools</div></div>{rows.length ? <div className="table-scroll"><table><thead><tr><th>Visit date</th><th>Patient</th><th>Wound location</th><th>Area (px)</th><th>Area (cm²)</th><th>Source</th><th/></tr></thead><tbody>{rows.map((r)=><tr key={`${r.patientId}-${r.id}`}><td>{formatDate(r.date)}</td><td><Link className="patient-id" to={`/patients/${r.patientId}`}>{r.patientId}</Link></td><td>{r.location}</td><td>{formatNumber(r.woundAreaPx)}</td><td>{formatNumber(r.woundAreaCm2)}</td><td><span className={`source-tag ${r.source}`}>{r.source === 'demo' ? 'Synthetic demo' : 'Recorded'}</span></td><td><Link className="small-link" to={`/patients/${r.patientId}`}>View</Link></td></tr>)}</tbody></table></div> : <div className="history-empty"><FileClockIcon/><h3>No visits found</h3><p>When a patient has visit measurements, they will appear here.</p></div>}<div className="table-foot"><span>{rows.length} visit records</span><span>Null values remain unavailable; they are not estimated.</span></div></div>
    <div className="report-note"><div className="report-note-icon"><FileDown size={19}/></div><div><strong>Exports include available fields only</strong><p>CSV and text reports preserve missing measurements as blank or unavailable. They do not contain image files, explainability overlays or medical recommendations.</p></div></div>
  </div>
}
function FileClockIcon(){return <span className="history-empty-icon"><FileSpreadsheet size={25}/></span>}