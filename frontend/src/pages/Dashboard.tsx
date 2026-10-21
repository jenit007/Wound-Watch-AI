import { useMemo } from 'react'
import { Activity, ArrowRight, CalendarDays, CircleAlert, Clock3, Plus, Users, WandSparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import StatCard from '../components/StatCard'
import EmptyState from '../components/EmptyState'
import type { Patient } from '../types/patient'
import { formatDate, formatNumber } from '../utils/format'

export default function Dashboard({ patients, mode, apiStatus }: { patients: Patient[]; mode: 'demo' | 'api'; apiStatus: 'checking' | 'online' | 'offline' | 'not-checked' }) {
  const visits = patients.reduce((sum, patient) => sum + patient.visits.length, 0)
  const active = patients.filter((p) => p.status === 'Monitoring').length
  const recent = useMemo(() => patients.flatMap((p) => p.visits.map((v) => ({ ...v, patientId: p.id, location: p.woundLocation }))).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5), [patients])
  const chartData = useMemo(() => {
    const grouped = new Map<string, { date: string; area: number[] }>()
    patients.forEach((p) => p.visits.forEach((v) => {
      if (typeof v.woundAreaPx !== 'number') return
      const item = grouped.get(v.date) || { date: v.date, area: [] }
      item.area.push(v.woundAreaPx)
      grouped.set(v.date, item)
    }))
    return [...grouped.values()].sort((a, b) => a.date.localeCompare(b.date)).map((item) => ({ date: new Date(`${item.date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), area: Math.round(item.area.reduce((a, b) => a + b, 0) / item.area.length) }))
  }, [patients])
  const now = new Date()
  const dayLabel = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  return <div className="page-stack">
    <div className="welcome-row"><div><div className="eyebrow">{dayLabel}</div><h2>{greeting} <span className="wave">✳</span></h2><p>Here's what's happening across your monitoring workspace.</p></div><Link className="primary-button" to="/test-wound"><Plus size={17}/> New analysis</Link></div>
    {mode === 'demo' && <div className="demo-notice"><span className="demo-notice-icon"><WandSparkles size={18}/></span><div><strong>You're exploring demo data</strong><p>All patient records and measurements are synthetic examples. No AI inference has been run in demo mode.</p></div><span className="demo-label">SYNTHETIC</span></div>}
    {mode === 'api' && <div className={`api-status-banner ${apiStatus}`}><span className="status-pulse"/><div><strong>{apiStatus === 'online' ? 'Backend connected' : apiStatus === 'checking' ? 'Checking backend connection…' : 'Backend not connected'}</strong><p>{apiStatus === 'online' ? 'Analysis requests will be sent to the configured FastAPI server.' : apiStatus === 'checking' ? 'Checking /health at your configured API URL.' : 'You can still browse and manage local records. Analysis requires the FastAPI server.'}</p></div></div>}
    <div className="stats-grid"><StatCard label="Patient records" value={patients.length.toString().padStart(2, '0')} detail="Records in this workspace" icon={<Users size={20}/>} tone="teal"/><StatCard label="Active monitoring" value={active.toString().padStart(2, '0')} detail="Marked for follow-up" icon={<Activity size={20}/>} tone="blue"/><StatCard label="Recorded visits" value={visits.toString().padStart(2, '0')} detail="Across all patient records" icon={<CalendarDays size={20}/>} tone="amber"/></div>
    <div className="dashboard-grid"><section className="panel trend-panel"><div className="panel-heading"><div><h3>Wound area trend</h3><p>Average area across recorded visits</p></div><span className="chart-legend"><i/> Area (px)</span></div>{chartData.length > 1 ? <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 12, right: 6, left: -12, bottom: 0 }}><defs><linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.35}/><stop offset="100%" stopColor="#0d9488" stopOpacity={0.02}/></linearGradient></defs><CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false}/><XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}/><YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`}/><Tooltip formatter={(value) => [`${formatNumber(Number(value))} px`, 'Average area']} contentStyle={{ borderRadius: 12, border: '1.5px solid #cbd5e1', boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15)', background: '#ffffff', fontWeight: 700 }}/><Area type="monotone" dataKey="area" stroke="#0d9488" strokeWidth={3} fill="url(#areaFill)" activeDot={{ r: 6, fill: '#0d9488', stroke: '#ffffff', strokeWidth: 2 }}/></AreaChart></ResponsiveContainer></div> : <EmptyState title="Not enough visit data" description="Record measurements across multiple visits to see a trend."/>}<div className="chart-footnote"><InfoIcon/> Measurements are shown in pixels unless a valid physical scale is available.</div></section>
    <section className="panel activity-panel"><div className="panel-heading"><div><h3>Recent activity</h3><p>Latest recorded patient visits</p></div><Link to="/history" className="text-link">View history <ArrowRight size={14}/></Link></div>{recent.length ? <div className="activity-list">{recent.map((v) => <div className="activity-item" key={v.id}><div className="activity-icon"><Clock3 size={17}/></div><div className="activity-main"><strong>{v.patientId}</strong><span>{v.location} · {formatDate(v.date)}</span></div><div className="activity-area">{formatNumber(v.woundAreaPx)} <small>px</small></div></div>)}</div> : <EmptyState title="No activity yet" description="Add a patient or upload an image to get started." action={<Link className="text-link" to="/test-wound">Start an analysis <ArrowRight size={14}/></Link>}/>}<Link to="/patients" className="secondary-button full-button">Browse patient records <ArrowRight size={15}/></Link></section></div>
    <div className="dashboard-bottom"><div className="bottom-tip"><div className="tip-icon"><CircleAlert size={18}/></div><div><strong>Keep the context in view</strong><p>Trends can be affected by image angle, lighting, scale calibration and clinical context. Avoid interpreting pixel changes in isolation.</p></div></div><div className="backend-card"><div className="backend-icon"><Activity size={19}/></div><div><strong>Analysis service</strong><span>{mode === 'demo' ? 'Demo mode · inference disabled' : apiStatus === 'online' ? 'Connected to FastAPI' : 'Waiting for backend'}</span></div><span className={`connection-dot ${apiStatus === 'online' ? 'connected' : ''}`}/></div></div>
  </div>
}
function InfoIcon() { return <span className="info-mini">i</span> }