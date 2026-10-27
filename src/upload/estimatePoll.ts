import { ApiError, isAbortError, messageFrom } from '../api/errors.ts'
import type { PolledJob } from '../api/types.ts'

export type { PolledJob } from '../api/types.ts'

export const POLL_INTERVAL_MS = 1000
export const POLL_DEADLINE_MS = 90_000
export const READ_TIMEOUT = 'The read took too long. Try again.'
const READ_FAILED = 'The read could not be finished. Try again.'

export type PollOutcome =
  | { type: 'done'; id: string }
  | { type: 'failed'; message: string }
  | { type: 'timeout' }
  | { type: 'cancelled' }
  | { type: 'rejected'; message: string }

export function readingLabel(depth: number): string {
  return `Reading the games with Stockfish, depth ${depth}.`
}

export function settleRead(outcome: PollOutcome): { reportId: string | null; error: string | null } {
  if (outcome.type === 'done') return { reportId: outcome.id, error: null }
  if (outcome.type === 'cancelled') return { reportId: null, error: null }
  if (outcome.type === 'timeout') return { reportId: null, error: READ_TIMEOUT }
  return { reportId: null, error: outcome.message }
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('The operation was aborted.', 'AbortError'))
      return
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(new DOMException('The operation was aborted.', 'AbortError'))
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

export async function pollEstimate(input: {
  id: string
  signal: AbortSignal
  read: (id: string, signal: AbortSignal) => Promise<PolledJob>
  wait?: (ms: number, signal: AbortSignal) => Promise<void>
  now?: () => number
  intervalMs?: number
  deadlineMs?: number
}): Promise<PollOutcome> {
  const wait = input.wait ?? delay
  const now = input.now ?? Date.now
  const intervalMs = input.intervalMs ?? POLL_INTERVAL_MS
  const deadlineMs = input.deadlineMs ?? POLL_DEADLINE_MS
  const started = now()

  while (true) {
    if (input.signal.aborted) return { type: 'cancelled' }
    try {
      await wait(intervalMs, input.signal)
    } catch (error) {
      if (input.signal.aborted || isAbortError(error)) return { type: 'cancelled' }
      throw error
    }
    if (input.signal.aborted) return { type: 'cancelled' }
    if (now() - started >= deadlineMs) return { type: 'timeout' }

    try {
      const job = await input.read(input.id, input.signal)
      if (input.signal.aborted) return { type: 'cancelled' }
      if (job.status === 'done') return { type: 'done', id: job.id }
      if (job.status === 'failed') {
        return { type: 'failed', message: job.message.trim() || READ_FAILED }
      }
    } catch (error) {
      if (input.signal.aborted || isAbortError(error)) return { type: 'cancelled' }
      if (error instanceof ApiError) {
        return { type: 'rejected', message: messageFrom(error, READ_FAILED) }
      }
      if (now() - started >= deadlineMs) return { type: 'timeout' }
    }
  }
}
