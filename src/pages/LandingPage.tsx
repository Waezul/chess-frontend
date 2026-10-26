import { QueenPortrait } from '../board/QueenPortrait.tsx'
import { PgnField } from '../components/PgnField.tsx'
import { PoolPicker } from '../components/PoolPicker.tsx'
import { SiteHeader } from '../components/SiteHeader.tsx'
import { useUploadForm } from '../upload/useUploadForm.ts'

export function LandingPage() {
  const form = useUploadForm()
  const options =
    form.pools?.map((pool) => ({
      id: pool.id,
      label: pool.label,
      available: pool.available,
      unavailableReason: pool.unavailable_reason,
    })) ?? []

  return (
    <div className="room">
      <SiteHeader />
      <main>
        <section className="portrait">
          <div className="portrait-canvas" aria-hidden="true">
            <QueenPortrait />
          </div>
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
                Name you played under
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
              pgn={form.pgn}
              fileName={form.fileName}
              fileBytes={form.fileBytes}
              error={form.pgnError}
              onPgnChange={form.editPgn}
              onFile={form.chooseFile}
              onRemove={form.removeFile}
            />
            {form.healthNotice ? (
              <p className="field-error" role="status">
                {form.healthNotice}
              </p>
            ) : null}
          </div>
        </form>
      </main>
    </div>
  )
}
