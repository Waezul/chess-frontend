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
      <input
        id="subject"
        className="field-input"
        name="subject"
        value={subject}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-describedby={notice ? noteId : undefined}
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
          className="text-button"
          disabled={!canLoad}
          aria-busy={loading ? true : undefined}
          aria-describedby={notice ? noteId : undefined}
          onClick={onLoad}
        >
          Load latest rated games
        </button>
      </div>
      {notice?.tone === 'status' ? (
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
