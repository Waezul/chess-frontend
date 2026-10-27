import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChessStage } from '../board/ChessStage.tsx'
import { parsePgnReel } from '../board/pgnReel.ts'
import { useReducedMotion } from '../board/useReducedMotion.ts'
import { EstimateControl } from '../components/EstimateControl.tsx'
import { NameField } from '../components/NameField.tsx'
import { PgnField } from '../components/PgnField.tsx'
import { PoolPicker } from '../components/PoolPicker.tsx'
import { ScoreSheet } from '../components/ScoreSheet.tsx'
import { SiteHeader } from '../components/SiteHeader.tsx'
import { useUpload } from '../upload/UploadProvider.tsx'
import { watchLimit, watchedIndexes } from '../upload/scoreSheet.ts'

export function LandingPage() {
  const navigate = useNavigate()
  const { form, sheet, selected } = useUpload()
  const options =
    form.pools?.map((pool) => ({
      id: pool.id,
      label: pool.label,
      available: pool.available,
      unavailableReason: pool.unavailable_reason,
    })) ?? []
  const games = useMemo(() => parsePgnReel(form.pgn), [form.pgn])
  const watched = useMemo(
    () =>
      watchedIndexes(
        sheet.games,
        sheet.ticked,
        watchLimit(selected?.games_required ?? null),
        sheet.shownCount,
      ),
    [selected?.games_required, sheet.games, sheet.shownCount, sheet.ticked],
  )
  const reduced = useReducedMotion()
  const [creating, setCreating] = useState(false)
  const unplayable = form.pgn.trim().length > 0 && games.length === 0

  function startWatch() {
    if (watched.length === 0 || creating) return
    setCreating(true)
    window.setTimeout(() => {
      navigate('/replay')
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
    }, 0)
  }

  return (
    <div className="room room-landing">
      <SiteHeader overlay />
      <div className="stage" aria-hidden="true" inert>
        <ChessStage pgn="" watching={false} paused={false} reduced={reduced} gameIndex={0} ply={0} />
      </div>
      <main>
        <section className="portrait">
          <div className="portrait-scrim">
            <div className="portrait-copy">
              <h1>
                Get your Elo
                <br />
                guessed.
              </h1>
              <p>
                Upload your games. Discover your estimated playing strength. The 10–90% band is the low
                and high of that guess, not how sure the model is.
              </p>
            </div>
          </div>
        </section>
        <form
          className="upload"
          autoComplete="off"
          onSubmit={(event) => event.preventDefault()}
        >
          <div className="upload-stack">
            <PoolPicker
              phase={form.phase}
              pools={options}
              error={form.poolsError}
              selectedId={form.poolId}
              onSelect={form.selectPool}
            />
            <NameField
              subject={form.subject}
              canLoad={form.canLoadLichess}
              loading={form.lichessLoading}
              notice={form.lichessNotice}
              onSubject={form.setSubject}
              onLoad={form.loadLichess}
            />
            <PgnField
              fileName={form.fileName}
              fileBytes={form.fileBytes}
              error={form.pgnError}
              onFile={form.chooseFile}
              onRemove={form.removeFile}
            />
            {unplayable ? (
              <p className="hint replay-note" role="status">
                This PGN has no playable game.
              </p>
            ) : null}
            <ScoreSheet
              phase={sheet.phase}
              games={sheet.games}
              ticked={sheet.ticked}
              gamesRequired={selected?.games_required ?? null}
              poolLabel={selected?.label ?? ''}
              shownCount={sheet.shownCount}
              onToggle={sheet.toggle}
              onSelectFirst={sheet.selectFirst}
              onShowMore={sheet.showMore}
            />
            {watched.length > 0 ? (
              <div className="watch-row">
                <button type="button" className="text-button" onClick={startWatch} aria-busy={creating}>
                  {creating ? 'Creating the replay.' : watched.length === 1 ? 'Watch the game' : 'Watch the games'}
                </button>
              </div>
            ) : null}
            <EstimateControl
              gamesRequired={selected?.games_required ?? null}
              enabled={sheet.canEstimate}
              submitting={sheet.submitting}
              healthNotice={form.healthNotice}
              checkError={sheet.checkError}
              submitError={sheet.submitError}
              onEstimate={() => {
                void sheet.submit()
              }}
            />
          </div>
        </form>
      </main>
    </div>
  )
}
