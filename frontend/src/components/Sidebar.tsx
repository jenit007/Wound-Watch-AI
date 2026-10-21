import { Activity, FileClock, LayoutDashboard, Plus, ShieldCheck, Users, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'

type Props = { open: boolean; onClose: () => void; mode: 'demo' | 'api' }
const links = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/patients', label: 'Patient records', icon: Users },
  { to: '/upload', label: 'Image analysis', icon: Plus },
  { to: '/history', label: 'Reports & history', icon: FileClock },
]
export default function Sidebar({ open, onClose, mode }: Props) {
  return <>
    {open && <button className="mobile-scrim" aria-label="Close navigation" onClick={onClose} />}
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Activity size={23} strokeWidth={2.5} /></div><div><strong>WoundWatch<span> AI</span></strong><small>RESEARCH WORKSPACE</small></div><button className="icon-button sidebar-close" onClick={onClose} aria-label="Close navigation"><X size={19}/></button></div>
      <div className="nav-label">WORKSPACE</div>
      <nav className="nav-links">{links.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} onClick={onClose} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Icon size={18}/><span>{label}</span>{label === 'Image analysis' && <span className="nav-plus">+</span>}</NavLink>)}</nav>
      <div className="sidebar-spacer"/>
      <div className="privacy-card"><div className="privacy-icon"><ShieldCheck size={18}/></div><strong>Privacy by design</strong><p>Use synthetic or de-identified records only. This research prototype is not a medical device.</p></div>
      <div className="sidebar-footer"><span className={`mode-dot ${mode === 'api' ? 'api-dot' : ''}`}/><span>{mode === 'demo' ? 'Demo environment' : 'API environment'}</span><span className="version">v1.0</span></div>
    </aside>
  </>
}