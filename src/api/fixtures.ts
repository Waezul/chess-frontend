import type { BinRow, Health, PoolCard, PoolId, PoolSummary } from './types.ts'

export const healthFixture: Health = {
  ok: true,
  engine: 'ready',
  pools: ['classical', 'rapid'],
}

// Bullet is on the live pools contract. The sample in frontend.md stops at blitz.
export const poolsFixture: PoolSummary[] = [
  {
    id: 'classical',
    label: 'Lichess classical',
    available: true,
    unavailable_reason: null,
    games_required: 8,
    elo_min: 800,
    elo_max: 2400,
    depth: 10,
    revision: 'classical8-v1',
    ship_ready: false,
  },
  {
    id: 'rapid',
    label: 'Lichess rapid',
    available: true,
    unavailable_reason: null,
    games_required: 8,
    elo_min: 800,
    elo_max: 2400,
    depth: 10,
    revision: 'rapid8-v2',
    ship_ready: false,
  },
  {
    id: 'blitz',
    label: 'Lichess blitz',
    available: false,
    unavailable_reason: 'Coming Soon.',
    games_required: 8,
    elo_min: 800,
    elo_max: 2400,
    depth: 10,
    revision: null,
    ship_ready: false,
  },
  {
    id: 'bullet',
    label: 'Lichess bullet',
    available: false,
    unavailable_reason: 'Coming Soon.',
    games_required: 8,
    elo_min: 800,
    elo_max: 2400,
    depth: 10,
    revision: null,
    ship_ready: false,
  },
]

const classicalBins: BinRow[] = [
  { bin: '800–1000', n: 140, mae: 145.8, bias: 120.5, coverage: 0.68, median_width: 321 },
  { bin: '1000–1200', n: 140, mae: 127.0, bias: 64.3, coverage: 0.89, median_width: 395 },
  { bin: '1200–1400', n: 140, mae: 129.9, bias: 38.3, coverage: 0.81, median_width: 450 },
  { bin: '1400–1600', n: 140, mae: 106.7, bias: 17.6, coverage: 0.86, median_width: 470 },
  { bin: '1600–1800', n: 140, mae: 115.6, bias: 4.7, coverage: 0.84, median_width: 456 },
  { bin: '1800–2000', n: 140, mae: 125.0, bias: -24.4, coverage: 0.84, median_width: 411 },
  { bin: '2000–2200', n: 140, mae: 133.6, bias: -89.6, coverage: 0.79, median_width: 374 },
  { bin: '2200–2400', n: 139, mae: 104.4, bias: -79.2, coverage: 0.71, median_width: 250 },
]

const rapidBins: BinRow[] = [
  { bin: '800–1000', n: 300, mae: 139.7, bias: 110.4, coverage: 0.67, median_width: 331 },
  { bin: '1000–1200', n: 300, mae: 168.3, bias: 102.0, coverage: 0.84, median_width: 484 },
  { bin: '1200–1400', n: 300, mae: 162.7, bias: 76.0, coverage: 0.86, median_width: 580 },
  { bin: '1400–1600', n: 300, mae: 172.9, bias: 12.6, coverage: 0.81, median_width: 584 },
  { bin: '1600–1800', n: 300, mae: 155.3, bias: -14.3, coverage: 0.84, median_width: 588 },
  { bin: '1800–2000', n: 300, mae: 152.3, bias: -71.8, coverage: 0.85, median_width: 560 },
  { bin: '2000–2200', n: 299, mae: 143.5, bias: -80.1, coverage: 0.84, median_width: 476 },
  { bin: '2200–2400', n: 299, mae: 122.8, bias: -79.8, coverage: 0.72, median_width: 302 },
]

function poolSummary(id: PoolId): PoolSummary {
  const pool = poolsFixture.find((item) => item.id === id)
  if (!pool) throw new Error(`Missing pool fixture ${id}`)
  return pool
}

function scoredCard(
  id: PoolId,
  card: Pick<PoolCard, 'source_label' | 'test_players' | 'summary' | 'bins'>,
): PoolCard {
  return { ...poolSummary(id), ...card }
}

function unavailableCard(id: PoolId): PoolCard {
  const pool = poolSummary(id)
  if (!pool.unavailable_reason) throw new Error(`Missing unavailable reason for ${id}`)
  return {
    ...pool,
    source_label: pool.label,
    test_players: 0,
    summary: [pool.unavailable_reason],
    bins: [],
  }
}

const poolCards: Record<PoolId, PoolCard> = {
  classical: scoredCard('classical', {
    source_label: 'Lichess classical, February 2017',
    test_players: 1119,
    summary: [
      'This is a lab estimate. The ship bar was a typical miss of 120 Elo or better, and the test missed by 124.',
      '68% of 1,119 held-out players landed within 150 Elo. The band caught 80% of them.',
      'Players from 800 to 1000 were guessed about 121 Elo too high. Players from 2000 to 2200 were guessed about 90 Elo too low.',
    ],
    bins: classicalBins,
  }),
  rapid: scoredCard('rapid', {
    source_label: 'Lichess rapid, September 2026',
    test_players: 2398,
    summary: [
      'This is a lab estimate. The ship bar was a typical miss of 120 Elo or better, and the test missed by 152.',
      '58% of 2,398 held-out players landed within 150 Elo. The band caught 80% of them.',
      'Players from 800 to 1000 were guessed about 110 Elo too high, and players from 1000 to 1200 about 102 too high. Players from 2000 to 2200 were guessed about 80 Elo too low.',
    ],
    bins: rapidBins,
  }),
  blitz: unavailableCard('blitz'),
  bullet: unavailableCard('bullet'),
}

export function poolCardFixture(id: PoolId): PoolCard {
  return poolCards[id]
}
