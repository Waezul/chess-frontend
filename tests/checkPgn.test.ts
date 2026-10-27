import assert from 'node:assert/strict'
import { test } from 'node:test'
import { checkFromPgn } from '../src/api/checkPgn.ts'

const rapidGame = `[Event "rated rapid game"]
[Site "https://lichess.org/game/Ps8owN7U"]
[Date "2026.10.25"]
[Round "-"]
[White "Aditya_lucky777"]
[Black "Kurald_Galain"]
[Result "0-1"]
[GameId "Ps8owN7U"]
[UTCDate "2026.10.25"]
[UTCTime "12:30:38"]
[WhiteElo "2109"]
[BlackElo "2830"]
[WhiteRatingDiff "-1"]
[BlackRatingDiff "+1"]
[Variant "Standard"]
[TimeControl "480+0"]
[ECO "B12"]
[Opening "Caro-Kann Defense"]
[Termination "Normal"]

1. e4 c6 2. d4 d5 3. Bd3 dxe4 4. Bxe4 Nf6 5. Nc3 Bg4 6. Bf3 Bf5 7. Nge2 e6 8. O-O Be7 9. Ng3 Bg6 10. Nce2 h6 11. c3 Na6 12. Nf4 Bh7 13. Qb3 Rb8 14. Be2 Nc7 15. Be3 Ncd5 16. c4 Nxe3 17. fxe3 O-O 18. Bd3 Qc7 19. Bxh7+ Nxh7 20. Rad1 Nf6 21. e4 e5 22. dxe5 Qxe5 23. Nd3 Qc7 24. e5 Nh7 25. Nf5 Rbd8 26. Nxe7+ Qxe7 27. Qb4 Qxb4 28. Nxb4 Ng5 29. Nd3 Ne6 30. Kf2 Rfe8 31. Nc1 Nd4 32. Nb3 Nxb3 33. axb3 Kf8 34. Rd6 c5 35. Rfd1 Rxd6 36. exd6 Rd8 37. Ke3 Ke8 38. Ke4 Kd7 39. Kd5 Re8 40. Rf1 f6 41. Rf4 Re5# 0-1
`

test('a Lichess rapid game keeps the players, date, opening, result, and length', () => {
  const check = checkFromPgn({
    pool: 'rapid',
    pgn: rapidGame,
    subject: '  kurald_galain  ',
    gamesRequired: 8,
  })

  assert.deepEqual(check, {
    pool: 'rapid',
    games_required: 8,
    games: [
      {
        index: 0,
        accepted: true,
        reason: 'ok',
        color: 'black',
        white: 'Aditya_lucky777',
        black: 'Kurald_Galain',
        date: '2026.10.25',
        opening: 'Caro-Kann Defense',
        result: '0-1',
        moves: 41,
      },
    ],
  })
})

test('a rapid game refused for the classical pool still shows the Lichess players', () => {
  const game = checkFromPgn({
    pool: 'classical',
    pgn: rapidGame,
    subject: 'Kurald_Galain',
    gamesRequired: 8,
  }).games[0]

  assert.equal(game.accepted, false)
  assert.equal(game.reason, 'wrong_pool')
  assert.equal(game.color, null)
  assert.equal(game.white, 'Aditya_lucky777')
  assert.equal(game.black, 'Kurald_Galain')
  assert.equal(game.opening, 'Caro-Kann Defense')
  assert.equal(game.date, '2026.10.25')
  assert.equal(game.moves, 41)
})

test('a player missing from both headers is refused and the Lichess names stay', () => {
  const game = checkFromPgn({
    pool: 'rapid',
    pgn: rapidGame,
    subject: 'SomeoneElse',
    gamesRequired: 8,
  }).games[0]

  assert.equal(game.reason, 'name_missing')
  assert.equal(game.color, null)
  assert.equal(game.white, 'Aditya_lucky777')
  assert.equal(game.black, 'Kurald_Galain')
})

test('fewer than ten moves by the subject is refused', () => {
  const shortGame = rapidGame.replace(
    /1\. e4[\s\S]*$/,
    '1. e4 c6 2. d4 d5 3. Bd3 dxe4 4. Bxe4 Nf6 5. Nc3 Bg4 6. Bf3 Bf5 7. Nge2 e6 8. O-O Be7 9. Ng3 Bg6 0-1\n',
  )
  const game = checkFromPgn({
    pool: 'rapid',
    pgn: shortGame,
    subject: 'Kurald_Galain',
    gamesRequired: 8,
  }).games[0]

  assert.equal(game.reason, 'too_short')
  assert.equal(game.moves, 9)
  assert.equal(game.opening, 'Caro-Kann Defense')
})

test('an empty paste has no games', () => {
  const check = checkFromPgn({
    pool: 'rapid',
    pgn: ' \n ',
    subject: 'Kurald_Galain',
    gamesRequired: 8,
  })
  assert.deepEqual(check.games, [])
})
