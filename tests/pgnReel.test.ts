import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parsePgnGames, parsePgnReel, positionAt } from '../src/board/pgnReel.ts'

const named = `[Event "rated rapid game"]
[White "Aditya_lucky777"]
[Black "Kurald_Galain"]
[WhiteElo "2109"]
[BlackElo "2830"]
[Result "0-1"]

1. e4 c6 2. d4 d5 0-1
`

test('a game keeps the player names and leaves the ratings off', () => {
  const [game] = parsePgnReel(named)
  assert.equal(game.white, 'Aditya_lucky777')
  assert.equal(game.black, 'Kurald_Galain')
  assert.equal(`${game.white} ${game.black}`.includes('2109'), false)
})

test('the starting position has no mark, and the move just played stays marked', () => {
  const [game] = parsePgnReel(named)
  assert.equal(positionAt(game, 0).marks, null)
  assert.deepEqual(positionAt(game, 1).marks, ['e2', 'e4'])
  assert.deepEqual(positionAt(game, 2).marks, ['c7', 'c6'])
})

test('a game without names still has a white and a black player', () => {
  const [game] = parsePgnReel('[Result "1-0"]\n\n1. e4 e5 1-0\n')
  assert.equal(game.white, 'White')
  assert.equal(game.black, 'Black')
  assert.equal(game.ending, 'White wins.')
})

test('a replay keeps only the selected games', () => {
  const pgn = `[White "Alice"]
[Black "Bob"]
[Result "1-0"]

1. e4 e5 1-0

[White "Carol"]
[Black "Dan"]
[Result "0-1"]

1. d4 d5 0-1
`
  const [game] = parsePgnGames(pgn, [1])
  assert.equal(game.white, 'Carol')
  assert.equal(game.black, 'Dan')
  assert.equal(parsePgnGames(pgn, []).length, 0)
})

test('a finished game says how it ended', () => {
  const [mate] = parsePgnReel(`[White "Alice"]
[Black "Bob"]
[Result "1-0"]

1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0
`)
  assert.equal(mate.ending, 'Checkmate. Alice wins.')

  const [resigns] = parsePgnReel(`[White "Alice"]
[Black "Bob"]
[Result "0-1"]
[Termination "Normal"]

1. e4 e5 0-1
`)
  assert.equal(resigns.ending, 'Alice resigns.')

  const [clock] = parsePgnReel(`[White "Alice"]
[Black "Bob"]
[Result "1-0"]
[Termination "Time forfeit"]

1. e4 e5 1-0
`)
  assert.equal(clock.ending, 'Bob ran out of time.')

  const [draw] = parsePgnReel(`[White "Alice"]
[Black "Bob"]
[Result "1/2-1/2"]

1. e4 e5 1/2-1/2
`)
  assert.equal(draw.ending, 'Draw.')
})
