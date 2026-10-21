import { useState } from 'react'
import { AlertCircle, AlertTriangle, ArrowDown, CheckCircle2, Clock, HelpCircle, ShieldAlert, Stethoscope } from 'lucide-react'

export default function WoundFlowchart() {
  const [activeStep, setActiveStep] = useState<number | null>(null)

  const steps = [
    {
      id: 1,
      title: '1. Initial Observation & Risk Screening',
      category: 'Screening',
      summary: 'Inspect wound margin, color, exudate, and patient systemic symptoms.',
      details: 'Assess underlying etiology (venous, arterial, pressure, diabetic neuropathy). Check systemic temperature and local skin warmth.',
    },
    {
      id: 2,
      title: '2. Immediate Red-Flag Assessment Gate',
      category: 'Triage Gate',
      summary: 'Evaluate for active spreading infection or critical limb ischemia.',
      details: 'Check for: rapid erythema expansion (>2 cm), purulent drainage, foul odor, crepitus, systemic fever, severe uncontrolled pain, or dark gangrenous tissue.',
    },
    {
      id: 3,
      title: '3. Quantitative Monitoring Interval',
      category: 'Measurement',
      summary: 'Re-measure wound dimensions at 1- to 2-week consistent intervals.',
      details: 'Record calibrated surface area, edge advancement, and tissue composition under standardized camera lighting and distance.',
    },
    {
      id: 4,
      title: '4. Trajectory Evaluation (2 to 4 Weeks)',
      category: 'Trajectory Gate',
      summary: 'Determine whether area has decreased by at least 20% to 40%.',
      details: 'Clinical evidence shows wounds failing to achieve 20–40% area reduction within 2–4 weeks are at high risk of progressing to chronic recalcitrance.',
    },
  ]

  return (
    <div className="flowchart-container" role="region" aria-label="Clinical wound assessment flowchart">
      <div className="flowchart-intro">
        <div className="flowchart-tag">
          <Stethoscope size={14} /> CLINICAL DECISION SUPPORT FLOWCHART
        </div>
        <h4>Wound Assessment & Escalation Decision Protocol</h4>
        <p>A systematic framework for evaluating wound progression, recognizing red flags, and initiating timely specialist escalation.</p>
      </div>

      <div className="flowchart-visual">
        {/* Step 1 */}
        <div className={`flow-node ${activeStep === 1 ? 'selected' : ''}`} onClick={() => setActiveStep(activeStep === 1 ? null : 1)}>
          <div className="node-badge blue">STEP 1</div>
          <div className="node-title">
            <Clock size={16} /> <strong>Initial Observation & Risk Screening</strong>
          </div>
          <p>Inspect location, wound bed, exudate volume, and underlying systemic factors (diabetes, vascular disease).</p>
        </div>

        <div className="flow-connector">
          <ArrowDown size={18} />
        </div>

        {/* Step 2 Decision Gate */}
        <div className={`flow-node decision ${activeStep === 2 ? 'selected' : ''}`} onClick={() => setActiveStep(activeStep === 2 ? null : 2)}>
          <div className="node-badge amber">CRITICAL GATE</div>
          <div className="node-title">
            <AlertTriangle size={16} /> <strong>Are Severe Red-Flag Symptoms Present?</strong>
          </div>
          <p>Rapid spreading redness, fever, severe pain, foul odor, or sudden blackening/ischemia?</p>
        </div>

        {/* Branching row for Step 2 */}
        <div className="flow-branch-row">
          <div className="branch-card danger">
            <div className="branch-header">
              <span className="branch-label yes">YES — RED FLAGS PRESENT</span>
              <ShieldAlert size={18} />
            </div>
            <strong>Urgent Medical Escalation</strong>
            <p>Immediate referral to emergency services, acute wound care center, or infectious disease. Do not rely on self-monitoring.</p>
          </div>

          <div className="branch-card success">
            <div className="branch-header">
              <span className="branch-label no">NO — STABLE BASELINE</span>
              <CheckCircle2 size={18} />
            </div>
            <strong>Proceed to Structured Monitoring</strong>
            <p>Maintain prescribed dressing regimen, offload pressure, and schedule standardized photography at weekly intervals.</p>
          </div>
        </div>

        <div className="flow-connector">
          <ArrowDown size={18} />
        </div>

        {/* Step 3 */}
        <div className={`flow-node ${activeStep === 3 ? 'selected' : ''}`} onClick={() => setActiveStep(activeStep === 3 ? null : 3)}>
          <div className="node-badge teal">STEP 3</div>
          <div className="node-title">
            <Stethoscope size={16} /> <strong>Standardized Interval Measurement</strong>
          </div>
          <p>Capture consistent photographs with scale markers. Log calibrated measurements across visits to evaluate longitudinal change.</p>
        </div>

        <div className="flow-connector">
          <ArrowDown size={18} />
        </div>

        {/* Step 4 Decision Gate */}
        <div className={`flow-node decision ${activeStep === 4 ? 'selected' : ''}`} onClick={() => setActiveStep(activeStep === 4 ? null : 4)}>
          <div className="node-badge amber">TRAJECTORY GATE</div>
          <div className="node-title">
            <HelpCircle size={16} /> <strong>Is Wound Area Decreasing by ≥ 20–40% at 2–4 Weeks?</strong>
          </div>
          <p>Compare baseline measurements with follow-up area data to calculate healing velocity.</p>
        </div>

        {/* Branching row for Step 4 */}
        <div className="flow-branch-row">
          <div className="branch-card success">
            <div className="branch-header">
              <span className="branch-label yes">YES — POSITIVE TRAJECTORY</span>
              <CheckCircle2 size={18} />
            </div>
            <strong>Favorable Healing Response</strong>
            <p>Continue current management plan, optimize nutritional intake, protect new epithelial tissue, and monitor until complete closure.</p>
          </div>

          <div className="branch-card warning">
            <div className="branch-header">
              <span className="branch-label no">NO — STALLED / ENLARGING</span>
              <AlertCircle size={18} />
            </div>
            <strong>Stalled Healing Protocol</strong>
            <p>Trigger multidisciplinary review: reassess arterial/venous perfusion, screen for subclinical biofilm, review glycemic control, and modify therapy.</p>
          </div>
        </div>
      </div>

      {activeStep && (
        <div className="flowchart-detail-card">
          <div className="detail-tag">STEP {activeStep} PROTOCOL DETAILS</div>
          <h5>{steps[activeStep - 1].title}</h5>
          <p>{steps[activeStep - 1].details}</p>
        </div>
      )}

      <div className="flowchart-legend">
        <span><i className="dot blue"/> Standard Action</span>
        <span><i className="dot amber"/> Decision Gate</span>
        <span><i className="dot red"/> Urgent Escalation</span>
        <span><i className="dot green"/> Normal Progression</span>
      </div>
    </div>
  )
}
