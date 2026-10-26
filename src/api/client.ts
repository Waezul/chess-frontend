import { AbsentApiError, ApiError, ENGINE_DOWN, errorCode, isAbortError, POOLS_FAILED, sentenceFor } from './errors.ts'
import { healthFixture, poolsFixture } from './fixtures.ts'
import type { Health, PoolSummary } from './types.ts'

const DEFAULT_API_BASE = 'http://127.0.0.1:8000'

export type LandingData = {
  health: Health | null
  healthNotice: string | null
  pools: PoolSummary[] | null
  poolsError: string | null
}

function apiBase(): string {
  const value = import.meta.env.VITE_API_BASE_URL
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

async function getJson(path: string, signal: AbortSignal): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(joinUrl(path), {
      signal,
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
  } catch (error) {
    if (isAbortError(error)) throw error
    throw new AbsentApiError()
  }

  const body = await readJson(response)
  if (!response.ok) throw new ApiError(response.status, errorCode(body), sentenceFor(body) ?? '')
  return body
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
