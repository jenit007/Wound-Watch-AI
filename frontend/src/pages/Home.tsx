import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Cpu,
  Eye,
  Info,
  Layers,
  LineChart as LineChartIcon,
  PlusCircle,
  Ruler,
  Shield,
  Sparkles,
  TrendingDown,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import MedicalDisclaimer from '../components/MedicalDisclaimer'

// Sample illustrative demo data for the interactive product preview
const previewTrendData = [
  { visit: 'Visit 1 (Day 0)', area: 18400, cm2: 7.2, note: 'Initial presentation' },
  { visit: 'Visit 2 (Day 7)', area: 16800, cm2: 6.5, note: 'Early debridement' },
  { visit: 'Visit 3 (Day 14)', area: 14200, cm2: 5.5, note: 'Granulation advancement' },
  { visit: 'Visit 4 (Day 21)', area: 11900, cm2: 4.6, note: 'Epithelial migration' },
  { visit: 'Visit 5 (Day 28)', area: 9800, cm2: 3.8, note: 'Progressing to closure' },
]

export default function Home({ mode }: { mode: 'demo' | 'api' }) {
  const [activeTab, setActiveTab] = useState<'chart' | 'segmentation' | 'metrics'>('chart')
  const [maskOpacity, setMaskOpacity] = useState(65)

  return (
    <div className="home-page">
      {/* 1. HERO SECTION */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <div className="hero-badge">
              <Sparkles size={14} />
              <span>RESEARCH PLATFORM · {mode === 'demo' ? 'DEMO MODE' : 'API CONNECTED'}</span>
            </div>
            <h1 className="hero-title">
              See the Change. <br />
              <span className="hero-highlight">Understand the Journey.</span>
            </h1>
            <p className="hero-description">
              WoundWatch AI is an investigational wound-monitoring platform leveraging computer vision algorithms to quantify wound dimensions, compute longitudinal surface area changes, and support reproducible clinical documentation across healing visits.
            </p>

            <div className="hero-actions">
              <Link to="/test-wound" className="primary-button hero-btn">
                <PlusCircle size={18} />
                <span>Analyze a Wound</span>
                <ArrowRight size={16} />
              </Link>
              <Link to="/about" className="secondary-button hero-btn">
                <span>Our Methodology</span>
              </Link>
            </div>

            <div className="hero-trust-badges">
              <div className="trust-item">
                <CheckCircle2 size={15} className="text-teal" />
                <span>Objective pixel & metric tracking</span>
              </div>
              <div className="trust-item">
                <CheckCircle2 size={15} className="text-teal" />
                <span>Longitudinal visit comparison</span>
              </div>
              <div className="trust-item">
                <CheckCircle2 size={15} className="text-teal" />
                <span>Privacy-by-design & synthetic IDs</span>
              </div>
            </div>
          </div>

          {/* Interactive Healthcare / Computer Vision Hero Graphic */}
          <div className="hero-visual-card">
            <div className="visual-card-header">
              <div className="visual-header-left">
                <span className="vision-pulse" />
                <strong>COMPUTER VISION VIEWPORT</strong>
              </div>
              <span className="demo-chip">SYNTHETIC DEMO</span>
            </div>

            <div className="viewport-stage">
              {/* Synthetic medical wound image with interactive overlays */}
              <img
                src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=900&q=80"
                alt="Illustrative clinical inspection view with computer vision bounding box"
                className="viewport-base-img"
              />

              {/* Bounding box contour simulation */}
              <div className="vision-bounding-box">
                <div className="box-corner top-l" />
                <div className="box-corner top-r" />
                <div className="box-corner bot-l" />
                <div className="box-corner bot-r" />
                <span className="box-label">LESION CONTOUR · CONFIDENCE 94.2%</span>
              </div>

              {/* Animated Computer Vision Scanning Reticle Line */}
              <div className="vision-scanner-line" aria-hidden="true" />

              {/* Calibrated reference sticker simulation */}
              <div className="calibration-marker-box">
                <div className="marker-grid" />
                <span>1 cm² CALIBRATION FIDUCIAL</span>
              </div>

              {/* Live telemetry badge */}
              <div className="viewport-telemetry">
                <div className="telemetry-row">
                  <span>Calculated Area</span>
                  <strong>11,900 px (4.6 cm²)</strong>
                </div>
                <div className="telemetry-row">
                  <span>Delta vs Prior</span>
                  <strong className="text-emerald">-16.2%</strong>
                </div>
              </div>
            </div>

            <div className="visual-card-footer">
              <div className="footer-metric">
                <span>Resolution</span>
                <strong>1920 × 1080 px</strong>
              </div>
              <div className="footer-metric">
                <span>Model Pipeline</span>
                <strong>DeepLab / U-Net</strong>
              </div>
              <div className="footer-metric">
                <span>Calibration</span>
                <strong>Fiducial 10 mm</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. COMPANY & METHODOLOGY INTRODUCTION */}
      <section className="section intro-section">
        <div className="section-container">
          <div className="section-header center">
            <span className="section-tag">THE CLINICAL CHALLENGE & SOLUTION</span>
            <h2>Bridging Subjective Inspection with Objective Computer Vision</h2>
            <p>
              Traditional wound measurement relies heavily on manual paper rulers, subjective boundary estimations, and variable lighting conditions. WoundWatch AI investigates automated contour segmentation to standardize healing trajectory documentation.
            </p>
          </div>

          <div className="intro-grid">
            <div className="intro-card">
              <div className="intro-icon blue">
                <Eye size={22} />
              </div>
              <h3>Automated Boundary Delineation</h3>
              <p>
                Convolutional neural networks identify subtle tissue variations between healthy periwound skin, hyperkeratosis, and active granulation tissue, producing consistent segmentation contours.
              </p>
            </div>

            <div className="intro-card">
              <div className="intro-icon teal">
                <Ruler size={22} />
              </div>
              <h3>Scale-Calibrated Metrics</h3>
              <p>
                When a standardized scale reference is captured in the frame, algorithms convert 2D pixel areas into verified physical square centimeters, reducing camera distance variability.
              </p>
            </div>

            <div className="intro-card">
              <div className="intro-icon amber">
                <LineChartIcon size={22} />
              </div>
              <h3>Longitudinal Velocity Tracking</h3>
              <p>
                Tracking percentage reduction over 2- to 4-week clinical intervals provides an objective signal for identifying wounds that fail to meet healing thresholds and require specialist review.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FOUR-STEP WORKFLOW */}
      <section className="section workflow-section">
        <div className="section-container">
          <div className="section-header">
            <span className="section-tag">HOW IT WORKS</span>
            <h2>Four-Step Research Workflow</h2>
            <p>From standardized photograph acquisition to historical comparison and practitioner oversight.</p>
          </div>

          <div className="workflow-steps">
            <div className="workflow-step">
              <div className="step-count">01</div>
              <div className="step-icon-wrap">
                <Camera size={22} />
              </div>
              <h4>Capture</h4>
              <p>Capture a clear photograph using your device camera or upload an existing image. Place a scale fiducial marker adjacent to the wound for physical area calibration.</p>
              <div className="step-footer-tag">Camera API or File Upload</div>
            </div>

            <div className="workflow-step">
              <div className="step-count">02</div>
              <div className="step-icon-wrap">
                <Cpu size={22} />
              </div>
              <h4>Analyze</h4>
              <p>The image is evaluated for quality and scale presence, then submitted to the neural network for boundary segmentation and tissue margin delineation.</p>
              <div className="step-footer-tag">U-Net Feature Extraction</div>
            </div>

            <div className="workflow-step">
              <div className="step-count">03</div>
              <div className="step-icon-wrap">
                <Ruler size={22} />
              </div>
              <h4>Measure</h4>
              <p>The platform extracts the wound area in pixels. If a valid scale marker is detected, it calculates physical area in cm² and verifies boundary coordinates.</p>
              <div className="step-footer-tag">Pixel & cm² Calculation</div>
            </div>

            <div className="workflow-step">
              <div className="step-count">04</div>
              <div className="step-icon-wrap">
                <Layers size={22} />
              </div>
              <h4>Monitor</h4>
              <p>Sequential visits are compared chronologically, generating healing velocity curves, percentage reduction figures, and model explainability notes for clinical review.</p>
              <div className="step-footer-tag">Longitudinal Trajectory</div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. PLATFORM FEATURES IN DEPTH */}
      <section className="section features-section">
        <div className="section-container">
          <div className="section-header center">
            <span className="section-tag">PLATFORM CAPABILITIES</span>
            <h2>Comprehensive Research Tooling for Wound Documentation</h2>
            <p>Engineered to deliver transparent, reproducible measurements with human-in-the-loop oversight.</p>
          </div>

          <div className="feature-grid-two">
            <div className="feature-item-card">
              <div className="feature-icon"><Camera size={20} /></div>
              <h3>Multi-Format Image Acquisition</h3>
              <p>Supports JPEG, PNG, and WebP up to 10 MB. In-browser live camera capture enables immediate shutter release with automatic permission handling and hardware cleanup.</p>
              <ul className="feature-checklist">
                <li><CheckCircle2 size={15} /> Browser camera API with front/rear lens switching</li>
                <li><CheckCircle2 size={15} /> Real-time file type and 10 MB size validation</li>
                <li><CheckCircle2 size={15} /> Client-side image preview and replacement</li>
              </ul>
            </div>

            <div className="feature-item-card">
              <div className="feature-icon"><Layers size={20} /></div>
              <h3>Semantic Segmentation Masking</h3>
              <p>Generates high-precision binary segmentation masks delineating wound borders from surrounding healthy skin, available as interactive overlays on top of the original image.</p>
              <ul className="feature-checklist">
                <li><CheckCircle2 size={15} /> High-contrast visual boundary detection</li>
                <li><CheckCircle2 size={15} /> Adjustable mask opacity overlay comparison</li>
                <li><CheckCircle2 size={15} /> Tissue margin separation indicators</li>
              </ul>
            </div>

            <div className="feature-item-card">
              <div className="feature-icon"><Ruler size={20} /></div>
              <h3>Dual Measurement Metrics</h3>
              <p>Provides raw pixel counts for image-level comparison alongside physical square-centimeter calibration when standardized reference fiducials are present.</p>
              <ul className="feature-checklist">
                <li><CheckCircle2 size={15} /> Unambiguous reporting of pixel area</li>
                <li><CheckCircle2 size={15} /> Null handling when scale fiducials are missing</li>
                <li><CheckCircle2 size={15} /> No fabricated or hallucinated metric predictions</li>
              </ul>
            </div>

            <div className="feature-item-card">
              <div className="feature-icon"><Shield size={20} /></div>
              <h3>Transparent Explainability & Safety</h3>
              <p>Every analysis includes model reasoning notes, edge uncertainty warnings, and explicit statements regarding research boundaries to prevent misinterpretation.</p>
              <ul className="feature-checklist">
                <li><CheckCircle2 size={15} /> Transparent model warning notifications</li>
                <li><CheckCircle2 size={15} /> Uncalibrated risk descriptors clearly noted</li>
                <li><CheckCircle2 size={15} /> Human-in-the-loop clinical primacy</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 5. INTERACTIVE PRODUCT PREVIEW */}
      <section className="section product-preview-section">
        <div className="section-container">
          <div className="section-header">
            <div className="preview-badge-row">
              <span className="section-tag">INTERACTIVE PREVIEW</span>
              <span className="demo-chip">SYNTHETIC DEMO DATA · ILLUSTRATIVE ONLY</span>
            </div>
            <h2>Experience the Monitoring Interface</h2>
            <p>Explore how WoundWatch AI visualizes longitudinal healing curves and multi-visit clinical records.</p>
          </div>

          <div className="preview-interface-card">
            {/* Interface Toolbar */}
            <div className="preview-toolbar">
              <div className="toolbar-patient-info">
                <strong>Patient Record: WW-0001</strong>
                <span>Lower leg ulcer · 4 recorded visits · Synthetic dataset</span>
              </div>
              <div className="toolbar-tabs">
                <button
                  type="button"
                  className={`toolbar-tab ${activeTab === 'chart' ? 'active' : ''}`}
                  onClick={() => setActiveTab('chart')}
                >
                  Area Trend Chart
                </button>
                <button
                  type="button"
                  className={`toolbar-tab ${activeTab === 'segmentation' ? 'active' : ''}`}
                  onClick={() => setActiveTab('segmentation')}
                >
                  Segmentation View
                </button>
                <button
                  type="button"
                  className={`toolbar-tab ${activeTab === 'metrics' ? 'active' : ''}`}
                  onClick={() => setActiveTab('metrics')}
                >
                  Metrics Summary
                </button>
              </div>
            </div>

            {/* Tab 1: Chart */}
            {activeTab === 'chart' && (
              <div className="preview-tab-body">
                <div className="preview-chart-header">
                  <div>
                    <h4>Longitudinal Wound Area Trajectory</h4>
                    <p>Demonstrating progressive 46.7% area reduction across 5 simulated weekly follow-up visits.</p>
                  </div>
                  <div className="chart-stat-pill">
                    <TrendingDown size={16} className="text-emerald" />
                    <span>Total Delta: <strong>-46.7%</strong></span>
                  </div>
                </div>

                <div className="preview-chart-wrap">
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={previewTrendData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="homeChartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#0d9488" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="visit" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: '1.5px solid #cbd5e1',
                          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15)',
                          background: '#ffffff',
                          fontWeight: 700,
                        }}
                        formatter={(value) => [`${value} px`, 'Wound Area']}
                      />
                      <Area type="monotone" dataKey="area" stroke="#0d9488" strokeWidth={3} fill="url(#homeChartGrad)" activeDot={{ r: 6, fill: '#0d9488', stroke: '#fff', strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Tab 2: Segmentation View */}
            {activeTab === 'segmentation' && (
              <div className="preview-tab-body">
                <div className="segmentation-preview-grid">
                  <div className="seg-view-box">
                    <div className="seg-box-title">Original Inspection Photograph</div>
                    <img
                      src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=700&q=80"
                      alt="Sample original wound view"
                      className="seg-img"
                    />
                  </div>
                  <div className="seg-view-box">
                    <div className="seg-box-title">
                      <span>Neural Boundary Overlay</span>
                      <span className="seg-opacity-label">Opacity: {maskOpacity}%</span>
                    </div>
                    <div className="seg-overlay-wrap">
                      <img
                        src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=700&q=80"
                        alt="Background original"
                        className="seg-img"
                      />
                      <div
                        className="seg-mask-layer"
                        style={{ opacity: maskOpacity / 100 }}
                      />
                    </div>
                    <div className="seg-slider-row">
                      <span>Overlay transparency:</span>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={maskOpacity}
                        onChange={(e) => setMaskOpacity(Number(e.target.value))}
                        className="opacity-slider"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Metrics */}
            {activeTab === 'metrics' && (
              <div className="preview-tab-body">
                <div className="preview-metrics-grid">
                  <div className="metric-box">
                    <span>Baseline Visit (Day 0)</span>
                    <strong>18,400 px</strong>
                    <p>Initial synthetic baseline footprint</p>
                  </div>
                  <div className="metric-box">
                    <span>Current Visit (Day 28)</span>
                    <strong>9,800 px</strong>
                    <p>Current measured area</p>
                  </div>
                  <div className="metric-box highlight">
                    <span>Net Percentage Change</span>
                    <strong className="text-emerald">-46.7%</strong>
                    <p>Exceeds 20-40% 4-week healing benchmark</p>
                  </div>
                  <div className="metric-box">
                    <span>Model Trajectory</span>
                    <strong className="text-emerald">Improving</strong>
                    <p>Consistent downward slope</p>
                  </div>
                </div>
              </div>
            )}

            <div className="preview-card-footer">
              <span className="info-note">
                <Info size={14} /> Demonstrating synthetic data visualization. No autonomous diagnosis or patient care recommendations.
              </span>
              <Link to="/test-wound" className="text-link">
                Test with your own image <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. WHY WOUND MONITORING MATTERS */}
      <section className="section importance-section">
        <div className="section-container">
          <div className="section-header center">
            <span className="section-tag">CLINICAL IMPORTANCE</span>
            <h2>Why Standardized Wound Tracking Matters</h2>
            <p>Early identification of non-healing trajectories can help prevent systemic complications, hospitalizations, and amputations.</p>
          </div>

          <div className="importance-grid">
            <div className="importance-card">
              <div className="imp-num">01</div>
              <h4>Early Recognition of Stalled Healing</h4>
              <p>
                Wounds failing to reduce in surface area by 20% to 40% after 2 to 4 weeks of standard therapy are statistically unlikely to achieve complete closure without multidisciplinary intervention.
              </p>
            </div>

            <div className="importance-card">
              <div className="imp-num">02</div>
              <h4>Preventing Chronic Ulcer Complications</h4>
              <p>
                In diabetic foot ulcers and pressure injuries, subclinical progression can lead to deep tissue infection, osteomyelitis, and systemic sepsis if not documented accurately between clinic visits.
              </p>
            </div>

            <div className="importance-card">
              <div className="imp-num">03</div>
              <h4>Standardizing Longitudinal Records</h4>
              <p>
                Objective digital imaging reduces inter-rater variability between nurses, wound specialists, and physicians, ensuring that treatment modifications are based on reproducible quantitative evidence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FINAL CALL TO ACTION */}
      <section className="cta-banner-section">
        <div className="cta-banner-card">
          <div className="cta-content">
            <span className="cta-tag">GET STARTED</span>
            <h2>Ready to Test the Wound Monitoring Prototype?</h2>
            <p>
              Submit an image to experience automated boundary segmentation, area calculation, and longitudinal trajectory analysis.
            </p>
            <div className="cta-btn-group">
              <Link to="/test-wound" className="primary-button cta-primary">
                <PlusCircle size={18} />
                <span>Submit Image for Analysis</span>
              </Link>
              <Link to="/wound-care" className="secondary-button cta-secondary">
                <span>Read Wound Care Guide</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 8. MEDICAL DISCLAIMER */}
      <div className="section-container">
        <MedicalDisclaimer />
      </div>
    </div>
  )
}
