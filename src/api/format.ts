export function roundToTen(value: number): number {
  return Math.round(value / 10) * 10
}

export function wholeNumber(value: number): number {
  return Math.round(value)
}

export function wholePercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`
}

export function formatCount(value: number): string {
  if (Number.isInteger(value)) return String(value)
  return String(wholeNumber(value))
}
