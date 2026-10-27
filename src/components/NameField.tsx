import { useId } from 'react'

export type NameNotice = {
  tone: 'status' | 'error'
  text: string
}

type NameFieldProps = {
  subject: string
  canLoad: boolean
  loading: boolean
  notice: NameNotice | null
  onSubject: (value: string) => void
  onLoad: () => void
}

export function NameField({ subject, canLoad, loading, notice, onSubject, onLoad }: NameFieldProps) {
  const noteId = useId()

  return (
    <div className="field">
      <label className="field-label" htmlFor="subject">
        Username you played under
      </label>
      <div className="name-box">
        <input
          id="subject"
          className="field-input"
          name="subject"
          value={subject}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        aria-describedby={!loading && notice ? noteId : undefined}
        onChange={(event) => onSubject(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || event.nativeEvent.isComposing || !canLoad) return
            event.preventDefault()
            onLoad()
          }}
        />
        <div className="name-actions">
          <button
            type="button"
            className={loading ? 'text-button is-loading' : 'text-button'}
            disabled={!canLoad || loading}
            aria-busy={loading ? true : undefined}
            aria-label={loading ? 'Loading games from Lichess.' : undefined}
            aria-describedby={!loading && notice ? noteId : undefined}
            onClick={onLoad}
          >
            {loading ? <span className="spinner" aria-hidden="true" /> : 'Load latest rated games'}
          </button>
        </div>
      </div>
      {notice?.tone === 'status' && !loading ? (
        <p id={noteId} className="field-status" role="status">
          {notice.text}
        </p>
      ) : null}
      {notice?.tone === 'error' ? (
        <p id={noteId} className="field-error" role="alert">
          {notice.text}
        </p>
      ) : null}
    </div>
  )
}
