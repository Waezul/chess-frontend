import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getEstimate } from '../src/api/client.ts'
import { ApiError } from '../src/api/errors.ts'
import { classicalEstimate, poolsFixture } from '../src/api/fixtures.ts'
import type { Estimate } from '../src/api/types.ts'
import { loadReport } from '../src/report/loadReport.ts'
import {
  EXPIRED_ACTION,
  EXPIRED_LEAD,
  READ_ANOTHER,
  STILL_RUNNING,
  placeOnTrack,
  reportBlocks,
  runningText,
  type ReportBlock,
} from '../src/report/present.ts'
import { readingLabel } from '../src/upload/estimatePoll.ts'
import {
  dropPostedRead,
  postedReadFor,
  rememberPostedRead,
  rowsFromChecklist,
} from '../src/upload/postedRead.ts'
import { gameLine } from '../src/upload/scoreSheet.ts'
import type { CheckedGame } from '../src/api/types.ts'

const classical = poolsFixture[0]
if (!classical) throw new Error('missing classical pool')

function visible(blocks: readonly ReportBlock[]): string {
  const parts: string[] = []
  for (const block of blocks) {
    if (block.type === 'limit' || block.type === 'tail' || block.type === 'pool') parts.push(block.text)
    if (block.type === 'headline') parts.push(block.range, block.center, block.count ?? '')
    if (block.type === 'track') parts.push(String(block.min), String(block.max))
    if (block.type === 'drivers') parts.push(...block.lines.map((line) => line.text))
    if (block.type === 'games') {
      if (block.colors) parts.push(block.colors)
      if (block.results) parts.push(block.results)
      parts.push(...block.rows.map((row) => row.text))
    }
    if (block.type === 'footer') parts.push(block.label, block.depth, block.revision)
    if (block.type === 'again') parts.push(block.label)
  }
  return parts.join('\n')
}

function withEstimate(patch: Partial<Estimate> & { limits?: Partial<Estimate['limits']> }): Estimate {
  return {
    ...classicalEstimate,
    ...patch,
    limits: { ...classicalEstimate.limits, ...patch.limits },
  }
}

test('1483 / 1706 / 1958 prints as 1480–1960, center 1710', () => {
  const blocks = reportBlocks({
    estimate: classicalEstimate,
    pool: classical,
    poolNotice: null,
    games: null,
  })
  const text = visible(blocks)
  const limit = blocks[0]
  assert.equal(limit?.type, 'limit')
  if (limit?.type !== 'limit') return
  assert.equal(
    limit.text,
    'Lab estimate. Held-out players were missed by about 124 Elo, and 68% of them landed within 150. The ends of the ladder pull inward.',
  )
  assert.match(text, /1480\u20131960/)
  assert.match(text, /Center 1710\./)
  assert.match(text, /8 rated Lichess classical games\./)
  assert.equal(text.includes('1483'), false)
  assert.equal(text.includes('1706'), false)
  assert.equal(text.includes('1958'), false)
  assert.equal(text.includes('0.68'), false)
  assert.equal(text.includes('0.80'), false)
  assert.equal(text.includes('mistake_rate'), false)
  assert.equal(text.includes('blunder_rate'), false)
  assert.equal(text.includes('higher'), false)
  assert.equal(text.includes('lower'), false)
  assert.equal(text.includes('coverage'), false)
  assert.deepEqual(
    blocks.filter((block) => block.type === 'drivers').flatMap((block) => (block.type === 'drivers' ? block.lines.map((line) => line.text) : [])),
    classicalEstimate.drivers.map((driver) => driver.text),
  )
  const footer = blocks.find((block) => block.type === 'footer')
  assert.deepEqual(footer, {
    type: 'footer',
    label: 'Lichess classical',
    depth: 'Stockfish depth 10',
    revision: 'classical8-v1',
  })
  assert.equal(blocks.at(-1)?.type === 'again' && blocks.at(-1)?.label, READ_ANOTHER)
  assert.equal(blocks.some((block) => block.type === 'games'), false)
  assert.equal(blocks.some((block) => block.type === 'tail'), false)
})

test('a published model keeps the quiet line and drops the lab banner', () => {
  const blocks = reportBlocks({
    estimate: withEstimate({ lab: false, ship_ready: true }),
    pool: classical,
    poolNotice: null,
    games: null,
  })
  const limit = blocks[0]
  assert.equal(limit?.type, 'limit')
  if (limit?.type !== 'limit') return
  assert.equal(limit.quiet, true)
  assert.equal(limit.text, 'Held-out players were missed by about 124 Elo.')
  assert.equal(limit.text.includes('Lab estimate'), false)
  assert.equal(limit.text.includes('%'), false)
})

