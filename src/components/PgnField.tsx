import { useEffect, useId, useRef, useState } from 'react'
import { formatByteSize } from '../upload/pgnFile.ts'

type PgnFieldProps = {
  fileName: string | null
  fileBytes: number | null
  error: string | null
  onFile: (file: File) => void
  onRemove: () => void
}

export function PgnField({ fileName, fileBytes, error, onFile, onRemove }: PgnFieldProps) {
  const inputId = useId()
  const hintId = useId()
  const errorId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)
  const [over, setOver] = useState(false)
  const hasFile = fileName !== null && fileBytes !== null
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

  function fileInput(className?: string) {
    return (
      <input
        ref={inputRef}
        id={inputId}
        className={className}
        type="file"
        accept=".pgn,application/x-chess-pgn,application/vnd.chess-pgn"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => {
          const file = event.target.files?.item(0) ?? null
          event.target.value = ''
          takeFile(file)
        }}
      />
    )
  }

  return (
    <div className="field">
      <label className="field-label" htmlFor={inputId}>
        PGN
      </label>
      <div
        className={['drop', hasFile ? 'has-file' : '', over ? 'is-over' : ''].filter(Boolean).join(' ')}
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
        {hasFile ? (
          <>
            <div className="file-meta">
              <p className="file-name">{fileName}</p>
              <p className="file-size">{formatByteSize(fileBytes)}</p>
            </div>
            <div className="file-actions">
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
              <label className="text-button file-button">
                Replace
                {fileInput()}
              </label>
            </div>
          </>
        ) : (
          <div className="drop-choose">
            <p className="drop-title">Drop a PGN file</p>
            <p className="drop-aside">or choose one</p>
            {fileInput('drop-input')}
          </div>
        )}
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
