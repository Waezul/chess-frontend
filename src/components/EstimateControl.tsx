import { useEffect, useId, useRef } from 'react'
import { readingLabel } from '../upload/estimatePoll.ts'

type EstimateControlProps = {
  gamesRequired: number | null
  enabled: boolean
  submitting: boolean
  reading: boolean
  depth: number | null
  healthNotice: string | null
  checkError: string | null
  submitError: string | null
  onEstimate: () => void
  onCancel: () => void
}

export function EstimateControl({
  gamesRequired,
  enabled,
  submitting,
  reading,
  depth,
  healthNotice,
  checkError,
  submitError,
  onEstimate,
  onCancel,
}: EstimateControlProps) {
  const healthId = useId()
  const checkId = useId()
  const submitId = useId()
  const blockRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const estimateRef = useRef<HTMLButtonElement>(null)
  const returnFocus = useRef(false)
  const waitCopy = reading && depth != null && Number.isFinite(depth) ? readingLabel(depth) : null

  useEffect(() => {
    if (waitCopy) {
      returnFocus.current = true
      cancelRef.current?.focus({ preventScroll: true })
      blockRef.current?.scrollIntoView({ block: 'nearest' })
      return
    }
    if (!returnFocus.current) return
    returnFocus.current = false
    estimateRef.current?.focus({ preventScroll: true })
    blockRef.current?.scrollIntoView({ block: 'nearest' })
  }, [waitCopy])

  if (gamesRequired == null && !healthNotice && !checkError && !submitError && !waitCopy) return null

  const describedBy = [
    healthNotice ? healthId : '',
    checkError ? checkId : '',
    submitError ? submitId : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="estimate-block" ref={blockRef}>
      {waitCopy ? (
        <div className="estimate-status">
          <p className="estimate-wait" role="status" aria-busy="true">
            {waitCopy}
          </p>
          <div className="progress-track" aria-hidden="true">
            <span />
          </div>
          <button ref={cancelRef} type="button" className="text-button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      ) : gamesRequired != null ? (
        <button
          ref={estimateRef}
          type="button"
          className="estimate"
          disabled={!enabled}
          aria-busy={submitting ? true : undefined}
          aria-describedby={describedBy || undefined}
          onClick={onEstimate}
        >
          Estimate from these {gamesRequired}
        </button>
      ) : null}
      {healthNotice ? (
        <p id={healthId} className="field-error" role="status">
          {healthNotice}
        </p>
      ) : null}
      {checkError ? (
        <p id={checkId} className="field-error" role="alert">
          {checkError}
        </p>
      ) : null}
      {submitError ? (
        <p id={submitId} className="field-error" role="alert">
          {submitError}
        </p>
      ) : null}
    </div>
  )
}
