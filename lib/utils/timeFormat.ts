export const secondsToHours = (seconds?: number) => (seconds ?? 0) / 3600

export const formatHours = (seconds?: number, decimals = 1) => {
  const hours = secondsToHours(seconds)
  return `${hours.toFixed(decimals)}h`
}

export const formatDate = (iso?: string) => {
  if (!iso) return 'N/A'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

