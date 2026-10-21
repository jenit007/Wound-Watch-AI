import { Menu, Search } from 'lucide-react'
import { useLocation } from 'react-router-dom'
const titles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Overview', subtitle: 'A clear view of your wound monitoring workspace.' },
  '/patients': { title: 'Patient records', subtitle: 'Manage de-identified records and follow-up visits.' },
  '/upload': { title: 'Image analysis', subtitle: 'Submit a wound image for model-assisted review.' },
  '/history': { title: 'Reports & history', subtitle: 'Review visit history and export research records.' },
}
export default function Topbar({ onMenu, mode }: { onMenu: () => void; mode: 'demo' | 'api' }) {
  const location = useLocation()
  const page = location.pathname.startsWith('/patients/') ? { title: 'Patient overview', subtitle: 'Review visit history and clinical metadata.' } : titles[location.pathname] || titles['/']
  return <header className="topbar"><button className="icon-button menu-toggle" aria-label="Open navigation" onClick={onMenu}><Menu size={21}/></button><div className="page-heading"><h1>{page.title}</h1><p>{page.subtitle}</p></div><div className="topbar-actions"><div className={`environment-pill ${mode}`}><span/> {mode === 'demo' ? 'Demo mode' : 'API mode'}</div><button className="icon-button search-button" aria-label="Search records" onClick={() => location.pathname !== '/patients' && (window.location.href = '/patients')}><Search size={19}/></button><div className="avatar">WW</div></div></header>
}