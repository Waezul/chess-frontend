import { getEstimate, getPool } from '../api/client.ts'
import { ApiError, isAbortError, messageFrom, POOLS_FAILED } from '../api/errors.ts'
import type { PoolSummary } from '../api/types.ts'
import { postedReadFor } from '../upload/postedRead.ts'
import { reportBlocks, runningText, type ReportBlock } from './present.ts'

export const READ_UNLOADED = 'The read could not be loaded. Reload the page and try again.'
const READ_FAILED = 'The read could not be finished. Try again.'

export type ReportView =
  | { kind: 'running'; text: string }
  | { kind: 'failed'; message: string }
  | { kind: 'expired' }
  | { kind: 'done'; blocks: ReportBlock[] }

export async function loadReport(id: string, signal: AbortSignal): Promise<ReportView> {
  let job
  try {
    job = await getEstimate(id, signal)
  } catch (error) {
    if (isAbortError(error)) throw error
    if (error instanceof ApiError && (error.status === 404 || error.code === 'unknown_job')) {
      return { kind: 'expired' }
    }
    return { kind: 'failed', message: messageFrom(error, READ_UNLOADED) }
  }

  if (job.status === 'failed') {
    const message = job.message.trim()
    return { kind: 'failed', message: message || READ_FAILED }
  }

  if (job.status !== 'done') {
    const known = postedReadFor(job.id) ?? postedReadFor(id)
    return { kind: 'running', text: runningText(known?.depth ?? null) }
  }

  let pool: PoolSummary | null = null
  let poolNotice: string | null = null
  try {
    pool = await getPool(job.estimate.pool, signal)
  } catch (error) {
    if (isAbortError(error)) throw error
    poolNotice = messageFrom(error, POOLS_FAILED)
  }

  const posted = postedReadFor(job.id) ?? postedReadFor(id)
  return {
    kind: 'done',
    blocks: reportBlocks({
      estimate: job.estimate,
      pool,
      poolNotice,
      games: posted ? posted.games : null,
    }),
  }
}
