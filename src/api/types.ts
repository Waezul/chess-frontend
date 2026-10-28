export type PoolId = 'classical' | 'rapid' | 'blitz' | 'bullet'

export type Health = {
  ok: boolean
  engine: 'ready' | 'down'
  pools: PoolId[]
}

export type PoolSummary = {
  id: PoolId
  label: string
  available: boolean
  unavailable_reason: string | null
  games_required: number
  elo_min: number
  elo_max: number
  depth: number
  revision: string | null
  ship_ready: boolean
}

export type ApiFailure = {
  error: string
  message: string
}

export type Reason =
  | 'ok'
  | 'wrong_pool'
  | 'unrated'
  | 'unfinished'
  | 'variant'
  | 'name_missing'
  | 'too_short'

export type CheckedGame = {
  index: number
  accepted: boolean
  reason: Reason
  color: 'white' | 'black' | null
  white: string
  black: string
  date: string | null
  opening: string | null
  result: string | null
  moves: number | null
}

export type GameCheck = {
  pool: PoolId
  games_required: number
  games: CheckedGame[]
}

export type EstimateRequest = {
  pool: PoolId
  pgn: string
  subject: string
  game_indexes: number[]
}

export type StartedJob = {
  id: string
  status: 'queued' | 'running'
}

export type Driver = {
  feature: string
  direction: 'higher' | 'lower'
  text: string
}

export type Estimate = {
  pool: PoolId
  revision: string
  ship_ready: boolean
  lab: boolean
  n_games: number
  depth: number
  q10: number
  q50: number
  q90: number
  drivers: Driver[]
  limits: {
    typical_error: number
    within_150: number
    coverage: number
    tail_note: string | null
  }
}

export type PolledJob =
  | { id: string; status: 'queued' | 'running' }
  | { id: string; status: 'done' }
  | { id: string; status: 'failed'; message: string }

export type EstimateJob =
  | { id: string; status: 'queued' | 'running' }
  | { id: string; status: 'done'; estimate: Estimate }
  | { id: string; status: 'failed'; message: string }
