import { useState } from 'react'
import {
  AlertCircle,
  Building,
  CheckCircle2,
  Clock,
  Info,
  LoaderCircle,
  Mail,
  MapPin,
  Send,
  ShieldCheck,
} from 'lucide-react'
import MedicalDisclaimer from '../components/MedicalDisclaimer'

export default function Contact() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('Research Collaboration')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'submitted' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage('')

    if (!name.trim()) {
      setErrorMessage('Please enter your name or institution.')
      return
    }

    if (!email.trim() || !email.includes('@') || !email.includes('.')) {
      setErrorMessage('Please enter a valid email address.')
      return
    }

    if (!message.trim() || message.trim().length < 10) {
      setErrorMessage('Please enter a message containing at least 10 characters.')
      return
    }

    setStatus('submitting')

    // Simulate sending delay with honest mock feedback (per requirements: never falsely claim email was sent)
    setTimeout(() => {
      setStatus('submitted')
    }, 700)
  }

  function resetForm() {
    setName('')
    setEmail('')
    setSubject('Research Collaboration')
    setMessage('')
    setStatus('idle')
    setErrorMessage('')
  }

  return (
    <div className="contact-page">
      <div className="section-container">
        {/* Header */}
        <div className="contact-hero-header">
          <span className="section-tag">CONNECT WITH THE RESEARCHERS</span>
          <h1>Contact Us & Research Collaboration</h1>
          <p>
            Have inquiries regarding computer vision methodology, algorithmic evaluation, academic partnerships, or integration testing? Reach out to our project team.
          </p>
        </div>

        <div className="contact-layout-grid">
          {/* Form Column */}
          <div className="contact-form-card">
            <h3>Send an Academic or Integration Inquiry</h3>
            <p className="card-subtitle">
              Complete the form below to initiate collaboration discussions.
            </p>

            {status === 'submitted' ? (
              <div className="contact-simulated-success">
                <div className="success-icon-wrap">
                  <CheckCircle2 size={32} className="text-emerald" />
                </div>
                <h4>Message Form Simulated Successfully</h4>
                <p className="success-notice">
                  <strong>Notice:</strong> This is an investigational frontend prototype. Outgoing email transport is <strong>not connected to a live SMTP mail server</strong> in this environment.
                </p>
                <div className="direct-email-box">
                  <span>To send a real inquiry, please email directly to:</span>
                  <a href="mailto:research@woundwatch.ai">research@woundwatch.ai</a>
                </div>
                <button type="button" className="secondary-button" onClick={resetForm}>
                  Send Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="contact-form">
                {errorMessage && (
                  <div className="form-error-alert">
                    <AlertCircle size={16} />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="form-field">
                  <label htmlFor="contact-name">
                    Name or Institution <span className="required-star">*</span>
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    placeholder="e.g. Dr. Jane Smith, University Medical Center"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="contact-email">
                    Institutional Email Address <span className="required-star">*</span>
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    placeholder="e.g. j.smith@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="contact-subject">Inquiry Category</label>
                  <select
                    id="contact-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  >
                    <option value="Research Collaboration">Academic & Clinical Research Collaboration</option>
                    <option value="Technical Integration">FastAPI / Algorithm Integration Support</option>
                    <option value="Dataset Evaluation">De-Identified Benchmark Dataset Inquiry</option>
                    <option value="General Question">General Methodology Question</option>
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="contact-message">
                    Inquiry Details <span className="required-star">*</span>
                  </label>
                  <textarea
                    id="contact-message"
                    rows={5}
                    placeholder="Please summarize your research objectives, clinical setting, or technical questions…"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                  />
                </div>

                <div className="form-disclaimer-note">
                  <Info size={14} />
                  <span>
                    Do not transmit real patient identifiers, protected health information (PHI), or un-anonymized records through this contact form.
                  </span>
                </div>

                <button
                  type="submit"
                  className="primary-button full-button"
                  disabled={status === 'submitting'}
                >
                  {status === 'submitting' ? (
                    <>
                      <LoaderCircle size={18} className="spin" />
                      <span>Processing Inquiry…</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>Submit Inquiry</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Contact Details & Info Column */}
          <aside className="contact-info-aside">
            <div className="contact-detail-card">
              <h4>Project Coordinates</h4>
              <p>For official research communications and code inquiries:</p>

              <ul className="info-list">
                <li>
                  <div className="info-icon-box"><Mail size={18} /></div>
                  <div>
                    <strong>Research Email</strong>
                    <a href="mailto:research@woundwatch.ai">research@woundwatch.ai</a>
                  </div>
                </li>
                <li>
                  <div className="info-icon-box"><Building size={18} /></div>
                  <div>
                    <strong>Technical & API Team</strong>
                    <a href="mailto:dev@woundwatch.ai">dev@woundwatch.ai</a>
                  </div>
                </li>
                <li>
                  <div className="info-icon-box"><MapPin size={18} /></div>
                  <div>
                    <strong>Laboratory Location</strong>
                    <span>Computer Vision & Health Informatics Research Lab</span>
                  </div>
                </li>
                <li>
                  <div className="info-icon-box"><Clock size={18} /></div>
                  <div>
                    <strong>Research Office Hours</strong>
                    <span>Monday – Friday, 9:00 AM – 5:00 PM EST</span>
                  </div>
                </li>
              </ul>
            </div>

            <div className="contact-detail-card highlight-card">
              <div className="highlight-card-header">
                <ShieldCheck size={20} className="text-teal" />
                <h4>Confidentiality & Ethics</h4>
              </div>
              <p>
                WoundWatch AI operates strictly under ethical data protocols. All benchmarking and validation image sets utilized in algorithm development are de-identified in full adherence to clinical research ethics standards.
              </p>
            </div>
          </aside>
        </div>

        <MedicalDisclaimer />
      </div>
    </div>
  )
}
