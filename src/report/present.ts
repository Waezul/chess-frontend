import { formatCount, roundToTen, wholeNumber, wholePercent } from '../api/format.ts'
import type { Estimate, PoolSummary } from '../api/types.ts'
import { readingLabel } from '../upload/estimatePoll.ts'
import { gameLine } from '../upload/scoreSheet.ts'
import type { PostedGame } from '../upload/postedRead.ts'

export const STILL_RUNNING = 'The read is still running.'
export const EXPIRED_LEAD = 'That read expired.'
export const EXPIRED_ACTION = 'Start it again.'
export const READ_ANOTHER = 'Read another set'
export const CENTERING_LEAD = 'We are centering your guess at'

export type ReportBlock =
  | { type: 'limit'; text: string; quiet: boolean }
  | { type: 'headline'; range: string; center: string; figure: string; played: string; count: string | null }
  | { type: 'track'; min: number; max: number; start: number; end: number; centerAt: number }
  | { type: 'pool'; text: string }
  | { type: 'tail'; text: string }
  | { type: 'drivers'; lines: { key: string; text: string }[] }
  | { type: 'games'; colors: string | null; results: string | null; rows: { key: string; text: string }[] }
  | { type: 'footer'; label: string; depth: string; revision: string }
  | { type: 'again'; label: typeof READ_ANOTHER }

type HeadlineBlock = Extract<ReportBlock, { type: 'headline' }>
type TrackBlock = Extract<ReportBlock, { type: 'track' }>

export type ReportBeat = { type: 'opening'; headline: HeadlineBlock; track: TrackBlock | null }

export const WATCH_REPLAYS = 'Watch replays'

export function reportBeats(blocks: readonly ReportBlock[]): ReportBeat[] {
  let headline: HeadlineBlock | null = null
  let track: TrackBlock | null = null
  for (const block of blocks) {
    if (block.type === 'headline' && !headline) headline = block
    if (block.type === 'track' && !track) track = block
  }
  if (!headline) return []
  return [{ type: 'opening', headline, track }]
}

export function runningText(depth: number | null): string {
  if (depth == null || !Number.isFinite(depth)) return STILL_RUNNING
  return readingLabel(depth)
}

export function limitText(estimate: Estimate): string {
  const miss = wholeNumber(estimate.limits.typical_error)
  if (!estimate.lab) return `Held-out players were missed by about ${miss} Elo.`
  const within = wholePercent(estimate.limits.within_150)
  return `Lab estimate. Held-out players were missed by about ${miss} Elo, and ${within} of them landed within 150. The ends of the ladder pull inward.`
}

export function rangeText(estimate: Estimate): string {
  return `${roundToTen(estimate.q10)}\u2013${roundToTen(estimate.q90)}`
}

export function centerText(estimate: Estimate): string {
  return `Center ${roundToTen(estimate.q50)}.`
}

export function centerFigure(estimate: Estimate): string {
  return String(roundToTen(estimate.q50))
}

export function centeringGames(count: number): string {
  if (count === 1) return 'based on this game.'
  return `based on these ${formatCount(count)} games.`
}

export function ratedGamesText(count: number, poolLabel: string): string {
  return `${formatCount(count)} rated ${poolLabel} games.`
}

export function placeOnTrack(value: number, min: number, max: number): number {
  const clipped = Math.min(max, Math.max(min, value))
  return ((clipped - min) / (max - min)) * 100
}

export function colorTally(games: readonly PostedGame[]): string | null {
  let white = 0
  let black = 0
  for (const game of games) {
    if (game.color === 'white') white += 1
    else if (game.color === 'black') black += 1
  }
  if (white > 0 && black > 0) return `${white} White and ${black} Black.`
  if (white > 0) return `${white} White.`
  if (black > 0) return `${black} Black.`
  return null
}

export function resultTally(games: readonly PostedGame[]): string | null {
  const counts = new Map<string, number>()
  const order: string[] = []
  for (const game of games) {
    const result = game.result?.trim()
    if (!result) continue
    if (!counts.has(result)) order.push(result)
    counts.set(result, (counts.get(result) ?? 0) + 1)
  }
  if (order.length === 0) return null
  return `${order.map((result) => `${counts.get(result)} ${result}`).join(', ')}.`
}

function trackBlock(estimate: Estimate, pool: PoolSummary): ReportBlock | null {
  const { elo_min: min, elo_max: max } = pool
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return null
  return {
    type: 'track',
    min,
    max,
    start: placeOnTrack(Math.min(estimate.q10, estimate.q90), min, max),
    end: placeOnTrack(Math.max(estimate.q10, estimate.q90), min, max),
    centerAt: placeOnTrack(estimate.q50, min, max),
  }
}

function tailText(estimate: Estimate): string | null {
  const note = estimate.limits.tail_note
  if (typeof note !== 'string') return null
  const trimmed = note.trim()
  return trimmed ? trimmed : null
}

export function reportBlocks(input: {
  estimate: Estimate
  pool: PoolSummary | null
  poolNotice: string | null
  games: readonly PostedGame[] | null
}): ReportBlock[] {
  const { estimate, pool } = input
  const blocks: ReportBlock[] = [
    { type: 'limit', quiet: !estimate.lab, text: limitText(estimate) },
    {
      type: 'headline',
      range: rangeText(estimate),
      center: centerText(estimate),
      figure: centerFigure(estimate),
      played: centeringGames(estimate.n_games),
      count: pool ? ratedGamesText(estimate.n_games, pool.label) : null,
    },
  ]

  if (pool) {
    const track = trackBlock(estimate, pool)
    if (track) blocks.push(track)
  } else if (input.poolNotice) {
    blocks.push({ type: 'pool', text: input.poolNotice })
  }

  const tail = tailText(estimate)
  if (tail) blocks.push({ type: 'tail', text: tail })

  const lines = estimate.drivers.flatMap((driver, index) => {
    const text = driver.text.trim()
    if (!text) return []
    return [{ key: `${driver.feature}-${index}`, text }]
  })
  if (lines.length > 0) blocks.push({ type: 'drivers', lines })

  if (input.games && input.games.length > 0) {
    const rows = input.games.flatMap((game, index) => {
      const text = gameLine(game)
      if (!text) return []
      return [{ key: `${game.index}-${index}`, text }]
    })
    const colors = colorTally(input.games)
    const results = resultTally(input.games)
    if (colors || results || rows.length > 0) {
      blocks.push({ type: 'games', colors, results, rows })
    }
  }

  const revision = estimate.revision.trim()
  if (pool && revision) {
    blocks.push({
      type: 'footer',
      label: pool.label,
      depth: `Stockfish depth ${formatCount(estimate.depth)}`,
      revision,
    })
  }

  blocks.push({ type: 'again', label: READ_ANOTHER })
  return blocks
}
