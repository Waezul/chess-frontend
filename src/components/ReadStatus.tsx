import type { Ref } from 'react'
import { Link } from 'react-router-dom'
import { STILL_RUNNING } from '../report/present.ts'
import { ESTIMATE_READY, SEE_ESTIMATE, readingLabel } from '../upload/estimatePoll.ts'

type ReadStatusProps = {
  reading: boolean
  depth: number | null
  reportId: string | null
  error?: string | null
  onCancel?: () => void
  cancelRef?: Ref<HTMLButtonElement>
  readyRef?: Ref<HTMLAnchorElement>
  againLabel?: string | null
  onAgain?: () => void
  againDisabled?: boolean
  tone?: 'primary' | 'quiet'
  statusRef?: Ref<HTMLParagraphElement>
}

export function ReadStatus({
  reading,
  depth,
  reportId,
  error = null,
  onCancel,
  cancelRef,
  readyRef,
  againLabel = null,
  onAgain,
  againDisabled = false,
  tone = 'primary',
  statusRef,
}: ReadStatusProps) {
  const waiting = reading
  const ready = !reading && Boolean(reportId)
  const failed = !reading && !ready && Boolean(error)
  if (!waiting && !ready && !failed) return null

  const text = failed
    ? error
    : waiting
      ? depth != null && Number.isFinite(depth)
        ? readingLabel(depth)
        : STILL_RUNNING
      : ESTIMATE_READY

  return (
    <div className={tone === 'quiet' ? 'estimate-status read-status is-quiet' : 'estimate-status read-status'}>
      <div className="read-line">
        <p
          ref={statusRef}
          className="estimate-wait"
          role={failed ? 'alert' : 'status'}
          aria-busy={waiting ? true : undefined}
          tabIndex={-1}
        >
          {text}
        </p>
        {waiting && onCancel ? (
          <button ref={cancelRef} type="button" className="text-button" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
      </div>
      {waiting ? (
        <div className="progress-track" aria-hidden="true">
          <span />
        </div>
      ) : null}
      {ready && reportId ? (
        <Link
          ref={readyRef}
          to={`/report/${encodeURIComponent(reportId)}`}
          className={tone === 'quiet' ? 'text-button' : 'estimate'}
        >
          {SEE_ESTIMATE}
        </Link>
      ) : null}
      {ready && againLabel && onAgain ? (
        <button type="button" className="text-button" disabled={againDisabled} onClick={onAgain}>
          {againLabel}
        </button>
      ) : null}
    </div>
  )
}
