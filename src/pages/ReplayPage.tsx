import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChessStage } from '../board/ChessStage.tsx'
import { parsePgnReel, positionAt, selectPgn, turnLabel } from '../board/pgnReel.ts'
import type { ReplayGame } from '../board/types.ts'
import { useReducedMotion } from '../board/useReducedMotion.ts'
import { SiteHeader } from '../components/SiteHeader.tsx'
import { useUpload } from '../upload/UploadProvider.tsx'
import { watchLimit, watchedIndexes } from '../upload/scoreSheet.ts'

export function ReplayPage() {
  const { form, sheet, selected } = useUpload()
  const indexes = useMemo(
    () => watchedIndexes(sheet.games, sheet.ticked, watchLimit(selected?.games_required ?? null)),
    [selected?.games_required, sheet.games, sheet.ticked],
  )
  const indexKey = indexes.join(',')
  const [reel, setReel] = useState<{ games: ReplayGame[]; source: string } | null>(null)
  const games = reel?.games ?? []
  const reduced = useReducedMotion()
  const [pausedPgn, setPausedPgn] = useState<string | null>(null)
  const [spot, setSpot] = useState({ pgn: '', game: 0, ply: 0 })
  const playing = games.length > 0
  const paused = pausedPgn === form.pgn
  const placed = spot.pgn === form.pgn ? spot : { pgn: form.pgn, game: 0, ply: 0 }
  const gameIndex = Math.min(placed.game, Math.max(games.length - 1, 0))
  const game = games[gameIndex] ?? null
  const ply = game ? Math.min(placed.ply, game.moves.length) : 0
  const pose = useMemo(() => (game ? positionAt(game, ply) : null), [game, ply])
  const creating = indexes.length > 0 && reel === null

  useEffect(() => {
    if (indexes.length === 0) {
      setReel({ games: [], source: '' })
      return
    }
    let cancel = false
    let settle = 0
    const started = performance.now()
    setReel(null)
    const id = window.setTimeout(() => {
      const source = selectPgn(form.pgn, indexes)
      const parsed = parsePgnReel(source)
      const hold = Math.max(0, 400 - (performance.now() - started))
      settle = window.setTimeout(() => {
        if (!cancel) setReel({ games: parsed, source })
      }, hold)
    }, 0)
    return () => {
      cancel = true
      window.clearTimeout(id)
      window.clearTimeout(settle)
    }
  }, [form.pgn, indexKey, indexes])

  useEffect(() => {
    if (!playing || paused || !game) return
    if (ply >= game.moves.length) {
      setPausedPgn(form.pgn)
      return
    }
    const id = window.setTimeout(() => {
      setSpot({ pgn: form.pgn, game: gameIndex, ply: ply + 1 })
    }, 700)
    return () => window.clearTimeout(id)
  }, [form.pgn, game, gameIndex, paused, playing, ply])

  function step(delta: number) {
    if (!game) return
    const next = Math.min(Math.max(ply + delta, 0), game.moves.length)
    setSpot({ pgn: form.pgn, game: gameIndex, ply: next })
    setPausedPgn(form.pgn)
  }

  function togglePlay() {
    if (!game) return
    if (paused) {
      setSpot({ pgn: form.pgn, game: gameIndex, ply: ply >= game.moves.length ? 0 : ply })
      setPausedPgn(null)
      return
    }
    setPausedPgn(form.pgn)
  }

  return (
    <div className="room room-landing">
      <SiteHeader overlay backTo="/" backLabel="Get your Elo guessed" />
      <div className="stage" aria-hidden="true" inert>
        <ChessStage
          pgn={reel?.source ?? ''}
          watching={playing}
          paused={paused}
          reduced={reduced}
          gameIndex={gameIndex}
          ply={ply}
        />
      </div>
      <main>
        <section className="portrait">
          {creating ? (
            <div className="replay-readout" role="status">
              <p className="replay-game">Creating the replay.</p>
              <div className="replay-progress" aria-hidden="true">
                <span />
              </div>
            </div>
          ) : playing && game && pose ? (
            <div className="replay-readout">
              {games.length > 1 ? (
                <label className="replay-picker">
                  <select
                    aria-label="Game"
                    value={gameIndex}
                    onChange={(event) => {
                      setSpot({ pgn: form.pgn, game: Number(event.target.value), ply: 0 })
                      setPausedPgn(form.pgn)
                    }}
                  >
                    {games.map((item, index) => (
                      <option key={`${item.white}-${item.black}-${index}`} value={index}>
                        {index + 1}. {item.white} vs {item.black}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <div className="replay-lines" aria-live="polite">
                <p className="replay-game">White, {game.white}</p>
                <p className="replay-game">Black, {game.black}</p>
                {pose.san ? <p className="replay-san">{pose.san}</p> : null}
                <p className="replay-turn">
                  {ply >= game.moves.length && game.ending ? game.ending : turnLabel(pose.turn)}
                </p>
              </div>
              <div className="replay-controls">
                <button type="button" className="text-button" onClick={() => step(-1)} disabled={ply === 0}>
                  Back
                </button>
                <button type="button" className="text-button" onClick={togglePlay}>
                  {paused ? 'Play replay' : 'Pause replay'}
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => step(1)}
                  disabled={ply >= game.moves.length}
                >
                  Forward
                </button>
              </div>
            </div>
          ) : (
            <div className="replay-readout">
              <p className="replay-game">
                {form.pgn.trim() ? 'Select games to watch them here.' : 'Choose a PGN to watch it here.'}
              </p>
              <Link to="/" className="text-button">
                {form.pgn.trim() ? 'Choose games' : 'Choose a PGN'}
              </Link>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
