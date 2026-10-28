export function roundInt(value: number): number {
  const magnitude = Math.round(Math.abs(value))
  if (magnitude === 0) return 0
  return Math.sign(value) * magnitude
}

export function integerElo(value: number): string {
  const rounded = roundInt(value)
  return Number.isFinite(rounded) ? String(rounded) : ''
}

export function signedBias(value: number): string {
  const rounded = roundInt(value)
  if (!Number.isFinite(rounded) || rounded === 0) return '0'
  if (rounded < 0) return `\u2212${Math.abs(rounded)}`
  return `+${rounded}`
}

export function wholePercent(fraction: number): string {
  const percent = roundInt(fraction * 100)
  return Number.isFinite(percent) ? `${percent}%` : ''
}
