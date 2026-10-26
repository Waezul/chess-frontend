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
