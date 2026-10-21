import { Link } from 'react-router-dom'
import { Activity, Mail, MapPin, ShieldCheck } from 'lucide-react'
import MedicalDisclaimer from './MedicalDisclaimer'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div className="footer-grid">
          {/* Brand Column */}
          <div className="footer-col brand-col">
            <Link to="/" className="brand-logo">
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
            <p className="footer-desc">
              An investigational computer-vision platform engineered to quantify wound dimensions, compute longitudinal surface area changes, and support clinical monitoring research.
            </p>
            <div className="footer-privacy-pill">
              <ShieldCheck size={16} />
              <span>Client-side de-identification & privacy-by-design</span>
            </div>
          </div>

          {/* Navigation Column 1: Public Platform */}
          <div className="footer-col">
            <h4>PLATFORM</h4>
            <ul className="footer-links">
              <li><Link to="/">Home Overview</Link></li>
              <li><Link to="/about">About Us & Methodology</Link></li>
              <li><Link to="/wound-care">Wound Care & Awareness</Link></li>
              <li><Link to="/test-wound">Test Your Wound (AI Submission)</Link></li>
              <li><Link to="/results/DEMO-948120">Sample Analysis Results</Link></li>
            </ul>
          </div>

          {/* Navigation Column 2: Clinical Workspace */}
          <div className="footer-col">
            <h4>RESEARCH WORKSPACE</h4>
            <ul className="footer-links">
              <li><Link to="/dashboard">Workspace Dashboard</Link></li>
              <li><Link to="/patients">Patient Records Directory</Link></li>
              <li><Link to="/history">Visit History & CSV Export</Link></li>
              <li><Link to="/contact">Research Collaboration</Link></li>
            </ul>
          </div>

          {/* Navigation Column 3: Contact & Configuration */}
          <div className="footer-col contact-col">
            <h4>RESEARCH INQUIRIES</h4>
            <ul className="footer-contact-info">
              <li>
                <Mail size={15} />
                <a href="mailto:research@woundwatch.ai">research@woundwatch.ai</a>
              </li>
              <li>
                <MapPin size={15} />
                <span>Computer Vision & Health Informatics Laboratory</span>
              </li>
            </ul>
            <div className="footer-badge">
              <span className="badge-pulse" />
              <span>FastAPI Architecture Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* Prominent Medical Disclaimer Section */}
      <div className="footer-disclaimer-wrap">
        <MedicalDisclaimer />
      </div>

      {/* Footer Bottom Bar */}
      <div className="footer-bottom">
        <div className="footer-bottom-inner">
          <p>© {currentYear} WoundWatch AI. Research prototype under active academic development.</p>
          <div className="footer-bottom-meta">
            <span>Synthetic Demo & Clinical Integration Mode</span>
            <span>·</span>
            <span>Not for Diagnostic or Treatment Decisions</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
