import { useMemo, useState } from 'react'
import { ChessStage } from '../board/ChessStage.tsx'
import { parsePgnReel } from '../board/pgnReel.ts'
import type { ReelCue } from '../board/types.ts'
import { useReducedMotion } from '../board/useReducedMotion.ts'
import { EstimateControl } from '../components/EstimateControl.tsx'
import { NameField } from '../components/NameField.tsx'
import { PgnField } from '../components/PgnField.tsx'
import { PoolPicker } from '../components/PoolPicker.tsx'
import { ScoreSheet } from '../components/ScoreSheet.tsx'
import { SiteHeader } from '../components/SiteHeader.tsx'
import { useScoreSheet } from '../upload/useScoreSheet.ts'
import { useUploadForm } from '../upload/useUploadForm.ts'

export function LandingPage() {
  const form = useUploadForm()
  const selected = form.pools?.find((pool) => pool.id === form.poolId) ?? null
  const sheet = useScoreSheet({
    poolId: form.poolId,
    gamesRequired: selected?.games_required ?? null,
    pgn: form.pgn,
    subject: form.subject,
    engineDown: form.engineDown,
    holdCheck: form.lichessLoading,
  })
  const options =
    form.pools?.map((pool) => ({
      id: pool.id,
      label: pool.label,
      available: pool.available,
      unavailableReason: pool.unavailable_reason,
    })) ?? []
  const games = useMemo(() => parsePgnReel(form.pgn), [form.pgn])
  const reduced = useReducedMotion()
  const [armed, setArmed] = useState(false)
  const [pausedPgn, setPausedPgn] = useState<string | null>(null)
  const [cue, setCue] = useState<ReelCue | null>(null)
  if (armed && games.length === 0) setArmed(false)
  const unplayable = form.pgn.trim().length > 0 && games.length === 0
  const playing = armed && games.length > 0
  const paused = pausedPgn === form.pgn

  function startWatch() {
    if (games.length === 0) return
    setArmed(true)
    setPausedPgn(null)
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
  }

  return (
    <div className={playing ? 'room room-landing room-watching' : 'room room-landing'}>
      <SiteHeader overlay />
      <div className="stage" aria-hidden="true" inert>
        <ChessStage
          pgn={form.pgn}
          watching={playing}
          paused={paused}
          reduced={reduced}
          onCue={setCue}
        />
      </div>
      <main>
        <section className="portrait">
          <div className="portrait-scrim">
            <div className="portrait-copy" aria-hidden={playing ? true : undefined}>
              <h1>Get your Elo guessed.</h1>
              <p>
                Our model will guess your Elo. The 10–90% band is the low and high of that guess, not
                how sure the model is.
              </p>
            </div>
          </div>
          {playing && cue ? (
            <div className="replay-readout">
              <div className="replay-lines" aria-live="polite">
                <p className="replay-game">{cue.label}</p>
                {cue.san ? <p className="replay-san">{cue.san}</p> : null}
                <p className="replay-turn">{cue.turn}</p>
              </div>
              <button
                type="button"
                className="text-button"
                onClick={() => setPausedPgn(paused ? null : form.pgn)}
              >
                {paused ? 'Play replay' : 'Pause replay'}
              </button>
            </div>
          ) : null}
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
              onToggle={sheet.toggle}
            />
            {games.length > 0 && !playing ? (
              <div className="watch-row">
                <button type="button" className="text-button" onClick={startWatch}>
                  {games.length === 1 ? 'Watch the game' : 'Watch the games'}
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
                if (games.length > 0) startWatch()
                void sheet.submit()
              }}
            />
          </div>
        </form>
      </main>
    </div>
  )
}
