export function formatDate(date?: string): string {
  if (!date) return 'Not available'
  const parsed = new Date(`${date}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
export function formatNumber(value?: number | null): string {
  return value == null || !Number.isFinite(value) ? '—' : new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(value)
}
export function titleCase(value?: string | null): string {
  if (!value) return 'Unavailable'
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}