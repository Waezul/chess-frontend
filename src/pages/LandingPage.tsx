import { QueenPortrait } from '../board/QueenPortrait.tsx'
import { EstimateControl } from '../components/EstimateControl.tsx'
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
  })
  const options =
    form.pools?.map((pool) => ({
      id: pool.id,
      label: pool.label,
      available: pool.available,
      unavailableReason: pool.unavailable_reason,
    })) ?? []

  return (
    <div className="room room-landing">
      <SiteHeader overlay />
      <div className="stage" aria-hidden="true" inert>
        <QueenPortrait />
      </div>
      <main>
        <section className="portrait">
          <div className="portrait-scrim">
            <div className="portrait-copy">
              <h1>Get your Elo guessed.</h1>
              <p>
                Our model will guess your Elo. The 10–90% band is the low and high of that guess, not
                how sure the model is.
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
            <div className="field">
              <label className="field-label" htmlFor="subject">
                Username you played under
              </label>
              <input
                id="subject"
                className="field-input"
                name="subject"
                value={form.subject}
                onChange={(event) => form.setSubject(event.target.value)}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
              />
            </div>
            <PgnField
              fileName={form.fileName}
              fileBytes={form.fileBytes}
              error={form.pgnError}
              onFile={form.chooseFile}
              onRemove={form.removeFile}
            />
            <ScoreSheet
              phase={sheet.phase}
              games={sheet.games}
              ticked={sheet.ticked}
              gamesRequired={selected?.games_required ?? null}
              poolLabel={selected?.label ?? ''}
              onToggle={sheet.toggle}
            />
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
