const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes === 0) return '0 B'
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1000)), UNITS.length - 1)
  const value = bytes / 1000 ** i
  return `${value >= 100 || i === 0 ? Math.round(value) : value.toFixed(1)} ${UNITS[i]}`
}

export function formatSpeed(bytesPerSec: number): string {
  return `${formatBytes(bytesPerSec)}/s`
}

export function formatEta(seconds: number): string {
  if (seconds < 0 || !Number.isFinite(seconds)) return '—'
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ${m % 60}m`
  const d = Math.floor(h / 24)
  if (d > 30) return '>30d'
  return `${d}d ${h % 24}h`
}

export function formatRatio(ratio: number): string {
  if (ratio < 0 || !Number.isFinite(ratio)) return '—'
  return ratio.toFixed(2)
}

export function formatPercent(fraction: number): string {
  return `${(fraction * 100).toFixed(fraction >= 1 ? 0 : 1)}%`
}

export function formatDate(unixSeconds: number): string {
  if (!unixSeconds) return '—'
  return new Date(unixSeconds * 1000).toLocaleString()
}

export function trackerHost(announce: string): string {
  try {
    return new URL(announce).hostname
  } catch {
    return announce
  }
}
