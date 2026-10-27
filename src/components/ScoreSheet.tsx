import { useId } from 'react'
import type { CheckedGame } from '../api/types.ts'
import { firstAcceptedIndexes, refusalCopy, shownGames, tickedIndexes, watchLimit } from '../upload/scoreSheet.ts'

function filled(value: string | null): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function readableDate(value: string | null): string | null {
  const trimmed = filled(value)
  if (!trimmed) return null
  const match = /^(\d{4})\.(\d{2})\.(\d{2})$/.exec(trimmed)
  if (!match) return trimmed
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  if (Number.isNaN(date.getTime())) return trimmed
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

function GameCopy({ game }: { game: CheckedGame }) {
  const opening = filled(game.opening)
  const facts: string[] = []
  if (game.color === 'white') facts.push('White')
  else if (game.color === 'black') facts.push('Black')
  const date = readableDate(game.date)
  const result = filled(game.result)
  if (date) facts.push(date)
  if (result) facts.push(result)
  if (typeof game.moves === 'number' && Number.isFinite(game.moves)) {
    facts.push(`${game.moves} ${game.moves === 1 ? 'move' : 'moves'}`)
  }
  if (!opening && facts.length === 0) {
    return game.accepted ? <span className="score-line">Accepted game</span> : null
  }
  return (
    <span className="score-copy">
      {opening ? <span className="score-opening">{opening}</span> : null}
      {facts.length > 0 ? (
        <span className={opening ? 'score-facts' : 'score-line'}>
          {facts.map((fact, index) => (
            <span key={`${fact}-${index}`}>{fact}</span>
          ))}
        </span>
      ) : null}
    </span>
  )
}

type ScoreSheetProps = {
  phase: 'idle' | 'checking' | 'ready' | 'failed'
  games: readonly CheckedGame[]
  ticked: readonly number[]
  gamesRequired: number | null
  poolLabel: string
  shownCount: number
  onToggle: (index: number) => void
  onSelectFirst: () => void
  onShowMore: () => void
}

export function ScoreSheet({
  phase,
  games,
  ticked,
  gamesRequired,
  poolLabel,
  shownCount,
  onToggle,
  onSelectFirst,
  onShowMore,
}: ScoreSheetProps) {
  const titleId = useId()
  const visible = shownGames(games, shownCount)
  const hidden = Math.max(0, games.length - visible.length)
  const selected = tickedIndexes(visible, ticked).length
  const limit = watchLimit(gamesRequired)
  const showSheet = phase === 'ready' && gamesRequired !== null
  const full = selected >= limit
  const first = firstAcceptedIndexes(visible, limit)
  const alreadyFirst = first.length > 0 && selected === first.length && first.every((index) => ticked.includes(index))
  const canSelect = visible.some((game) => game.accepted)

  if (phase !== 'checking' && !showSheet) return null

  return (
    <section className="score-panel" aria-busy={phase === 'checking' || undefined}>
      <div className="score-bar">
        <div>
          <h2 className="score-title" id={titleId}>
            Select games
          </h2>
          <p className="score-count" role="status">
            {phase === 'checking' ? 'Reading headers.' : `${selected} of ${limit} selected`}
          </p>
          {showSheet && hidden > 0 ? (
            <>
              <p className="hint score-scope">Showing the {visible.length} most recent.</p>
              <button type="button" className="text-button score-more" onClick={onShowMore}>
                Load more
              </button>
            </>
          ) : null}
        </div>
        {showSheet ? (
          <button
            type="button"
            className="text-button"
            onClick={onSelectFirst}
            disabled={!canSelect || alreadyFirst}
          >
            Select the first {limit}
          </button>
        ) : null}
      </div>
      {phase === 'checking' ? (
        <div className="score-skeleton" aria-hidden="true">
          <span className="score-bone" />
          <span className="score-bone" />
          <span className="score-bone" />
          <span className="score-bone" />
        </div>
      ) : null}
      {showSheet && visible.length > 0 ? (
        <ul className="score-list" aria-labelledby={titleId}>
          {visible.map((game) => {
            if (game.accepted) {
              const checked = ticked.includes(game.index)
              return (
                <li key={game.index}>
                  <label className={checked ? 'score-row is-selected' : 'score-row'}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!checked && full}
                      onChange={() => onToggle(game.index)}
                    />
                    <GameCopy game={game} />
                  </label>
                </li>
              )
            }
            const reason = refusalCopy(game.reason, poolLabel) ?? 'This game cannot be ticked.'
            return (
              <li key={game.index}>
                <div className="score-row is-refused">
                  <GameCopy game={game} />
                  <p className="score-reason">{reason}</p>
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}
    </section>
  )
}
