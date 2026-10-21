import { Outlet, useLocation, Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { LayoutDashboard, Users, FileClock, Plus } from 'lucide-react'

interface Props {
  mode: 'demo' | 'api'
  apiStatus: 'checking' | 'online' | 'offline' | 'not-checked'
}

export default function AppLayout({ mode, apiStatus }: Props) {
  const location = useLocation()
  const isWorkspace = ['/dashboard', '/patients', '/history'].some(
    (path) => location.pathname === path || location.pathname.startsWith(`${path}/`)
  )

  return (
    <div className="site-shell">
      <Navbar mode={mode} apiStatus={apiStatus} />

      {/* Secondary Sub-Navbar for Clinical Workspace routes */}
      {isWorkspace && (
        <aside className="workspace-subnav" aria-label="Clinical workspace navigation">
          <div className="subnav-inner">
            <div className="subnav-label">
              <span className="subnav-pill">CLINICAL WORKSPACE</span>
            </div>
            <nav className="subnav-links">
              <Link
                to="/dashboard"
                className={`subnav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
              >
                <LayoutDashboard size={15} />
                <span>Overview</span>
              </Link>
              <Link
                to="/patients"
                className={`subnav-link ${location.pathname.startsWith('/patients') ? 'active' : ''}`}
              >
                <Users size={15} />
                <span>Patient Records</span>
              </Link>
              <Link
                to="/history"
                className={`subnav-link ${location.pathname === '/history' ? 'active' : ''}`}
              >
                <FileClock size={15} />
                <span>Reports & History</span>
              </Link>
            </nav>
            <div className="subnav-actions">
              <Link to="/test-wound" className="primary-button small">
                <Plus size={14} />
                <span>New Analysis</span>
              </Link>
            </div>
          </div>
        </aside>
      )}

      <main className={`site-main-content ${isWorkspace ? 'workspace-content' : ''}`}>
        <Outlet />
      </main>

      <Footer />
    </div>
  )
}