import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ApiError } from '../src/api/errors.ts'
import { getEstimate } from '../src/api/client.ts'
import {
  POLL_DEADLINE_MS,
  POLL_INTERVAL_MS,
  READ_TIMEOUT,
  pollEstimate,
  readingLabel,
  settleRead,
  type PolledJob,
} from '../src/upload/estimatePoll.ts'

function clock() {
  let now = 0
  return {
    now: () => now,
    async wait(ms: number) {
      now += ms
    },
  }
}

test('the wait copy names the pool depth and invents no percent', () => {
  assert.equal(readingLabel(10), 'Reading the games with Stockfish, depth 10.')
  assert.equal(readingLabel(10).includes('%'), false)
})

test('a done job opens the report and a cancel opens nothing', () => {
  assert.deepEqual(settleRead({ type: 'done', id: 'job_01' }), {
    reportId: 'job_01',
    error: null,
  })
  assert.deepEqual(settleRead({ type: 'cancelled' }), {
    reportId: null,
    error: null,
  })
})

test('timeout and failure are one sentence and do not open a report', () => {
  assert.equal(READ_TIMEOUT, 'The read took too long. Try again.')
  assert.deepEqual(settleRead({ type: 'timeout' }), {
    reportId: null,
    error: 'The read took too long. Try again.',
  })
  assert.deepEqual(
    settleRead({
      type: 'failed',
      message: 'One of those games could not be scored. Pick another eight.',
    }),
    {
      reportId: null,
      error: 'One of those games could not be scored. Pick another eight.',
    },
  )
  assert.deepEqual(
    settleRead({
      type: 'rejected',
      message: 'The engine is busy. Wait a moment and try again.',
    }),
    {
      reportId: null,
      error: 'The engine is busy. Wait a moment and try again.',
    },
  )
})

test('polls once a second and stops when the job is done', async () => {
  const time = clock()
  const seen: number[] = []
  const outcome = await pollEstimate({
    id: 'job_01',
    signal: new AbortController().signal,
    now: time.now,
    wait: time.wait,
    read: async () => {
      seen.push(time.now())
      const job: PolledJob =
        seen.length < 2 ? { id: 'job_01', status: 'running' } : { id: 'job_01', status: 'done' }
      return job
    },
  })
  assert.deepEqual(outcome, { type: 'done', id: 'job_01' })
  assert.deepEqual(seen, [POLL_INTERVAL_MS, POLL_INTERVAL_MS * 2])
})

test('a failed job stops the poll and keeps the server sentence', async () => {
  const time = clock()
  let reads = 0
  const outcome = await pollEstimate({
    id: 'job_15',
    signal: new AbortController().signal,
    now: time.now,
    wait: time.wait,
    read: async () => {
      reads += 1
      return {
        id: 'job_15',
        status: 'failed',
        message: 'One of those games could not be scored. Pick another eight.',
      }
    },
  })
  assert.deepEqual(outcome, {
    type: 'failed',
    message: 'One of those games could not be scored. Pick another eight.',
  })
  assert.equal(reads, 1)
  assert.equal(time.now(), POLL_INTERVAL_MS)
})

test('cancel drops the poll before the next read', async () => {
  const controller = new AbortController()
  let reads = 0
  const outcome = await pollEstimate({
    id: 'job_01',
    signal: controller.signal,
    wait: async (_ms, signal) => {
      controller.abort()
      if (signal.aborted) throw new DOMException('The operation was aborted.', 'AbortError')
    },
    read: async () => {
      reads += 1
      return { id: 'job_01', status: 'running' }
    },
  })
  assert.deepEqual(outcome, { type: 'cancelled' })
  assert.equal(reads, 0)
})

test('the read stops at 90 seconds without another poll', async () => {
  const time = clock()
  let reads = 0
  const outcome = await pollEstimate({
    id: 'job_01',
    signal: new AbortController().signal,
    now: time.now,
    wait: time.wait,
    read: async () => {
      reads += 1
      return { id: 'job_01', status: 'queued' }
    },
  })
  assert.deepEqual(outcome, { type: 'timeout' })
  assert.equal(time.now(), POLL_DEADLINE_MS)
  assert.equal(reads, POLL_DEADLINE_MS / POLL_INTERVAL_MS - 1)
})

test('a transport error keeps polling until the job is done', async () => {
  const time = clock()
  let reads = 0
  const outcome = await pollEstimate({
    id: 'job_01',
    signal: new AbortController().signal,
    now: time.now,
    wait: time.wait,
    read: async () => {
      reads += 1
      if (reads === 1) throw new Error('network')
      return { id: 'job_01', status: 'done' }
    },
  })
  assert.deepEqual(outcome, { type: 'done', id: 'job_01' })
  assert.equal(reads, 2)
})

test('429 and 503 stop the poll and surface the server sentence', async () => {
  const outcome = await pollEstimate({
    id: 'job_01',
    signal: new AbortController().signal,
    wait: async () => {},
    read: async () => {
      throw new ApiError(429, 'busy', 'The engine is busy. Wait a moment and try again.')
    },
  })
  assert.deepEqual(outcome, {
    type: 'rejected',
    message: 'The engine is busy. Wait a moment and try again.',
  })
})

test('getEstimate accepts a done job and a failed sentence', async () => {
  const previous = globalThis.fetch
  const bodies = new Map<string, { status: number; body: unknown }>([
    ['http://127.0.0.1:8000/v1/estimates/job_done', { status: 200, body: { id: 'job_done', status: 'done', estimate: { q50: 1706 } } }],
    [
      'http://127.0.0.1:8000/v1/estimates/job_bad',
      {
        status: 200,
        body: {
          id: 'job_bad',
          status: 'failed',
          error: 'unreadable',
          message: 'One of those games could not be scored. Pick another eight.',
        },
      },
    ],
    [
      'http://127.0.0.1:8000/v1/estimates/job_busy',
      { status: 503, body: { error: 'engine_down', message: 'The engine is down. The checklist still works.' } },
    ],
  ])
  globalThis.fetch = async (input) => {
    const found = bodies.get(String(input))
    assert.ok(found, `unexpected ${String(input)}`)
    return new Response(JSON.stringify(found.body), {
      status: found.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  try {
    assert.deepEqual(await getEstimate('job_done', new AbortController().signal), {
      id: 'job_done',
      status: 'done',
    })
    assert.deepEqual(await getEstimate('job_bad', new AbortController().signal), {
      id: 'job_bad',
      status: 'failed',
      message: 'One of those games could not be scored. Pick another eight.',
    })
    await assert.rejects(getEstimate('job_busy', new AbortController().signal), (error: unknown) => {
      assert.ok(error instanceof ApiError)
      assert.equal(error.status, 503)
      assert.equal(error.message, 'The engine is down. The checklist still works.')
      return true
    })
  } finally {
    globalThis.fetch = previous
  }
})
