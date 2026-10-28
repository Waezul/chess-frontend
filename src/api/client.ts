import { AbsentApiError, ApiError, ENGINE_DOWN, errorCode, isAbortError, POOLS_FAILED, sentenceFor } from './errors.ts'
import { checkFromPgn } from './checkPgn.ts'
import { healthFixture, poolCardFixture, poolsFixture } from './fixtures.ts'
import type {
  BinRow,
  CheckedGame,
  Driver,
  Estimate,
  EstimateJob,
  EstimateRequest,
  GameCheck,
  Health,
  PoolCard,
  PoolId,
  PoolSummary,
  Reason,
  PolledJob,
  StartedJob,
} from './types.ts'

const DEFAULT_API_BASE = 'http://127.0.0.1:8000'

export type LandingData = {
  health: Health | null
  healthNotice: string | null
  pools: PoolSummary[] | null
  poolsError: string | null
}

function apiBase(): string {
  const value = import.meta.env?.VITE_API_BASE_URL
  if (typeof value === 'string' && value.trim()) return value.trim().replace(/\/+$/, '')
  return DEFAULT_API_BASE
}

function joinUrl(path: string): string {
  return `${apiBase()}${path.startsWith('/') ? path : `/${path}`}`
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

async function requestJson(
  path: string,
  init: { method?: string; body?: string; signal: AbortSignal },
): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(joinUrl(path), {
      method: init.method ?? 'GET',
      body: init.body,
      signal: init.signal,
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
    })
  } catch (error) {
    if (isAbortError(error)) throw error
    throw new AbsentApiError()
  }

  const body = await readJson(response)
  if (!response.ok) throw new ApiError(response.status, errorCode(body), sentenceFor(body) ?? '')
  return body
}

async function getJson(path: string, signal: AbortSignal): Promise<unknown> {
  return requestJson(path, { signal })
}

function isHealth(value: unknown): value is Health {
  if (!value || typeof value !== 'object') return false
  const health = value as Health
  return (
    typeof health.ok === 'boolean' &&
    (health.engine === 'ready' || health.engine === 'down') &&
    Array.isArray(health.pools) &&
    health.pools.every((id) => typeof id === 'string')
  )
}

function isPool(value: unknown): value is PoolSummary {
  if (!value || typeof value !== 'object') return false
  const pool = value as PoolSummary
  return (
    typeof pool.id === 'string' &&
    typeof pool.label === 'string' &&
    typeof pool.available === 'boolean' &&
    (pool.unavailable_reason === null || typeof pool.unavailable_reason === 'string') &&
    typeof pool.games_required === 'number' &&
    typeof pool.elo_min === 'number' &&
    typeof pool.elo_max === 'number' &&
    typeof pool.depth === 'number' &&
    (pool.revision === null || typeof pool.revision === 'string') &&
    typeof pool.ship_ready === 'boolean'
  )
}

function parsePools(value: unknown): PoolSummary[] | null {
  if (!value || typeof value !== 'object' || !('pools' in value)) return null
  const pools = (value as { pools: unknown }).pools
  if (!Array.isArray(pools) || !pools.every(isPool)) return null
  return pools
}

export async function getHealth(signal: AbortSignal): Promise<Health> {
  try {
    const body = await getJson('/v1/health', signal)
    if (!isHealth(body)) throw new ApiError(200, '', '')
    return body
  } catch (error) {
    if (error instanceof AbsentApiError) return healthFixture
    throw error
  }
}