test('tail note prints only when the server sends one', () => {
  const note = 'Players this far below the middle were often guessed high.'
  const shown = reportBlocks({
    estimate: withEstimate({ q50: 980, limits: { tail_note: note } }),
    pool: classical,
    poolNotice: null,
    games: null,
  })
  assert.equal(shown.some((block) => block.type === 'tail' && block.text === note), true)
  assert.match(visible(shown), /Center 980\./)

  const hidden = reportBlocks({
    estimate: withEstimate({ limits: { tail_note: '   ' } }),
    pool: classical,
    poolNotice: null,
    games: null,
  })
  assert.equal(hidden.some((block) => block.type === 'tail'), false)
})

test('a quantile outside the ladder still prints and the mark clips to the edge', () => {
  assert.equal(placeOnTrack(700, 800, 2400), 0)
  assert.equal(placeOnTrack(2600, 800, 2400), 100)
  assert.equal(placeOnTrack(1483, 800, 2400), 42.6875)
  const blocks = reportBlocks({
    estimate: withEstimate({ q10: 700, q50: 2500, q90: 2600 }),
    pool: classical,
    poolNotice: null,
    games: null,
  })
  const track = blocks.find((block) => block.type === 'track')
  assert.deepEqual(track, { type: 'track', min: 800, max: 2400, start: 0, end: 100, centerAt: 100 })
  const text = visible(blocks)
  assert.match(text, /700\u20132600/)
  assert.match(text, /Center 2500\./)
})

test('posted rows tally White, Black, and each result, and a dropped checklist omits them', () => {
  const games: CheckedGame[] = [
    {
      index: 0,
      accepted: true,
      reason: 'ok',
      color: 'white',
      white: 'SomeName',
      black: 'Opponent',
      date: '2017.02.14',
      opening: 'Italian Game',
      result: '1-0',
      moves: 42,
    },
    {
      index: 1,
      accepted: false,
      reason: 'wrong_pool',
      color: null,
      white: 'SomeName',
      black: 'Opponent',
      date: '2017.02.14',
      opening: null,
      result: '0-1',
      moves: 31,
    },
    {
      index: 9,
      accepted: true,
      reason: 'ok',
      color: 'black',
      white: 'Opponent',
      black: 'SomeName',
      date: '2017.02.16',
      opening: 'French Defense',
      result: '1/2-1/2',
      moves: 40,
    },
    {
      index: 4,
      accepted: true,
      reason: 'ok',
      color: 'white',
      white: 'SomeName',
      black: 'Opponent',
      date: null,
      opening: null,
      result: '1-0',
      moves: 12,
    },
  ]
  const rows = rowsFromChecklist(games, [9, 0, 1, 4, 0])
  assert.deepEqual(rows.map((row) => row.index), [9, 0, 4])
  assert.equal(gameLine(rows[1]!), 'White · 2017.02.14 · Italian Game · 1-0 · 42 moves')
  assert.equal(gameLine(rows[1]!).includes('SomeName'), false)
  assert.equal(gameLine(rows[1]!).includes('2109'), false)

  dropPostedRead()
  assert.equal(postedReadFor('job_01'), null)
  const without = reportBlocks({
    estimate: classicalEstimate,
    pool: classical,
    poolNotice: null,
    games: null,
  })
  assert.equal(without.some((block) => block.type === 'games'), false)

  rememberPostedRead({ id: 'job_01', depth: 10, games: rows })
  assert.equal(postedReadFor('job_other'), null)
  const held = postedReadFor('job_01')
  const withRows = reportBlocks({
    estimate: classicalEstimate,
    pool: classical,
    poolNotice: null,
    games: held?.games ?? null,
  })
  const played = withRows.find((block) => block.type === 'games')
  assert.equal(played?.type, 'games')
  if (played?.type !== 'games') return
  assert.equal(played.colors, '2 White and 1 Black.')
  assert.equal(played.results, '1 1/2-1/2, 2 1-0.')
  assert.deepEqual(played.rows.map((row) => row.text), [
    'Black · 2017.02.16 · French Defense · 1/2-1/2 · 40 moves',
    'White · 2017.02.14 · Italian Game · 1-0 · 42 moves',
    'White · 1-0 · 12 moves',
  ])
  const text = visible(withRows)
  assert.equal(text.includes('SomeName'), false)
  assert.equal(text.includes('Opponent'), false)
  assert.equal(text.includes('2109'), false)

  dropPostedRead()
  assert.equal(postedReadFor('job_01'), null)
})

