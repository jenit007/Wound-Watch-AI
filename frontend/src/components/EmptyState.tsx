import { FileSearch } from 'lucide-react'
export default function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <div className="empty-state"><div className="empty-icon"><FileSearch size={25}/></div><h3>{title}</h3><p>{description}</p>{action}</div>
}