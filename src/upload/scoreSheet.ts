import type { CheckedGame, PoolId, Reason } from '../api/types.ts'

export type CheckedSnapshot = {
  pool: PoolId
  pgn: string
  subject: string
}

function filled(value: string | null): string | null {
  if (!value) return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function gameLine(game: Pick<CheckedGame, 'color' | 'date' | 'opening' | 'result' | 'moves'>): string {
  const parts: string[] = []
  if (game.color === 'white') parts.push('White')
  else if (game.color === 'black') parts.push('Black')
  const date = filled(game.date)
  const opening = filled(game.opening)
  const result = filled(game.result)
  if (date) parts.push(date)
  if (opening) parts.push(opening)
  if (result) parts.push(result)
  if (typeof game.moves === 'number' && Number.isFinite(game.moves)) {
    parts.push(`${game.moves} ${game.moves === 1 ? 'move' : 'moves'}`)
  }
  return parts.join(' · ')
}

export function refusalCopy(reason: Reason, poolLabel: string): string | null {
  switch (reason) {
    case 'ok':
      return null
    case 'wrong_pool':
      return `This game is another time control. The loaded model is ${poolLabel}.`
    case 'unrated':
      return 'Unrated and correspondence games are refused.'
    case 'unfinished':
      return 'The game did not end normally, so the move record is cut short.'
    case 'variant':
      return 'Only standard chess.'
    case 'name_missing':
      return 'Neither header matches the subject.'
    case 'too_short':
      return 'The subject has fewer than 10 moves.'
  }
}

export const SHOWN_GAME_LIMIT = 10
export const WATCH_GAME_LIMIT = 8

function dateKey(date: string | null): string {
  if (!date) return ''
  return date.trim().replaceAll('.', '')
}

export function byRecent(games: readonly CheckedGame[]): CheckedGame[] {
  return [...games].sort((left, right) => {
    const byDate = dateKey(right.date).localeCompare(dateKey(left.date))
    if (byDate !== 0) return byDate
    return left.index - right.index
  })
}

export function shownGames(games: readonly CheckedGame[], limit = SHOWN_GAME_LIMIT): CheckedGame[] {
  return byRecent(games).slice(0, limit)
}

export function firstAcceptedIndexes(games: readonly CheckedGame[], count: number): number[] {
  const indexes: number[] = []
  for (const game of games) {
    if (!game.accepted) continue
    indexes.push(game.index)
    if (indexes.length >= count) break
  }
  return indexes
}

export function watchLimit(gamesRequired: number | null): number {
  if (gamesRequired == null || gamesRequired < 1) return WATCH_GAME_LIMIT
  return Math.min(gamesRequired, WATCH_GAME_LIMIT)
}

export function watchedIndexes(
  games: readonly CheckedGame[],
  ticked: readonly number[],
  limit = WATCH_GAME_LIMIT,
  shownLimit = SHOWN_GAME_LIMIT,
): number[] {
  const chosen = new Set(tickedIndexes(games, ticked))
  const indexes: number[] = []
  for (const game of shownGames(games, shownLimit)) {
    if (!chosen.has(game.index)) continue
    indexes.push(game.index)
    if (indexes.length >= limit) break
  }
  return indexes
}

export function tickedIndexes(games: readonly CheckedGame[], ticked: readonly number[]): number[] {
  const accepted = new Set(games.filter((game) => game.accepted).map((game) => game.index))
  const unique = new Set<number>()
  for (const index of ticked) {
    if (accepted.has(index)) unique.add(index)
  }
  return [...unique].sort((left, right) => left - right)
}

export function canEstimate(input: {
  engineDown: boolean
  submitting: boolean
  gamesRequired: number | null
  poolId: PoolId | null
  pgn: string
  subject: string
  checked: CheckedSnapshot | null
  games: readonly CheckedGame[]
  ticked: readonly number[]
}): boolean {
  if (input.engineDown || input.submitting) return false
  if (input.gamesRequired == null || input.gamesRequired < 1) return false
  if (!input.checked || input.poolId !== input.checked.pool) return false
  if (input.pgn !== input.checked.pgn || input.subject !== input.checked.subject) return false
  return tickedIndexes(input.games, input.ticked).length === input.gamesRequired
}

// A pool change rechecks at once only when the name and the PGN are both filled.
// Typing the name or replacing the PGN waits 400ms, and an empty PGN never checks.
export function nextCheck(input: {
  hasPool: boolean
  hasPaste: boolean
  hasSubject: boolean
  trigger: 'text' | 'pool'
}): 'idle' | 'debounce' | 'now' {
  if (!input.hasPool || !input.hasPaste) return 'idle'
  if (input.trigger === 'pool') return input.hasSubject ? 'now' : 'idle'
  return 'debounce'
}
