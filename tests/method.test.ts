import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { getPool } from '../src/api/client.ts'
import { ApiError } from '../src/api/errors.ts'
import { poolCardFixture } from '../src/api/fixtures.ts'
import type { PoolCard } from '../src/api/types.ts'
import { signedBias, wholePercent } from '../src/format/numbers.ts'
import { methodPoolId, presentPoolCard, type MethodRow } from '../src/method/present.ts'

const minus = '\u2212'

function rows(bins: string[]): MethodRow[] {
  return bins.map((line) => {
    const [bin, players, miss, bias, coverage, width] = line.split('|')
    return { bin, players, miss, bias, coverage, width }
  })
}

test('bias and coverage use the contract signs and whole percents', () => {
  assert.equal(signedBias(120.5), '+121')
  assert.equal(signedBias(-89.6), `${minus}90`)
  assert.equal(signedBias(-1.5), `${minus}2`)
  assert.equal(signedBias(0.2), '0')
  assert.equal(wholePercent(0.68), '68%')
  assert.equal(wholePercent(0.582), '58%')
})

test('a direct visit with no selection loads classical, and a choice is kept', () => {
  assert.equal(methodPoolId(null), 'classical')
  assert.equal(methodPoolId('rapid'), 'rapid')
  assert.equal(methodPoolId('blitz'), 'blitz')
})

test('the classical fixture card matches, including bias signs', () => {
  const view = presentPoolCard(poolCardFixture('classical'))
  assert.equal(view.title, 'Lichess classical')
  assert.equal(view.showTable, true)
  assert.deepEqual(view.paragraphs, poolCardFixture('classical').summary)
  assert.equal(
    view.caption,
    'Lichess classical, February 2017. Stockfish depth 10. 8 games. Revision classical8-v1.',
  )
  assert.deepEqual(
    view.rows,
    rows([
      `800–1000|140|146|+121|68%|321`,
      `1000–1200|140|127|+64|89%|395`,
      `1200–1400|140|130|+38|81%|450`,
      `1400–1600|140|107|+18|86%|470`,
      `1600–1800|140|116|+5|84%|456`,
      `1800–2000|140|125|${minus}24|84%|411`,
      `2000–2200|140|134|${minus}90|79%|374`,
      `2200–2400|139|104|${minus}79|71%|250`,
    ]),
  )
})

test('the rapid fixture card matches, including bias signs', () => {
  const view = presentPoolCard(poolCardFixture('rapid'))
  assert.equal(view.title, 'Lichess rapid')
  assert.equal(view.showTable, true)
  assert.deepEqual(view.paragraphs, poolCardFixture('rapid').summary)
  assert.equal(
    view.caption,
    'Lichess rapid, September 2026. Stockfish depth 10. 8 games. Revision rapid8-v2.',
  )
  assert.deepEqual(
    view.rows,
    rows([
      `800–1000|300|140|+110|67%|331`,
      `1000–1200|300|168|+102|84%|484`,
      `1200–1400|300|163|+76|86%|580`,
      `1400–1600|300|173|+13|81%|584`,
      `1600–1800|300|155|${minus}14|84%|588`,
      `1800–2000|300|152|${minus}72|85%|560`,
      `2000–2200|299|144|${minus}80|84%|476`,
      `2200–2400|299|123|${minus}80|72%|302`,
    ]),
  )
})

test('a disabled pool renders its reason and no table', () => {
  const blitz = poolCardFixture('blitz')
  const view = presentPoolCard(blitz)
  assert.equal(blitz.bins.length, 0)
  assert.equal(blitz.test_players, 0)
  assert.deepEqual(view.paragraphs, [blitz.unavailable_reason])
  assert.equal(view.showTable, false)
  assert.deepEqual(view.rows, [])
  assert.equal(view.title, 'Lichess blitz')
})

test('table figures come from the card, not from constants', () => {
  const card: PoolCard = {
    ...poolCardFixture('bullet'),
    available: true,
    unavailable_reason: null,
    label: 'Lichess bullet',
    source_label: 'Sample',
    depth: 12,
    games_required: 6,
    revision: 'bullet-test',
    summary: ['No blitz model is trained yet.'],
    bins: [{ bin: '800–1000', n: 3, mae: 10.2, bias: -1.2, coverage: 0.582, median_width: 40.4 }],
  }
  const view = presentPoolCard(card)
  assert.deepEqual(view.paragraphs, ['No blitz model is trained yet.'])
  assert.equal(view.caption, 'Sample. Stockfish depth 12. 6 games. Revision bullet-test.')
  assert.deepEqual(view.rows, [
    {
      bin: '800–1000',
      players: '3',
      miss: '10',
      bias: `${minus}1`,
      coverage: '58%',
      width: '40',
    },
  ])
})

test('the method page mounts no board and hardcodes no fixture metric', () => {
  const page = readFileSync(new URL('../src/pages/MethodPage.tsx', import.meta.url), 'utf8')
  const table = readFileSync(new URL('../src/components/MethodTable.tsx', import.meta.url), 'utf8')
  for (const source of [page, table]) {
    assert.equal(source.includes('ChessStage'), false)
    assert.equal(source.includes('<canvas'), false)
    assert.equal(source.includes('145.8'), false)
    assert.equal(source.includes('classical8-v1'), false)
    assert.equal(source.includes('+121'), false)
  }
})

test('getPool uses the network card and the fixture only when the API is absent', async () => {
  const previous = globalThis.fetch
  const signal = new AbortController().signal
  const classical = poolCardFixture('classical')
  const swapped: PoolCard = {
    ...classical,
    summary: ['Network summary.'],
    bins: [{ bin: '800–1000', n: 1, mae: 9.4, bias: -3.2, coverage: 0.5, median_width: 80 }],
  }
  globalThis.fetch = async (input) => {
    const url = String(input)
    if (url.endsWith('/v1/pools/classical')) {
      return new Response(JSON.stringify(swapped), { status: 200 })
    }
    if (url.endsWith('/v1/pools/rapid')) {
      return new Response(JSON.stringify({ id: 'classical' }), { status: 200 })
    }
    if (url.endsWith('/v1/pools/blitz')) {
      return new Response(JSON.stringify({ error: 'unknown_pool', message: 'That time control is not published.' }), {
        status: 404,
      })
    }
    throw new TypeError('Failed to fetch')
  }
  try {
    const network = await getPool('classical', signal)
    assert.deepEqual(presentPoolCard(network).paragraphs, ['Network summary.'])
    assert.equal(presentPoolCard(network).rows[0]?.bias, `${minus}3`)
    await assert.rejects(getPool('rapid', signal), (error: unknown) => error instanceof ApiError)
    await assert.rejects(getPool('blitz', signal), (error: unknown) => {
      assert.ok(error instanceof ApiError)
      assert.equal(error.message, 'That time control is not published.')
      return true
    })
    globalThis.fetch = async () => {
      throw new TypeError('Failed to fetch')
    }
    const fallback = await getPool('bullet', signal)
    assert.equal(fallback.available, false)
    assert.deepEqual(fallback.bins, [])
    assert.deepEqual(fallback.summary, ['Coming Soon.'])
  } finally {
    globalThis.fetch = previous
  }
})
