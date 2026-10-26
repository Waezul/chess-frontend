import type { Health, PoolSummary } from './types.ts'

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
