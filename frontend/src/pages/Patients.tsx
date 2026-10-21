import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, SlidersHorizontal, X } from 'lucide-react'
import type { Patient } from '../types/patient'
import EmptyState from '../components/EmptyState'
import { formatDate } from '../utils/format'

type Props = { patients: Patient[]; onAdd: (patient: Patient) => void; onUpdate: (patient: Patient) => void; onDelete: (id: string) => void; mode: 'demo' | 'api' }
export default function Patients({ patients, onAdd, onUpdate, onDelete, mode }: Props) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All statuses')
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [location, setLocation] = useState('Lower leg')
  const [duration, setDuration] = useState('1–2 weeks')
  const [age, setAge] = useState('50–59')
  const [diabetes, setDiabetes] = useState<'Yes'|'No'|'Unknown'>('Unknown')
  const [smoking, setSmoking] = useState<'Current'|'Former'|'Never'|'Unknown'>('Unknown')
  const [sex, setSex] = useState('Not specified')
  const filtered = useMemo(() => patients.filter((p) => (p.id.toLowerCase().includes(query.toLowerCase()) || p.woundLocation.toLowerCase().includes(query.toLowerCase())) && (status === 'All statuses' || p.status === status)), [patients, query, status])
  function submit(e: React.FormEvent) {
    e.preventDefault()
    const existing = patients.find((p) => p.id === editingId)
    if (existing) {
      onUpdate({ ...existing, ageRange: age, sex, woundLocation: location, woundDuration: duration, diabetesStatus: diabetes, smokingStatus: smoking })
    } else {
      const next = Math.max(0, ...patients.map((p) => Number(p.id.replace('WW-', '')) || 0)) + 1
      onAdd({ id: `WW-${String(next).padStart(4, '0')}`, ageRange: age, sex, woundLocation: location, woundDuration: duration, diabetesStatus: diabetes, smokingStatus: smoking, status: 'Monitoring', createdAt: new Date().toISOString().slice(0,10), source: 'local', visits: [] })
    }
    setShowAdd(false); setEditingId(null)
  }
  return <div className="page-stack"><div className="page-toolbar"><div><h2>Patient records</h2><p>De-identified records for wound monitoring and research.</p></div><button className="primary-button" onClick={() => { setEditingId(null); setAge('50–59'); setSex('Not specified'); setLocation('Lower leg'); setDuration('1–2 weeks'); setDiabetes('Unknown'); setSmoking('Unknown'); setShowAdd(true) }}><Plus size={17}/> Add patient</button></div>
    {mode === 'demo' && <div className="inline-note"><span className="demo-dot"/> Synthetic sample records are shown. New records are stored locally for this session.</div>}
    <div className="table-panel"><div className="table-toolbar"><div className="search-field"><Search size={17}/><input aria-label="Search patients" placeholder="Search by patient ID or wound location…" value={query} onChange={(e) => setQuery(e.target.value)}/>{query && <button onClick={() => setQuery('')} aria-label="Clear search"><X size={15}/></button>}</div><label className="filter-field"><SlidersHorizontal size={16}/><select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"><option>All statuses</option><option>Monitoring</option><option>Review needed</option><option>Completed</option></select></label></div>
      {filtered.length ? <div className="table-scroll"><table><thead><tr><th>Patient ID</th><th>Wound location</th><th>Duration</th><th>Last visit</th><th>Visits</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{filtered.map((p) => <tr key={p.id}><td><Link className="patient-id" to={`/patients/${p.id}`}>{p.id}</Link><span className="patient-sub">{p.ageRange} · {p.sex}</span></td><td>{p.woundLocation}</td><td>{p.woundDuration}</td><td>{p.visits.length ? formatDate(p.visits[p.visits.length-1].date) : 'No visits yet'}</td><td><span className="visit-count">{p.visits.length}</span></td><td><span className={`status-badge ${p.status.toLowerCase().replace(' ', '-')}`}>{p.status}</span></td><td><div className="row-actions"><Link className="small-link" to={`/patients/${p.id}`}>View</Link>{p.source === 'local' && <><button className="small-link" onClick={() => { setEditingId(p.id); setAge(p.ageRange); setSex(p.sex); setLocation(p.woundLocation); setDuration(p.woundDuration); setDiabetes(p.diabetesStatus); setSmoking(p.smokingStatus); setShowAdd(true) }}>Edit</button><button className="small-delete" onClick={() => { if (window.confirm(`Delete local record ${p.id}?`)) onDelete(p.id) }} aria-label={`Delete ${p.id}`}>Delete</button></>}</div></td></tr>)}</tbody></table></div> : <EmptyState title="No matching records" description="Try another search or adjust the status filter." action={<button className="secondary-button" onClick={() => {setQuery('');setStatus('All statuses')}}>Clear filters</button>}/>}
      <div className="table-foot"><span>Showing {filtered.length} of {patients.length} records</span><span>Identifiers are synthetic</span></div>
    </div>
    {showAdd && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => {if(e.target===e.currentTarget)setShowAdd(false)}}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="add-patient-title"><div className="modal-heading"><div><span className="eyebrow">NEW RECORD</span><h2 id="add-patient-title">{editingId ? `Edit ${editingId}` : 'Add patient record'}</h2></div><button className="icon-button" onClick={() => setShowAdd(false)} aria-label="Close"><X size={19}/></button></div><p className="modal-copy">Use a synthetic ID and avoid names, contact details or other direct identifiers.</p><form onSubmit={submit}><div className="form-grid"><label>Age range<select value={age} onChange={(e)=>setAge(e.target.value)}><option>Under 18</option><option>18–29</option><option>30–39</option><option>40–49</option><option>50–59</option><option>60–69</option><option>70–79</option><option>80+</option><option>Unknown</option></select></label><label>Sex (optional)<select value={sex} onChange={(e)=>setSex(e.target.value)}><option>Not specified</option><option>Female</option><option>Male</option><option>Intersex</option><option>Prefer not to say</option></select></label><label>Wound location<select value={location} onChange={(e)=>setLocation(e.target.value)}><option>Lower leg</option><option>Foot</option><option>Heel</option><option>Hand</option><option>Forearm</option><option>Torso</option><option>Other</option><option>Unknown</option></select></label><label>Wound duration<select value={duration} onChange={(e)=>setDuration(e.target.value)}><option>Under 1 week</option><option>1–2 weeks</option><option>3–4 weeks</option><option>5–6 weeks</option><option>7+ weeks</option><option>Unknown</option></select></label><label>Diabetes status<select value={diabetes} onChange={(e)=>setDiabetes(e.target.value as typeof diabetes)}><option>Unknown</option><option>Yes</option><option>No</option></select></label><label>Smoking status<select value={smoking} onChange={(e)=>setSmoking(e.target.value as typeof smoking)}><option>Unknown</option><option>Never</option><option>Former</option><option>Current</option></select></label></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => { setShowAdd(false); setEditingId(null) }}>Cancel</button><button type="submit" className="primary-button"><Plus size={16}/> {editingId ? 'Save changes' : 'Create record'}</button></div></form></section></div>}
  </div>
}