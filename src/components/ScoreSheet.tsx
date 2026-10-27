import { useId } from 'react'
import type { CheckedGame } from '../api/types.ts'
import {
  firstAcceptedIndexes,
  gameLine,
  refusalCopy,
  shownGames,
  tickedIndexes,
  watchLimit,
} from '../upload/scoreSheet.ts'

type ScoreSheetProps = {
  phase: 'idle' | 'checking' | 'ready' | 'failed'
  games: readonly CheckedGame[]
  ticked: readonly number[]
  gamesRequired: number | null
  poolLabel: string
  onToggle: (index: number) => void
  onSelectFirst: () => void
}

export function ScoreSheet({
  phase,
  games,
  ticked,
  gamesRequired,
  poolLabel,
  onToggle,
  onSelectFirst,
}: ScoreSheetProps) {
  const countId = useId()
  const visible = shownGames(games)
  const selected = tickedIndexes(visible, ticked).length
  const limit = watchLimit(gamesRequired)
  const showSheet = phase === 'ready' && gamesRequired !== null
  const full = selected >= limit
  const first = firstAcceptedIndexes(visible, limit)
  const alreadyFirst = first.length > 0 && selected === first.length && first.every((index) => ticked.includes(index))
  const canSelect = visible.some((game) => game.accepted)

  if (phase !== 'checking' && !showSheet) return null

  return (
    <div className="score-sheet">
      {phase === 'checking' ? (
        <div role="status">
          <p className="field-status">Reading headers.</p>
          <div className="score-skeleton" aria-hidden="true">
            <span className="score-bone" />
            <span className="score-bone" />
            <span className="score-bone" />
            <span className="score-bone" />
          </div>
        </div>
      ) : null}
      {showSheet ? (
        <>
          <div className="score-bar">
            <div>
              <p className="score-count" id={countId} role="status">
                {selected} of {limit}
              </p>
              {games.length > visible.length ? (
                <p className="hint score-scope">Showing the {visible.length} most recent.</p>
              ) : null}
            </div>
            <button
              type="button"
              className="text-button"
              onClick={onSelectFirst}
              disabled={!canSelect || alreadyFirst}
            >
              Select the first {limit}
            </button>
          </div>
          {visible.length > 0 ? (
            <ul className="score-list" aria-labelledby={countId}>
              {visible.map((game) => {
                const line = gameLine(game)
                if (game.accepted) {
                  const checked = ticked.includes(game.index)
                  return (
                    <li key={game.index}>
                      <label className="score-row">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!checked && full}
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
