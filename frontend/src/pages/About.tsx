import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  Eye,
  HeartHandshake,
  Layers,
  Lock,
  Ruler,
  Scale,
  ShieldCheck,
  Stethoscope,
  Target,
} from 'lucide-react'
import MedicalDisclaimer from '../components/MedicalDisclaimer'

export default function About() {
  return (
    <div className="about-page">
      {/* 1. HERO HEADER */}
      <section className="about-hero">
        <div className="section-container">
          <div className="about-hero-content">
            <span className="section-tag">ABOUT WOUNDWATCH AI</span>
            <h1>Pioneering Objective Wound Measurement Through Responsible AI</h1>
            <p>
              An investigational academic and clinical research initiative focused on applying reproducible computer vision methods to wound documentation, surface area quantification, and longitudinal tracking.
            </p>
          </div>
        </div>
      </section>

      {/* 2. OUR STORY & THE CLINICAL CONTEXT */}
      <section className="section alternating-section">
        <div className="section-container">
          <div className="split-row">
            <div className="split-text">
              <span className="section-tag">OUR ORIGIN</span>
              <h2>The Challenge of Subjective Wound Measurement</h2>
              <p>
                In standard clinical practice, wound measurement is frequently performed using disposable paper rulers, visual estimation of length and width, or acetate tracing sheets. While standard, these approaches suffer from significant inter-observer variability — studies report measurement discrepancies exceeding 20% to 40% between different practitioners.
              </p>
              <p>
                Furthermore, rectangular approximations ($Length \times Width$) substantially overestimate irregular wound footprints, obscuring whether an ulcer is truly contracting, stalled, or slowly expanding.
              </p>
              <p>
                <strong>WoundWatch AI was initiated to investigate a more consistent paradigm:</strong> utilizing deep convolutional image segmentation to extract exact polygon boundary perimeters and pixel footprints under standardized camera conditions.
              </p>
            </div>
            <div className="split-image-wrap">
              <img
                src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80"
                alt="Clinical research team reviewing medical imagery"
                className="split-img"
              />
              <div className="split-img-caption">
                <span>Objective quantification addresses high inter-observer variability in manual wound documentation.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. MISSION & VISION */}
      <section className="section mission-vision-section">
        <div className="section-container">
          <div className="mission-vision-grid">
            <div className="mv-card">
              <div className="mv-icon teal">
                <Target size={24} />
              </div>
              <h3>Our Mission</h3>
              <p>
                To empower clinical practitioners, wound care researchers, and healthcare systems with reproducible, objective, and privacy-preserving computer vision algorithms that standardize wound documentation and eliminate guesswork in longitudinal healing evaluation.
              </p>
              <ul className="mv-list">
                <li><CheckCircle2 size={15} /> Standardize 2D boundary segmentation across diverse wound etiologies</li>
                <li><CheckCircle2 size={15} /> Eliminate subjective rectangular ruler overestimations</li>
                <li><CheckCircle2 size={15} /> Protect patient identity through client-side privacy safeguards</li>
              </ul>
            </div>

            <div className="mv-card">
              <div className="mv-icon blue">
                <Eye size={24} />
              </div>
              <h3>Our Vision</h3>
              <p>
                A future where delayed wound healing is detected at the earliest possible juncture, enabling timely multidisciplinary intervention, reducing avoidable amputations, minimizing hospital readmissions, and elevating quality of life for individuals with chronic wounds.
              </p>
              <ul className="mv-list">
                <li><CheckCircle2 size={15} /> Early detection of stalled chronic ulcers within 2–4 week windows</li>
                <li><CheckCircle2 size={15} /> Seamless integration into existing healthcare clinical records</li>
                <li><CheckCircle2 size={15} /> Transparent and auditable algorithmic decision support</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 4. WHAT WE DO — THE COMPUTER VISION METHODOLOGY */}
      <section className="section methodology-section">
        <div className="section-container">
          <div className="section-header center">
            <span className="section-tag">CORE METHODOLOGY</span>
            <h2>What We Do: Technical Architecture</h2>
            <p>Our research pipeline incorporates four key computer vision and analytical modules.</p>
          </div>

          <div className="methodology-grid">
            <div className="method-card">
              <div className="method-num">01</div>
              <div className="method-icon"><Layers size={22} /></div>
              <h4>Deep Convolutional Segmentation</h4>
              <p>
                We evaluate U-Net and DeepLab convolutional architectures trained on annotated wound datasets. The network produces binary pixel segmentation masks separating active lesion tissue from periwound epidermis and surrounding healthy margins.
              </p>
            </div>

            <div className="method-card">
              <div className="method-num">02</div>
              <div className="method-icon"><Ruler size={22} /></div>
              <h4>Scale Fiducial Calibration</h4>
              <p>
                To translate dimensionless pixels into physical metric units ($cm^2$), our pipeline identifies standardized reference stickers placed in the camera frame, establishing an exact pixels-per-millimeter conversion factor regardless of zoom level.
              </p>
            </div>

            <div className="method-card">
              <div className="method-num">03</div>
              <div className="method-icon"><Scale size={22} /></div>
              <h4>Longitudinal Velocity Analysis</h4>
              <p>
                By linking de-identified serial visits chronologically, algorithms calculate the rate of area change: <code>{'ΔA% = ((A_t - A_0) / A_0) × 100%'}</code>. This delta is compared against clinical 20–40% healing benchmarks established in wound care literature.
              </p>
            </div>

            <div className="method-card">
              <div className="method-num">04</div>
              <div className="method-icon"><Cpu size={22} /></div>
              <h4>Explainable AI & Uncertainty Modeling</h4>
              <p>
                Rather than treating deep learning as a black box, every output returns boundary confidence indicators, lighting caveat warnings, and explicit statements regarding missing scale data to keep clinicians fully informed of algorithmic limitations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. RESPONSIBLE AI & ETHICAL FRAMEWORK */}
      <section className="section ethical-section">
        <div className="section-container">
          <div className="split-row reverse">
            <div className="split-text">
              <span className="section-tag">RESPONSIBLE HEALTHCARE AI</span>
              <h2>Safety, Transparency & Clinical Primacy</h2>
              <p>
                Artificial intelligence in healthcare demands higher ethical standards, complete transparency, and humble recognition of model boundaries. WoundWatch AI is designed from the ground up around four responsible AI pillars:
              </p>

              <div className="ethical-pillars">
                <div className="pillar-item">
                  <div className="pillar-icon"><Stethoscope size={18} /></div>
                  <div>
                    <strong>Clinical Primacy (Human-in-the-Loop)</strong>
                    <span>Algorithms are cognitive aids, never autonomous diagnosticians. Licensed medical practitioners retain sole diagnostic and therapeutic authority.</span>
                  </div>
                </div>

                <div className="pillar-item">
                  <div className="pillar-icon"><Lock size={18} /></div>
                  <div>
                    <strong>Privacy by Design & Synthetic Data</strong>
                    <span>Our prototype operates with synthetic de-identified identifiers. Images are processed locally or transferred securely via temporary research tokens.</span>
                  </div>
                </div>

                <div className="pillar-item">
                  <div className="pillar-icon"><ShieldCheck size={18} /></div>
                  <div>
                    <strong>Zero Hallucinated Metrics</strong>
                    <span>If a scale marker or prior visit is absent, the system explicitly reports values as unavailable. We do not invent, estimate, or hallucinate physical measurements.</span>
                  </div>
                </div>

                <div className="pillar-item">
                  <div className="pillar-icon"><HeartHandshake size={18} /></div>
                  <div>
                    <strong>Transparent Limitations & Caveats</strong>
                    <span>Clear notification when lighting, distance, or camera tilt may compromise pixel fidelity, ensuring clinicians are never misled by false certainty.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="split-image-wrap">
              <img
                src="https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80"
                alt="Healthcare professional using digital diagnostic interface"
                className="split-img"
              />
              <div className="split-img-caption">
                <span>Clinical oversight ensures computer vision complements clinical discernment rather than replacing it.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CALL TO ACTION & DISCLAIMER */}
      <section className="section about-cta-section">
        <div className="section-container">
          <div className="cta-banner-card">
            <div className="cta-content">
              <span className="cta-tag">PARTICIPATE IN RESEARCH</span>
              <h2>Test the Algorithm with an Image</h2>
              <p>Experience how our computer vision pipeline processes image contours and calculates surface dimensions.</p>
              <div className="cta-btn-group">
                <Link to="/test-wound" className="primary-button cta-primary">
                  <span>Start Image Analysis</span>
                  <ArrowRight size={16} />
                </Link>
                <Link to="/contact" className="secondary-button cta-secondary">
                  <span>Research Contact</span>
                </Link>
              </div>
            </div>
          </div>

          <MedicalDisclaimer />
        </div>
      </section>
    </div>
  )
}
