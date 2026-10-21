import { useState } from 'react'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Bandage,
  Clock,
  HeartPulse,
  Layers,
  Microscope,
  ShieldAlert,
  Stethoscope,
  Thermometer,
} from 'lucide-react'
import WoundFlowchart from '../components/WoundFlowchart'
import AiPipelineFlowchart from '../components/AiPipelineFlowchart'
import MedicalDisclaimer from '../components/MedicalDisclaimer'

export default function WoundCare() {
  const [activeTab, setActiveTab] = useState<'types' | 'stages' | 'flowcharts'>('flowcharts')

  const woundTypes = [
    {
      title: 'Acute & Traumatic Wounds',
      badge: 'Acute',
      desc: 'Lacerations, abrasions, punctures, and traumatic tissue disruptions resulting from sudden physical injury.',
      hallmark: 'Typically follow an orderly, predictable repair sequence unless complicated by infection or foreign body retention.',
      healingExpectation: 'Usually progresses to wound closure within 2 to 4 weeks in healthy individuals.',
    },
    {
      title: 'Surgical Wounds',
      badge: 'Surgical',
      desc: 'Incisions created during sterile operative procedures, closed primarily by sutures, staples, or surgical adhesives.',
      hallmark: 'Clean, well-approximated edges. Complications include surgical site infection (SSI), dehiscence, or hematoma formation.',
      healingExpectation: 'Primary intention closure typically occurs within 7 to 14 days post-operatively.',
    },
    {
      title: 'Diabetic Foot Ulcers (DFUs)',
      badge: 'Chronic / Neuropathic',
      desc: 'Ulcerations occurring on the plantar aspect or pressure points of the foot in individuals with diabetes mellitus.',
      hallmark: 'Driven by peripheral neuropathy (loss of protective sensation), peripheral arterial disease (PAD), and structural deformities.',
      healingExpectation: 'High risk of delayed healing; requires strict pressure offloading, glycemic control, and routine infection surveillance.',
    },
    {
      title: 'Pressure Injuries (Decubitus)',
      badge: 'Chronic / Ischemic',
      desc: 'Localized damage to the skin and underlying soft tissue, usually over a bony prominence (sacrum, heels, ischium, greater trochanter).',
      hallmark: 'Results from sustained mechanical pressure combined with shear forces, leading to tissue ischemia and necrosis.',
      healingExpectation: 'Graded from Stage 1 (non-blanchable erythema) to Stage 4 (full-thickness tissue loss with exposed bone/muscle).',
    },
    {
      title: 'Venous Leg Ulcers (VLUs)',
      badge: 'Chronic / Vascular',
      desc: 'Shallow, irregular ulcers typically located between the mid-calf and ankle (gaiter region) caused by sustained venous hypertension.',
      hallmark: 'Accompanied by periwound hemosiderin staining, lipodermatosclerosis, and moderate-to-heavy serous exudate.',
      healingExpectation: 'Requires graded compression therapy and elevation; healing may extend across months without venous management.',
    },
    {
      title: 'Arterial / Ischemic Ulcers',
      badge: 'Vascular / Critical',
      desc: 'Ulcers arising from severely reduced arterial perfusion, often located on the toes, heels, or lateral malleolus.',
      hallmark: 'Distinct punched-out edges, pale wound bed with minimal granulation, and severe rest pain often relieved by hanging leg over bed.',
      healingExpectation: 'Contraindicated for compression; requires urgent vascular assessment and potential revascularization.',
    },
  ]

  const healingStages = [
    {
      stage: 'Stage 1',
      name: 'Hemostasis',
      timeline: 'Minutes to Hours Post-Injury',
      icon: HeartPulse,
      color: 'red',
      summary: 'Immediate vascular constriction, platelet activation, and fibrin clot stabilization.',
      mechanism: 'Platelets aggregate at the damaged endothelium to form a provisional fibrin matrix, releasing growth factors (PDGF, TGF-β) that signal the subsequent inflammatory cascade.',
    },
    {
      stage: 'Stage 2',
      name: 'Inflammation',
      timeline: 'Days 1 to 4',
      icon: Microscope,
      color: 'amber',
      summary: 'Cellular cleanup, pathogen defense, and phagocytosis by neutrophils and macrophages.',
      mechanism: 'Neutrophils clear initial bacteria; transition to M1 (pro-inflammatory) and subsequent M2 (pro-healing) macrophages that phagocytose necrotic debris and recruit fibroblasts.',
    },
    {
      stage: 'Stage 3',
      name: 'Proliferation',
      timeline: 'Days 4 to 21',
      icon: Layers,
      color: 'teal',
      summary: 'Angiogenesis, granulation tissue formation, collagen deposition, and wound contraction.',
      mechanism: 'Fibroblasts synthesize Type III collagen; capillary buds form beefy-red granulation tissue. Keratinocytes migrate across the viable wound bed (re-epithelialization) to seal the surface.',
    },
    {
      stage: 'Stage 4',
      name: 'Remodeling & Maturation',
      timeline: 'Day 21 to 2 Years',
      icon: Activity,
      color: 'blue',
      summary: 'Collagen reorganization, scar tensile strength enhancement, and vascular regression.',
      mechanism: 'Type III collagen is systematically replaced by mature Type I collagen. Tensile strength gradually recovers up to approximately 80% of pre-injury baseline skin integrity.',
    },
  ]

  return (
    <div className="wound-care-page">
      {/* 1. HERO HEADER */}
      <section className="wound-care-hero">
        <div className="section-container">
          <div className="wound-care-hero-content">
            <span className="section-tag">EDUCATIONAL GUIDE & PROTOCOLS</span>
            <h1>Wound Care, Physiology & Monitoring Awareness</h1>
            <p>
              An evidence-informed clinical educational guide covering wound classifications, biological healing phases, critical red-flag symptoms, and interactive computer vision flowcharts.
            </p>

            <div className="wound-care-nav-pills">
              <button
                type="button"
                className={`wc-tab-btn ${activeTab === 'flowcharts' ? 'active' : ''}`}
                onClick={() => setActiveTab('flowcharts')}
              >
                Decision & Pipeline Flowcharts
              </button>
              <button
                type="button"
                className={`wc-tab-btn ${activeTab === 'types' ? 'active' : ''}`}
                onClick={() => setActiveTab('types')}
              >
                Wound Classifications
              </button>
              <button
                type="button"
                className={`wc-tab-btn ${activeTab === 'stages' ? 'active' : ''}`}
                onClick={() => setActiveTab('stages')}
              >
                4 Stages of Healing
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. INTERACTIVE FLOWCHARTS SECTION */}
      {activeTab === 'flowcharts' && (
        <section className="section flowcharts-section">
          <div className="section-container">
            <div className="section-header center">
              <span className="section-tag">INTERACTIVE FLOWCHARTS</span>
              <h2>Clinical Assessment & Algorithmic Pipelines</h2>
              <p>Explore editable decision protocols for clinical wound escalation and our complete computer vision architecture.</p>
            </div>

            {/* FLOWCHART 1: CLINICAL DECISION SUPPORT */}
            <div className="flowchart-block">
              <div className="flowchart-meta">
                <span className="flowchart-number">FLOWCHART 1</span>
                <h3>Wound Monitoring & When to Seek Professional Assessment</h3>
                <p>
                  A structured protocol outlining step-by-step observation, red-flag screening, the 2–4 week percentage reduction benchmark, and urgent specialist referral pathways.
                </p>
              </div>
              <WoundFlowchart />
            </div>

            {/* FLOWCHART 2: AI COMPUTER VISION PIPELINE */}
            <div className="flowchart-block">
              <div className="flowchart-meta">
                <span className="flowchart-number">FLOWCHART 2</span>
                <h3>End-to-End Image Processing & Exception Branches</h3>
                <p>
                  Detailed dataflow covering image capture, quality validation gates (blur handling), scale detection branches (pixel-only vs cm²), backend error fallbacks, and uncertainty checks.
                </p>
              </div>
              <AiPipelineFlowchart />
            </div>
          </div>
        </section>
      )}

      {/* 3. WOUND CLASSIFICATIONS */}
      {activeTab === 'types' && (
        <section className="section wound-types-section">
          <div className="section-container">
            <div className="section-header">
              <span className="section-tag">WOUND CLASSIFICATIONS</span>
              <h2>Common Types of Wounds & Clinical Presentation</h2>
              <p>Understanding underlying etiology is critical before interpreting surface dimension measurements.</p>
            </div>

            <div className="wound-types-grid">
              {woundTypes.map((wound, index) => (
                <div className="wound-type-card" key={index}>
                  <div className="wt-header">
                    <span className="wt-badge">{wound.badge}</span>
                    <h3>{wound.title}</h3>
                  </div>
                  <p className="wt-desc">{wound.desc}</p>

                  <div className="wt-detail-box">
                    <strong>Clinical Hallmark:</strong>
                    <span>{wound.hallmark}</span>
                  </div>

                  <div className="wt-detail-box footer-box">
                    <strong>Healing Timeline:</strong>
                    <span>{wound.healingExpectation}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. THE 4 STAGES OF WOUND HEALING */}
      {activeTab === 'stages' && (
        <section className="section healing-stages-section">
          <div className="section-container">
            <div className="section-header">
              <span className="section-tag">BIOLOGICAL REPAIR</span>
              <h2>The 4 Cellular Stages of Wound Healing</h2>
              <p>Physiological milestones required for wound contraction, tissue regeneration, and durable closure.</p>
            </div>

            <div className="stages-timeline">
              {healingStages.map((stage, idx) => {
                const Icon = stage.icon
                return (
                  <div className="stage-card" key={idx}>
                    <div className="stage-marker">
                      <div className={`stage-icon-circle ${stage.color}`}>
                        <Icon size={20} />
                      </div>
                      <span className="stage-tag">{stage.stage}</span>
                    </div>

                    <div className="stage-content">
                      <div className="stage-title-row">
                        <h3>{stage.name}</h3>
                        <span className="stage-timeline-badge"><Clock size={13} /> {stage.timeline}</span>
                      </div>
                      <p className="stage-summary"><strong>Overview:</strong> {stage.summary}</p>
                      <div className="stage-mechanism">
                        <strong>Cellular Mechanism:</strong>
                        <p>{stage.mechanism}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* 5. WARNING SIGNS & WHEN TO SEEK URGENT CARE */}
      <section className="section warning-signs-section">
        <div className="section-container">
          <div className="warning-banner-card">
            <div className="warning-header">
              <div className="warning-icon-wrap">
                <ShieldAlert size={26} />
              </div>
              <div>
                <h2>When Professional or Urgent Medical Attention is Necessary</h2>
                <p>Never delay clinical evaluation if any of the following infection or ischemia warning signs appear.</p>
              </div>
            </div>

            <div className="signs-grid">
              <div className="sign-card">
                <div className="sign-icon red"><Thermometer size={18} /></div>
                <strong>Systemic Fever or Chills</strong>
                <span>Body temperature elevated above 38°C (100.4°F) alongside a localized wound indicates potential systemic bacteremia.</span>
              </div>

              <div className="sign-card">
                <div className="sign-icon red"><Activity size={18} /></div>
                <strong>Expanding Periwound Erythema</strong>
                <span>Redness spreading rapidly outward (&gt; 2 cm) from the wound edge, signaling advancing cellulitis.</span>
              </div>

              <div className="sign-card">
                <div className="sign-icon red"><AlertTriangle size={18} /></div>
                <strong>Purulent Drainage & Malodor</strong>
                <span>Thick yellow, green, or cloudy exudate accompanied by strong, persistent foul odor.</span>
              </div>

              <div className="sign-card">
                <div className="sign-icon red"><AlertCircle size={18} /></div>
                <strong>Escalating or Disproportionate Pain</strong>
                <span>Sudden onset of severe throbbing pain, particularly in previously insensitive neuropathic feet.</span>
              </div>

              <div className="sign-card">
                <div className="sign-icon red"><Bandage size={18} /></div>
                <strong>Necrotic Black/Gray Slough</strong>
                <span>Rapid darkening of tissue or formation of leathery black eschar indicating deep tissue death or ischemia.</span>
              </div>

              <div className="sign-card">
                <div className="sign-icon red"><Stethoscope size={18} /></div>
                <strong>Stalled Healing Exceeding 4 Weeks</strong>
                <span>Wounds that show zero measurable area reduction over 3 to 4 weeks require multidisciplinary diagnostic workup.</span>
              </div>
            </div>

            <div className="urgent-action-box">
              <p>
                <strong>Immediate Action Required:</strong> If you observe any of these warning signs, seek immediate care at an emergency department, urgent care clinic, or acute wound care center. WoundWatch AI does not provide real-time triage or emergency medical advice.
              </p>
            </div>
          </div>

          <MedicalDisclaimer />
        </div>
      </section>
    </div>
  )
}
