import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { CheckedGame } from '../src/api/types.ts'
import {
  firstAcceptedIndexes,
  shownGames,
  watchedIndexes,
} from '../src/upload/scoreSheet.ts'

function game(index: number, date: string | null, accepted = true): CheckedGame {
  return {
    index,
    accepted,
    reason: accepted ? 'ok' : 'unrated',
    color: accepted ? 'white' : null,
    white: `White ${index}`,
    black: `Black ${index}`,
    date,
    opening: null,
    result: '1-0',
    moves: 20,
  }
}

test('the sheet keeps the ten most recent games, newest first', () => {
  const games = [
    game(0, '2024.01.01'),
    game(1, '2026.10.01'),
    game(2, null),
    game(3, '2026.10.20'),
    ...Array.from({ length: 12 }, (_, offset) => game(offset + 4, '2025.06.01')),
  ]
  const shown = shownGames(games)
  assert.equal(shown.length, 10)
  assert.equal(shown[0]?.index, 3)
  assert.equal(shown[1]?.index, 1)
  assert.equal(shown.at(-1)?.date, '2025.06.01')
  assert.equal(shown.some((item) => item.date === null), false)
})

test('selecting the first games skips refused rows and stops at eight', () => {
  const games = [
    game(0, '2026.10.20', false),
    game(1, '2026.10.19'),
    ...Array.from({ length: 10 }, (_, offset) => game(offset + 2, '2026.10.01')),
  ]
  const picked = firstAcceptedIndexes(shownGames(games), 8)
  assert.deepEqual(picked, [1, 2, 3, 4, 5, 6, 7, 8])
})

test('the watched list is the selected games, and never more than eight', () => {
  const games = Array.from({ length: 14 }, (_, index) => game(index, `2026.10.${String(20 - index).padStart(2, '0')}`))
  const ticked = games.map((item) => item.index)
  assert.deepEqual(watchedIndexes(games, ticked), [0, 1, 2, 3, 4, 5, 6, 7])
  assert.deepEqual(watchedIndexes(games, [3, 9, 1]), [1, 3, 9])
  assert.equal(shownGames(games, 20).length, 14)
  assert.deepEqual(watchedIndexes(games, [12], 8, 20), [12])
  assert.deepEqual(watchedIndexes(games, [12], 8, 10), [])
})
