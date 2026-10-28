import type { CheckedGame } from '../api/types.ts'

export type PostedGame = Pick<CheckedGame, 'index' | 'color' | 'date' | 'opening' | 'result' | 'moves'>

export type PostedRead = {
  id: string
  depth: number
  games: PostedGame[]
  subject: string
}

let current: PostedRead | null = null

export function rowsFromChecklist(
  games: readonly CheckedGame[],
  indexes: readonly number[],
): PostedGame[] {
  const byIndex = new Map(games.map((game) => [game.index, game]))
  const rows: PostedGame[] = []
  const seen = new Set<number>()
  for (const index of indexes) {
    if (seen.has(index)) continue
    seen.add(index)
    const game = byIndex.get(index)
    if (!game?.accepted || game.reason !== 'ok') continue
    rows.push({
      index: game.index,
      color: game.color,
      date: game.date,
      opening: game.opening,
      result: game.result,
      moves: game.moves,
    })
  }
  return rows
}

export function rememberPostedRead(read: Omit<PostedRead, 'subject'> & { subject?: string }) {
  current = {
    id: read.id,
    depth: read.depth,
    subject: read.subject?.trim() ?? '',
    games: read.games.map((game) => ({ ...game })),
  }
}

export function postedReadFor(id: string): PostedRead | null {
  if (!current || current.id !== id) return null
  return current
}

export function dropPostedRead() {
  current = null
}
