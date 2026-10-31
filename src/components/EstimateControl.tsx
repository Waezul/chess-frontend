import { useEffect, useId, useRef } from 'react'
import { ReadStatus } from './ReadStatus.tsx'

type EstimateControlProps = {
  gamesRequired: number | null
  enabled: boolean
  submitting: boolean
  reading: boolean
  depth: number | null
  reportId: string | null
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
  reportId,
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
  const readyRef = useRef<HTMLAnchorElement>(null)
  const returnFocus = useRef(false)

  useEffect(() => {
    if (reading) {
      returnFocus.current = true
      cancelRef.current?.focus({ preventScroll: true })
      blockRef.current?.scrollIntoView({ block: 'nearest' })
      return
    }
    if (returnFocus.current) {
      returnFocus.current = false
      const target = reportId ? readyRef.current : estimateRef.current
      target?.focus({ preventScroll: true })
      blockRef.current?.scrollIntoView({ block: 'nearest' })
      return
    }
    if (reportId) blockRef.current?.scrollIntoView({ block: 'nearest' })
  }, [reading, reportId])

  if (gamesRequired == null && !healthNotice && !checkError && !submitError && !reading && !reportId) return null

  const describedBy = [
    healthNotice ? healthId : '',
    checkError ? checkId : '',
    submitError ? submitId : '',
  ]
    .filter(Boolean)
    .join(' ')

  const offer = reading || Boolean(reportId)

  return (
    <div className="estimate-block" ref={blockRef}>
      {offer ? (
        <ReadStatus
          reading={reading}
          depth={depth}
          reportId={reportId}
          onCancel={onCancel}
          cancelRef={cancelRef}
          readyRef={readyRef}
          againLabel={!reading && reportId && gamesRequired != null ? `Estimate from these ${gamesRequired}` : null}
          onAgain={onEstimate}
          againDisabled={!enabled}
        />
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
