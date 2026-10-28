import type { Estimate, Health, PoolSummary } from './types.ts'

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

export const classicalEstimate: Estimate = {
  pool: 'classical',
  revision: 'classical8-v1',
  ship_ready: false,
  lab: true,
  n_games: 8,
  depth: 10,
  q10: 1483,
  q50: 1706,
  q90: 1958,
  drivers: [
    {
      feature: 'mistake_rate',
      direction: 'lower',
      text: 'Fewer serious mistakes than the typical game in this sample pulled the center up.',
    },
    {
      feature: 'blunder_rate',
      direction: 'lower',
      text: 'Fewer large errors pulled the center up.',
    },
    {
      feature: 'cpl_mean',
      direction: 'higher',
      text: 'Giving away more on a typical move pulled the center down.',
    },
  ],
  limits: {
    typical_error: 124,
    within_150: 0.68,
    coverage: 0.8,
    tail_note: null,
  },
}
