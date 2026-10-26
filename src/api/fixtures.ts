import type { CheckedGame, GameCheck, Health, PoolId, PoolSummary } from './types.ts'

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

function accepted(
  index: number,
  color: 'white' | 'black',
  date: string,
  opening: string,
  result: string,
  moves: number,
): CheckedGame {
  return {
    index,
    accepted: true,
    reason: 'ok',
    color,
    white: 'SomeName',
    black: 'Opponent',
    date,
    opening,
    result,
    moves,
  }
}

function refused(
  index: number,
  reason: CheckedGame['reason'],
  moves: number | null,
): CheckedGame {
  return {
    index,
    accepted: false,
    reason,
    color: null,
    white: 'SomeName',
    black: 'Opponent',
    date: '2017.03.20',
    opening: null,
    result: '1-0',
    moves,
  }
}

const checkedGames: CheckedGame[] = [
  accepted(0, 'white', '2017.02.14', 'Italian Game', '1-0', 42),
  accepted(1, 'black', '2017.02.18', 'French Defense', '0-1', 55),
  accepted(2, 'white', '2017.02.21', 'Sicilian Defense', '1/2-1/2', 61),
  accepted(3, 'black', '2017.03.01', 'Caro-Kann Defense', '1-0', 38),
  accepted(4, 'white', '2017.03.04', "Queen's Gambit", '0-1', 47),
  accepted(5, 'black', '2017.03.08', 'English Opening', '1-0', 52),
  accepted(6, 'white', '2017.03.11', 'Ruy Lopez', '1/2-1/2', 70),
  accepted(7, 'black', '2017.03.15', 'Slav Defense', '0-1', 29),
]

// The API is absent, so the same paste can still show a recheck: rapid accepts the game classical refuses.
export function checkFixture(pool: PoolId): GameCheck {
  const ninth =
    pool === 'rapid'
      ? accepted(8, 'white', '2017.03.20', 'Scotch Game', '1-0', 44)
      : refused(8, 'wrong_pool', 44)
  return {
    pool,
    games_required: 8,
    games: [
      ...checkedGames,
      ninth,
      refused(9, 'unrated', 31),
      refused(10, 'unfinished', 22),
      refused(11, 'variant', 40),
      refused(12, 'name_missing', 35),
      refused(13, 'too_short', 6),
    ],
  }
}
