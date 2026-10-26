import { useEffect, useId, useRef, useState } from 'react'
import { formatByteSize } from '../upload/pgnFile.ts'

type PgnFieldProps = {
  pgn: string
  fileName: string | null
  fileBytes: number | null
  error: string | null
  onPgnChange: (value: string) => void
  onFile: (file: File) => void
  onRemove: () => void
}

export function PgnField({ pgn, fileName, fileBytes, error, onPgnChange, onFile, onRemove }: PgnFieldProps) {
  const hintId = useId()
  const errorId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)
  const [over, setOver] = useState(false)
  const describedBy = error ? `${hintId} ${errorId}` : hintId

  useEffect(() => {
    function keepPage(event: DragEvent) {
      event.preventDefault()
    }
    window.addEventListener('dragover', keepPage)
    window.addEventListener('drop', keepPage)
    return () => {
      window.removeEventListener('dragover', keepPage)
      window.removeEventListener('drop', keepPage)
    }
  }, [])

  function takeFile(file: File | null) {
    if (file) onFile(file)
  }

  return (
    <div className="field">
      <label className="field-label" htmlFor="pgn">
        PGN
      </label>
      <div
        className={over ? 'drop is-over' : 'drop'}
        onDragEnter={(event) => {
          event.preventDefault()
          dragDepth.current += 1
          setOver(true)
        }}
        onDragOver={(event) => {
          event.preventDefault()
          event.dataTransfer.dropEffect = 'copy'
        }}
        onDragLeave={(event) => {
          event.preventDefault()
          dragDepth.current -= 1
          if (dragDepth.current <= 0) {
            dragDepth.current = 0
            setOver(false)
          }
        }}
        onDrop={(event) => {
          event.preventDefault()
          dragDepth.current = 0
          setOver(false)
          takeFile(event.dataTransfer.files.item(0))
        }}
      >
        <textarea
          id="pgn"
          className="field-area"
          value={pgn}
          onChange={(event) => onPgnChange(event.target.value)}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        />
        {fileName !== null && fileBytes !== null ? (
          <div className="file-meta">
            <p className="file-name">{fileName}</p>
            <p className="file-size">{formatByteSize(fileBytes)}</p>
          </div>
        ) : null}
        <div className="file-actions">
          {fileName !== null ? (
            <button
              type="button"
              className="text-button"
              onClick={() => {
                if (inputRef.current) inputRef.current.value = ''
                onRemove()
              }}
            >
              Remove
            </button>
          ) : null}
          <label className="text-button file-button">
            {fileName === null ? 'Choose PGN file' : 'Replace'}
            <input
              ref={inputRef}
              type="file"
              accept=".pgn,application/x-chess-pgn,application/vnd.chess-pgn"
              onChange={(event) => {
                const file = event.target.files?.item(0) ?? null
                event.target.value = ''
                takeFile(file)
              }}
            />
          </label>
        </div>
      </div>
      <p id={hintId} className="hint">
        A PGN is the text record of the games. Lichess can export one.
      </p>
      {error ? (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
