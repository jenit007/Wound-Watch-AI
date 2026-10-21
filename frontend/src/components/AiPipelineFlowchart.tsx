import { useState } from 'react'
import { AlertCircle, AlertTriangle, ArrowDown, Camera, CheckCircle2, Cpu, Eye, FileText, Layers, RefreshCw, Ruler, ShieldCheck, XCircle } from 'lucide-react'

export default function AiPipelineFlowchart() {
  const [selectedBranch, setSelectedBranch] = useState<'normal' | 'blur' | 'noscale' | 'apierror'>('normal')

  return (
    <div className="flowchart-container" role="region" aria-label="Computer vision pipeline flowchart">
      <div className="flowchart-intro">
        <div className="flowchart-tag">
          <Cpu size={14} /> COMPUTER VISION ARCHITECTURE
        </div>
        <h4>End-to-End Image Analysis & Monitoring Pipeline</h4>
        <p>Interactive dataflow showing image capture, validation gates, calibration branching, AI segmentation, and error recovery states.</p>
      </div>

      <div className="pipeline-controls">
        <span>Simulate pipeline branch:</span>
        <button
          type="button"
          className={`branch-toggle-btn ${selectedBranch === 'normal' ? 'active' : ''}`}
          onClick={() => setSelectedBranch('normal')}
        >
          Optimal Path (With Scale)
        </button>
        <button
          type="button"
          className={`branch-toggle-btn ${selectedBranch === 'noscale' ? 'active' : ''}`}
          onClick={() => setSelectedBranch('noscale')}
        >
          No Scale Marker (Pixel-Only)
        </button>
        <button
          type="button"
          className={`branch-toggle-btn ${selectedBranch === 'blur' ? 'active' : ''}`}
          onClick={() => setSelectedBranch('blur')}
        >
          Image Blur / Validation Failure
        </button>
        <button
          type="button"
          className={`branch-toggle-btn ${selectedBranch === 'apierror' ? 'active' : ''}`}
          onClick={() => setSelectedBranch('apierror')}
        >
          API Timeout / Error State
        </button>
      </div>

      <div className="pipeline-visual">
        {/* Step 1: Image Capture */}
        <div className="pipe-stage">
          <div className="pipe-step-num">STEP 1</div>
          <div className="pipe-card">
            <div className="pipe-card-icon blue"><Camera size={18} /></div>
            <div className="pipe-card-content">
              <strong>Image Acquisition</strong>
              <p>JPEG, PNG, or WebP photo captured via browser camera or file upload (≤ 10 MB limit).</p>
            </div>
          </div>
        </div>

        <div className="pipe-arrow"><ArrowDown size={18} /></div>

        {/* Step 2: Quality & Validation Gate */}
        <div className="pipe-stage">
          <div className="pipe-step-num">STEP 2</div>
          <div className={`pipe-card ${selectedBranch === 'blur' ? 'highlight-error' : ''}`}>
            <div className="pipe-card-icon amber"><Eye size={18} /></div>
            <div className="pipe-card-content">
              <strong>Client-Side Validation Gate</strong>
              <p>Check image resolution, file integrity, aspect ratio, and blur threshold.</p>
            </div>
          </div>

          {selectedBranch === 'blur' ? (
            <div className="pipe-subbranch error">
              <div className="subbranch-badge"><XCircle size={14} /> EXCEPTION BRANCH: LOW QUALITY / BLURRED IMAGE</div>
              <p><strong>Validation Failed:</strong> The image does not meet clarity criteria. The system prompts the user for immediate retake with steady lighting before sending data over the network.</p>
              <span className="pipe-action-chip"><RefreshCw size={12} /> Action: Prompt Camera Retake</span>
            </div>
          ) : (
            <div className="pipe-subbranch-pass">
              <CheckCircle2 size={13} className="text-emerald" /> Image clarity validated. Proceeding to scale detection.
            </div>
          )}
        </div>

        {selectedBranch !== 'blur' && (
          <>
            <div className="pipe-arrow"><ArrowDown size={18} /></div>

            {/* Step 3: Reference Scale Detection */}
            <div className="pipe-stage">
              <div className="pipe-step-num">STEP 3</div>
              <div className={`pipe-card ${selectedBranch === 'noscale' ? 'highlight-warn' : ''}`}>
                <div className="pipe-card-icon teal"><Ruler size={18} /></div>
                <div className="pipe-card-content">
                  <strong>Scale Fiducial Detection</strong>
                  <p>Fiducial marker analysis to establish physical pixels-per-centimeter ratio.</p>
                </div>
              </div>

              {selectedBranch === 'noscale' ? (
                <div className="pipe-subbranch warning">
                  <div className="subbranch-badge"><AlertCircle size={14} /> EXCEPTION BRANCH: SCALE FIDUCIAL ABSENT</div>
                  <p><strong>Physical Scale Unavailable:</strong> System gracefully computes <em>wound_area_px</em> only. Field <em>wound_area_cm2</em> is reported as <code>null</code> / unavailable to prevent fabricated metric claims.</p>
                  <span className="pipe-action-chip"><AlertTriangle size={12} /> Metric: Pixel Area Only</span>
                </div>
              ) : (
                <div className="pipe-subbranch-pass">
                  <CheckCircle2 size={13} className="text-emerald" /> Calibrated scale detected. Physical cm² enabled.
                </div>
              )}
            </div>

            <div className="pipe-arrow"><ArrowDown size={18} /></div>

            {/* Step 4: AI Model Inference */}
            <div className="pipe-stage">
              <div className="pipe-step-num">STEP 4</div>
              <div className={`pipe-card ${selectedBranch === 'apierror' ? 'highlight-error' : ''}`}>
                <div className="pipe-card-icon purple"><Cpu size={18} /></div>
                <div className="pipe-card-content">
                  <strong>Convolutional Segmentation & Feature Extraction</strong>
                  <p>Payload submitted via <code>multipart/form-data</code> to <code>POST /api/analyze</code> with clinical metadata.</p>
                </div>
              </div>

              {selectedBranch === 'apierror' ? (
                <div className="pipe-subbranch error">
                  <div className="subbranch-badge"><XCircle size={14} /> EXCEPTION BRANCH: BACKEND SERVICE UNAVAILABLE / TIMEOUT</div>
                  <p><strong>API Error (ECONNABORTED or 5xx):</strong> Network timeout or unreachable FastAPI backend. Error message displayed with diagnostic suggestions; local session data preserved.</p>
                  <span className="pipe-action-chip"><RefreshCw size={12} /> Action: Check Server & Retry</span>
                </div>
              ) : (
                <div className="pipe-subbranch-pass">
                  <CheckCircle2 size={13} className="text-emerald" /> 200 OK: Binary mask, pixel area, and risk descriptors returned.
                </div>
              )}
            </div>

            {selectedBranch !== 'apierror' && (
              <>
                <div className="pipe-arrow"><ArrowDown size={18} /></div>

                {/* Step 5: Historical Longitudinal Comparison */}
                <div className="pipe-stage">
                  <div className="pipe-step-num">STEP 5</div>
                  <div className="pipe-card">
                    <div className="pipe-card-icon blue"><Layers size={18} /></div>
                    <div className="pipe-card-content">
                      <strong>Historical Comparison & Delta Calculation</strong>
                      <p>Retrieve prior visits for the patient. Calculate percentage change ($\Delta A$) and evaluate trend velocity.</p>
                    </div>
                  </div>
                </div>

                <div className="pipe-arrow"><ArrowDown size={18} /></div>

                {/* Step 6: Uncertainty & Warnings */}
                <div className="pipe-stage">
                  <div className="pipe-step-num">STEP 6</div>
                  <div className="pipe-card">
                    <div className="pipe-card-icon amber"><ShieldCheck size={18} /></div>
                    <div className="pipe-card-content">
                      <strong>Uncertainty Review & Warning Compilation</strong>
                      <p>Attach explainability tags and model caveats. Null and missing values remain explicitly unavailable.</p>
                    </div>
                  </div>
                </div>

                <div className="pipe-arrow"><ArrowDown size={18} /></div>

                {/* Step 7: Clinical Oversight */}
                <div className="pipe-stage">
                  <div className="pipe-step-num">STEP 7</div>
                  <div className="pipe-card highlight-final">
                    <div className="pipe-card-icon green"><FileText size={18} /></div>
                    <div className="pipe-card-content">
                      <strong>Clinical Oversight & Practitioner Review</strong>
                      <p>Report presented on results interface. Clinician makes all diagnostic, staging, and therapeutic decisions.</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
