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

export type BinRow = {
  bin: string
  n: number
  mae: number
  bias: number
  coverage: number
  median_width: number
}

export type PoolCard = PoolSummary & {
  source_label: string
  test_players: number
  bins: BinRow[]
  summary: string[]
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

export type PolledJob =
  | { id: string; status: 'queued' | 'running' }
  | { id: string; status: 'done' }
  | { id: string; status: 'failed'; message: string }
