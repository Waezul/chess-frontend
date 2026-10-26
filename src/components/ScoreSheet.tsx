import { useId } from 'react'
import type { CheckedGame } from '../api/types.ts'
import { gameLine, refusalCopy, tickedIndexes } from '../upload/scoreSheet.ts'

type ScoreSheetProps = {
  phase: 'idle' | 'checking' | 'ready' | 'failed'
  games: readonly CheckedGame[]
  ticked: readonly number[]
  gamesRequired: number | null
  poolLabel: string
  onToggle: (index: number) => void
}

export function ScoreSheet({ phase, games, ticked, gamesRequired, poolLabel, onToggle }: ScoreSheetProps) {
  const countId = useId()
  const selected = tickedIndexes(games, ticked).length
  const showSheet = phase === 'ready' && gamesRequired !== null

  if (phase !== 'checking' && !showSheet) return null

  return (
    <div className="score-sheet">
      {phase === 'checking' ? (
        <p className="field-status" role="status">
          Reading headers.
        </p>
      ) : null}
      {showSheet ? (
        <>
          <p className="score-count" id={countId} role="status">
            {selected} of {gamesRequired}
          </p>
          {games.length > 0 ? (
            <ul className="score-list" aria-labelledby={countId}>
              {games.map((game) => {
                const line = gameLine(game)
                if (game.accepted) {
                  return (
                    <li key={game.index}>
                      <label className="score-row">
                        <input
                          type="checkbox"
                          checked={ticked.includes(game.index)}
                          onChange={() => onToggle(game.index)}
                        />
                        <span className="score-line">{line || 'Accepted game'}</span>
                      </label>
                    </li>
                  )
                }
                const reason = refusalCopy(game.reason, poolLabel) ?? 'This game cannot be ticked.'
                return (
                  <li key={game.index}>
                    <div className="score-row is-refused">
                      {line ? <p className="score-line">{line}</p> : null}
                      <p className="score-reason">{reason}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
