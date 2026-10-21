import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Activity, ChevronDown, FileClock, LayoutDashboard, Menu, PlusCircle, ShieldCheck, Users, X } from 'lucide-react'

interface Props {
  mode: 'demo' | 'api'
  apiStatus: 'checking' | 'online' | 'offline' | 'not-checked'
}

export default function Navbar({ mode, apiStatus }: Props) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false)
  const location = useLocation()

  function closeMenu() {
    setMobileMenuOpen(false)
    setWorkspaceMenuOpen(false)
  }

  const isWorkspaceActive = ['/dashboard', '/patients', '/history'].some((p) =>
    location.pathname.startsWith(p)
  )

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          {/* Logo & Brand */}
          <Link to="/" className="brand-logo" onClick={closeMenu}>
            <div className="brand-mark">
              <Activity size={22} strokeWidth={2.5} />
            </div>
            <div className="brand-text">
              <strong>
                WoundWatch<span> AI</span>
              </strong>
              <small>RESEARCH PLATFORM</small>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="desktop-nav" aria-label="Main Navigation">
            <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              Home
            </NavLink>
            <NavLink to="/about" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              About Us
            </NavLink>
            <NavLink to="/wound-care" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              Wound Care & Awareness
            </NavLink>
            <NavLink to="/test-wound" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              Test Your Wound
              <span className="nav-hot-pill">TRY AI</span>
            </NavLink>

            {/* Workspace Dropdown */}
            <div
              className="workspace-nav-wrapper"
              onMouseEnter={() => setWorkspaceMenuOpen(true)}
              onMouseLeave={() => setWorkspaceMenuOpen(false)}
            >
              <button
                type="button"
                className={`nav-item dropdown-btn ${isWorkspaceActive ? 'active' : ''}`}
                onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
                aria-expanded={workspaceMenuOpen}
              >
                <span>Workspace</span>
                <ChevronDown size={14} className={`caret ${workspaceMenuOpen ? 'open' : ''}`} />
              </button>

              {workspaceMenuOpen && (
                <div className="workspace-dropdown-menu">
                  <Link to="/dashboard" onClick={closeMenu} className="dropdown-link">
                    <LayoutDashboard size={16} />
                    <div>
                      <strong>Overview Dashboard</strong>
                      <span>Workspace trends & recent activity</span>
                    </div>
                  </Link>
                  <Link to="/patients" onClick={closeMenu} className="dropdown-link">
                    <Users size={16} />
                    <div>
                      <strong>Patient Records</strong>
                      <span>De-identified records & timelines</span>
                    </div>
                  </Link>
                  <Link to="/history" onClick={closeMenu} className="dropdown-link">
                    <FileClock size={16} />
                    <div>
                      <strong>Visit Reports & History</strong>
                      <span>Filter visits and export research CSV</span>
                    </div>
                  </Link>
                </div>
              )}
            </div>

            <NavLink to="/contact" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              Contact
            </NavLink>
          </nav>

          {/* Right actions */}
          <div className="header-actions">
            {/* Environment Badge */}
            <div className={`environment-badge ${mode}`}>
              <span className={`status-dot ${mode === 'api' ? (apiStatus === 'online' ? 'online' : 'offline') : 'demo'}`} />
              <span>{mode === 'demo' ? 'Demo Mode' : apiStatus === 'online' ? 'API Online' : 'API Offline'}</span>
            </div>

            {/* Primary Action Button */}
            <Link to="/test-wound" className="primary-cta-btn" onClick={closeMenu}>
              <PlusCircle size={16} />
              <span>Analyze a Wound</span>
            </Link>

            {/* Mobile Menu Button */}
            <button
              type="button"
              className="mobile-menu-toggle"
              aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="mobile-drawer-backdrop" onClick={closeMenu}>
          <div className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-drawer-header">
              <Link to="/" className="brand-logo" onClick={closeMenu}>
                <div className="brand-mark small">
                  <Activity size={18} strokeWidth={2.5} />
                </div>
                <div className="brand-text">
                  <strong>WoundWatch<span> AI</span></strong>
                </div>
              </Link>
              <button type="button" className="icon-button" onClick={closeMenu} aria-label="Close menu">
                <X size={18} />
              </button>
            </div>

            <nav className="mobile-drawer-nav">
              <NavLink to="/" end className="mobile-nav-link" onClick={closeMenu}>
                Home
              </NavLink>
              <NavLink to="/about" className="mobile-nav-link" onClick={closeMenu}>
                About Us
              </NavLink>
              <NavLink to="/wound-care" className="mobile-nav-link" onClick={closeMenu}>
                Wound Care & Awareness
              </NavLink>
              <NavLink to="/test-wound" className="mobile-nav-link highlight" onClick={closeMenu}>
                Test Your Wound
              </NavLink>

              <div className="mobile-nav-section-title">CLINICAL WORKSPACE</div>
              <NavLink to="/dashboard" className="mobile-nav-link" onClick={closeMenu}>
                <LayoutDashboard size={16} /> Workspace Overview
              </NavLink>
              <NavLink to="/patients" className="mobile-nav-link" onClick={closeMenu}>
                <Users size={16} /> Patient Records
              </NavLink>
              <NavLink to="/history" className="mobile-nav-link" onClick={closeMenu}>
                <FileClock size={16} /> Reports & Export
              </NavLink>

              <div className="mobile-nav-section-title">ORGANIZATION</div>
              <NavLink to="/contact" className="mobile-nav-link" onClick={closeMenu}>
                Contact Us
              </NavLink>
            </nav>

            <div className="mobile-drawer-footer">
              <Link to="/test-wound" className="primary-button full-button" onClick={closeMenu}>
                <PlusCircle size={16} /> Analyze a Wound
              </Link>
              <div className="mobile-mode-note">
                <ShieldCheck size={14} />
                <span>Running in {mode === 'demo' ? 'Synthetic Demo Mode' : 'FastAPI Integration Mode'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
