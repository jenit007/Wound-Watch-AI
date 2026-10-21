import { ShieldAlert } from 'lucide-react'

export default function MedicalDisclaimer({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="medical-disclaimer compact">
        <ShieldAlert size={16} className="disclaimer-icon" />
        <p>
          <strong>Research Prototype Only:</strong> Not a medical device. Does not diagnose conditions or prescribe treatment.
        </p>
      </div>
    )
  }

  return (
    <aside className="medical-disclaimer" role="note" aria-label="Medical research disclaimer">
      <div className="disclaimer-header">
        <div className="disclaimer-badge">
          <ShieldAlert size={18} />
          <span>RESEARCH PROTOTYPE DISCLAIMER</span>
        </div>
      </div>
      <p className="disclaimer-text">
        <strong>WoundWatch AI is strictly an investigational software prototype</strong> developed for academic and clinical research evaluation of computer vision algorithms. It is <strong>not a medical device</strong>, has not received regulatory clearance (such as FDA 510(k) or CE mark), and is not designed, marketed, or intended for autonomous diagnosis, staging, triage, or clinical management of wounds. All algorithmic segmentations, area estimates, and healing trajectories must be verified by licensed healthcare providers.
      </p>
    </aside>
  )
}