test('running copy names the depth only when this page already knows it', () => {
  assert.equal(runningText(null), STILL_RUNNING)
  assert.equal(runningText(10), readingLabel(10))
  assert.equal(runningText(10).includes('%'), false)
})

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

test('the report loads the estimate and the pool, and a reload without the checklist omits the games', async () => {
  const previous = globalThis.fetch
  dropPostedRead()
  globalThis.fetch = async (input) => {
    const url = String(input)
    if (url.endsWith('/v1/estimates/job_01')) {
      return jsonResponse(200, { id: 'job_01', status: 'done', estimate: classicalEstimate })
    }
    if (url.endsWith('/v1/pools/classical')) {
      return jsonResponse(200, {
        ...classical,
        source_label: 'Lichess classical, February 2017',
        test_players: 1119,
        summary: ['Do not render this sentence.'],
        bins: [],
      })
    }
    throw new Error(`unexpected ${url}`)
  }
  try {
    const alone = await loadReport('job_01', new AbortController().signal)
    assert.equal(alone.kind, 'done')
    if (alone.kind !== 'done') return
    const text = visible(alone.blocks)
    assert.match(text, /1480\u20131960/)
    assert.match(text, /Lab estimate/)
    assert.match(text, /classical8-v1/)
    assert.equal(text.includes('Do not render this sentence.'), false)
    assert.equal(alone.blocks.some((block) => block.type === 'games'), false)

    rememberPostedRead({
      id: 'job_01',
      depth: 10,
      games: rowsFromChecklist(
        [
          {
            index: 0,
            accepted: true,
            reason: 'ok',
            color: 'white',
            white: 'SomeName',
            black: 'Opponent',
            date: '2017.02.14',
            opening: 'Italian Game',
            result: '1-0',
            moves: 42,
          },
        ],
        [0],
      ),
    })
    const held = await loadReport('job_01', new AbortController().signal)
    assert.equal(held.kind, 'done')
    if (held.kind !== 'done') return
    assert.match(visible(held.blocks), /White · 2017\.02\.14 · Italian Game · 1-0 · 42 moves/)
    assert.equal(visible(held.blocks).includes('SomeName'), false)
  } finally {
    dropPostedRead()
    globalThis.fetch = previous
  }
})

test('queued, failed, expired, and a partial done stay off the band', async () => {
  const previous = globalThis.fetch
  const routes = new Map<string, Response>([
    ['http://127.0.0.1:8000/v1/estimates/job_run', jsonResponse(200, { id: 'job_run', status: 'running' })],
    [
      'http://127.0.0.1:8000/v1/estimates/job_bad',
      jsonResponse(200, {
        id: 'job_bad',
        status: 'failed',
        error: 'unreadable',
        message: 'One of those games could not be scored. Pick another eight.',
      }),
    ],
    [
      'http://127.0.0.1:8000/v1/estimates/job_old',
      jsonResponse(404, { error: 'unknown_job', message: 'gone' }),
    ],
    [
      'http://127.0.0.1:8000/v1/estimates/job_partial',
      jsonResponse(200, { id: 'job_partial', status: 'done', estimate: { q50: 1706 } }),
    ],
  ])
  globalThis.fetch = async (input) => {
    const found = routes.get(String(input))
    assert.ok(found, `unexpected ${String(input)}`)
    return found.clone()
  }
  try {
    dropPostedRead()
    assert.deepEqual(await loadReport('job_run', new AbortController().signal), {
      kind: 'running',
      text: STILL_RUNNING,
    })
    rememberPostedRead({ id: 'job_run', depth: 10, games: [] })
    assert.deepEqual(await loadReport('job_run', new AbortController().signal), {
      kind: 'running',
      text: readingLabel(10),
    })
    assert.deepEqual(await loadReport('job_bad', new AbortController().signal), {
      kind: 'failed',
      message: 'One of those games could not be scored. Pick another eight.',
    })
    assert.deepEqual(await loadReport('job_old', new AbortController().signal), { kind: 'expired' })
    assert.equal(`${EXPIRED_LEAD} ${EXPIRED_ACTION}`, 'That read expired. Start it again.')
    await assert.rejects(getEstimate('job_partial', new AbortController().signal), (error: unknown) => {
      assert.ok(error instanceof ApiError)
      return true
    })
    const partial = await loadReport('job_partial', new AbortController().signal)
    assert.equal(partial.kind, 'failed')
    if (partial.kind !== 'failed') return
    assert.equal(partial.message.includes('1706'), false)
  } finally {
    dropPostedRead()
    globalThis.fetch = previous
  }
})
