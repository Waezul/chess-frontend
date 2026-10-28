import type { PoolCard, PoolId } from '../api/types.ts'
import { integerElo, signedBias, wholePercent } from '../format/numbers.ts'

export type MethodRow = {
  bin: string
  players: string
  miss: string
  bias: string
  coverage: string
  width: string
}

export type MethodView = {
  title: string
  paragraphs: string[]
  rows: MethodRow[]
  caption: string
  showTable: boolean
}

export function methodPoolId(selected: PoolId | null): PoolId {
  return selected ?? 'classical'
}

export function methodLine(
  card: Pick<PoolCard, 'source_label' | 'depth' | 'games_required' | 'revision'>,
): string {
  const parts = [
    `${card.source_label}.`,
    `Stockfish depth ${card.depth}.`,
    `${card.games_required} games.`,
  ]
  if (card.revision) parts.push(`Revision ${card.revision}.`)
  return parts.join(' ')
}

export function presentPoolCard(card: PoolCard): MethodView {
  return {
    title: card.label,
    paragraphs: card.summary.filter((line) => line.trim().length > 0),
    rows: card.bins.map((row) => ({
      bin: row.bin,
      players: integerElo(row.n),
      miss: integerElo(row.mae),
      bias: signedBias(row.bias),
      coverage: wholePercent(row.coverage),
      width: integerElo(row.median_width),
    })),
    caption: methodLine(card),
    showTable: card.bins.length > 0,
  }
}