export async function getPools(signal: AbortSignal): Promise<PoolSummary[]> {
  try {
    const body = await getJson('/v1/pools', signal)
    const pools = parsePools(body)
    if (!pools) throw new ApiError(200, '', '')
    return pools
  } catch (error) {
    if (error instanceof AbsentApiError) return poolsFixture
    throw error
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isBinRow(value: unknown): value is BinRow {
  if (!value || typeof value !== 'object') return false
  const row = value as BinRow
  return (
    typeof row.bin === 'string' &&
    row.bin.length > 0 &&
    isFiniteNumber(row.n) &&
    isFiniteNumber(row.mae) &&
    isFiniteNumber(row.bias) &&
    isFiniteNumber(row.coverage) &&
    isFiniteNumber(row.median_width)
  )
}

function parsePoolCard(value: unknown): PoolCard | null {
  if (!isPool(value)) return null
  const card = value as PoolCard
  if (!isPoolId(card.id)) return null
  if (typeof card.source_label !== 'string' || card.source_label.trim().length === 0) return null
  if (!isFiniteNumber(card.test_players)) return null
  if (!Array.isArray(card.summary) || !card.summary.every((line) => typeof line === 'string')) return null
  if (!Array.isArray(card.bins) || !card.bins.every(isBinRow)) return null
  return {
    id: card.id,
    label: card.label,
    available: card.available,
    unavailable_reason: card.unavailable_reason,
    games_required: card.games_required,
    elo_min: card.elo_min,
    elo_max: card.elo_max,
    depth: card.depth,
    revision: card.revision,
    ship_ready: card.ship_ready,
    source_label: card.source_label,
    test_players: card.test_players,
    summary: card.summary,
    bins: card.bins,
  }
}

export async function getPool(id: PoolId, signal: AbortSignal): Promise<PoolCard> {
  try {
    const body = await getJson(`/v1/pools/${encodeURIComponent(id)}`, signal)
    const card = parsePoolCard(body)
    if (!card || card.id !== id) throw new ApiError(200, '', '')
    return card
  } catch (error) {
    if (error instanceof AbsentApiError) return poolCardFixture(id)
    throw error
  }
}

function noticeFrom(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.message) return error.message
  return fallback
}

export async function loadLanding(signal: AbortSignal): Promise<LandingData> {
  const [healthResult, poolsResult] = await Promise.allSettled([getHealth(signal), getPools(signal)])
  if (signal.aborted) throw new DOMException('The operation was aborted.', 'AbortError')

  let health: Health | null = null
  let healthNotice: string | null = null
  if (healthResult.status === 'fulfilled') {
    health = healthResult.value
    if (health.engine === 'down') healthNotice = ENGINE_DOWN
  } else if (isAbortError(healthResult.reason)) {
    throw healthResult.reason
  } else if (healthResult.reason instanceof ApiError && healthResult.reason.message) {
    healthNotice = healthResult.reason.message
  }

  if (poolsResult.status === 'fulfilled') {
    return { health, healthNotice, pools: poolsResult.value, poolsError: null }
  }
  if (isAbortError(poolsResult.reason)) throw poolsResult.reason
  return {
    health,
    healthNotice,
    pools: null,
    poolsError: noticeFrom(poolsResult.reason, POOLS_FAILED),
  }
}

const REASONS = new Set<Reason>([
  'ok',
  'wrong_pool',
  'unrated',
  'unfinished',
  'variant',
  'name_missing',
  'too_short',
])

function isPoolId(value: unknown): value is PoolId {
  return value === 'classical' || value === 'rapid' || value === 'blitz' || value === 'bullet'
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function parseCheckedGame(value: unknown): CheckedGame | null {
  if (!value || typeof value !== 'object') return null
  const game = value as CheckedGame
  if (typeof game.index !== 'number' || !Number.isInteger(game.index) || game.index < 0) return null
  if (typeof game.accepted !== 'boolean') return null
  if (!REASONS.has(game.reason)) return null
  if (!(game.color === 'white' || game.color === 'black' || game.color === null)) return null
  if (typeof game.white !== 'string' || typeof game.black !== 'string') return null
  if (!isNullableString(game.date) || !isNullableString(game.opening) || !isNullableString(game.result)) {
    return null
  }
  if (!(game.moves === null || (typeof game.moves === 'number' && Number.isFinite(game.moves)))) return null
  return {
    index: game.index,
    accepted: game.accepted,
    reason: game.reason,
    color: game.color,
    white: game.white,
    black: game.black,
    date: game.date,
    opening: game.opening,
    result: game.result,
    moves: game.moves,
  }
}

function parseGameCheck(value: unknown): GameCheck | null {
  if (!value || typeof value !== 'object') return null
  const body = value as GameCheck
  if (!isPoolId(body.pool)) return null
  if (typeof body.games_required !== 'number' || !Number.isInteger(body.games_required)) return null
  if (!Array.isArray(body.games)) return null
  const games: CheckedGame[] = []
  const seen = new Set<number>()
  for (const item of body.games) {
    const game = parseCheckedGame(item)
    if (!game || seen.has(game.index)) return null
    seen.add(game.index)
    games.push(game)
  }
  return { pool: body.pool, games_required: body.games_required, games }
}

function parseStartedJob(value: unknown): StartedJob | null {
  if (!value || typeof value !== 'object') return null
  const job = value as StartedJob
  if (typeof job.id !== 'string' || !job.id.trim()) return null
  if (job.status !== 'queued' && job.status !== 'running') return null
  return { id: job.id, status: job.status }
}

export async function checkGames(
  body: { pool: PoolId; pgn: string; subject: string },
  signal: AbortSignal,
): Promise<GameCheck> {
  try {
    const response = await requestJson('/v1/games:check', {
      method: 'POST',
      body: JSON.stringify(body),
      signal,
    })
    const parsed = parseGameCheck(response)
    if (!parsed) throw new ApiError(200, '', '')
    return parsed
  } catch (error) {
    if (error instanceof AbsentApiError) {
      const gamesRequired = poolsFixture.find((pool) => pool.id === body.pool)?.games_required ?? 8
      return checkFromPgn({
        pool: body.pool,
        pgn: body.pgn,
        subject: body.subject,
        gamesRequired,
      })
    }
    throw error
  }
}

function parsePolledJob(value: unknown): PolledJob | null {
  if (!value || typeof value !== 'object') return null
  const job = value as { id?: unknown; status?: unknown; error?: unknown; message?: unknown }
  if (typeof job.id !== 'string' || !job.id.trim()) return null
  if (job.status === 'queued' || job.status === 'running' || job.status === 'done') {
    return { id: job.id, status: job.status }
  }
  if (job.status !== 'failed') return null
  return { id: job.id, status: 'failed', message: sentenceFor(job) ?? '' }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function parseDriver(value: unknown): Driver | null {
  if (!value || typeof value !== 'object') return null
  const driver = value as Driver
  if (typeof driver.feature !== 'string') return null
  if (driver.direction !== 'higher' && driver.direction !== 'lower') return null
  if (typeof driver.text !== 'string') return null
  return { feature: driver.feature, direction: driver.direction, text: driver.text }
}

function parseEstimate(value: unknown): Estimate | null {
  if (!value || typeof value !== 'object') return null
  const body = value as Estimate
  if (!isPoolId(body.pool)) return null
  if (typeof body.revision !== 'string') return null
  if (typeof body.ship_ready !== 'boolean' || typeof body.lab !== 'boolean') return null
  if (!isFiniteNumber(body.n_games) || !isFiniteNumber(body.depth)) return null
  if (!isFiniteNumber(body.q10) || !isFiniteNumber(body.q50) || !isFiniteNumber(body.q90)) return null
  if (!Array.isArray(body.drivers)) return null
  const drivers: Driver[] = []
  for (const item of body.drivers) {
    const driver = parseDriver(item)
    if (!driver) return null
    drivers.push(driver)
  }
  const limits = body.limits
  if (!limits || typeof limits !== 'object') return null
  if (!isFiniteNumber(limits.typical_error) || !isFiniteNumber(limits.within_150) || !isFiniteNumber(limits.coverage)) {
    return null
  }
  if (!(limits.tail_note === null || typeof limits.tail_note === 'string')) return null
  return {
    pool: body.pool,
    revision: body.revision,
    ship_ready: body.ship_ready,
    lab: body.lab,
    n_games: body.n_games,
    depth: body.depth,
    q10: body.q10,
    q50: body.q50,
    q90: body.q90,
    drivers,
    limits: {
      typical_error: limits.typical_error,
      within_150: limits.within_150,
      coverage: limits.coverage,
      tail_note: limits.tail_note,
    },
  }
}

function parseEstimateJob(value: unknown): EstimateJob | null {
  const job = parsePolledJob(value)
  if (!job) return null
  if (job.status !== 'done') return job
  if (!value || typeof value !== 'object' || !('estimate' in value)) return null
  const estimate = parseEstimate((value as { estimate: unknown }).estimate)
  if (!estimate) return null
  return { id: job.id, status: 'done', estimate }
}

export async function getEstimate(id: string, signal: AbortSignal): Promise<EstimateJob> {
  const response = await requestJson(`/v1/estimates/${encodeURIComponent(id)}`, { signal })
  const parsed = parseEstimateJob(response)
  if (!parsed) throw new ApiError(200, '', '')
  return parsed
}

export async function getPool(id: PoolId, signal: AbortSignal): Promise<PoolSummary> {
  const body = await getJson(`/v1/pools/${encodeURIComponent(id)}`, signal)
  if (!isPool(body) || body.id !== id) throw new ApiError(200, '', '')
  return {
    id,
    label: body.label,
    available: body.available,
    unavailable_reason: body.unavailable_reason,
    games_required: body.games_required,
    elo_min: body.elo_min,
    elo_max: body.elo_max,
    depth: body.depth,
    revision: body.revision,
    ship_ready: body.ship_ready,
  }
}

export async function postEstimate(body: EstimateRequest, signal: AbortSignal): Promise<StartedJob> {
  const response = await requestJson('/v1/estimates', {
    method: 'POST',
    body: JSON.stringify(body),
    signal,
  })
  const parsed = parseStartedJob(response)
  if (!parsed) throw new ApiError(202, '', '')
  return parsed
}
