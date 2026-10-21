import type { ReactNode } from 'react'
export default function StatCard({ label, value, detail, icon, tone = 'teal' }: { label: string; value: string | number; detail: string; icon: ReactNode; tone?: 'teal' | 'blue' | 'amber' }) {
  return <article className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div className="stat-content"><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong><span className="stat-detail">{detail}</span></div></article>
}