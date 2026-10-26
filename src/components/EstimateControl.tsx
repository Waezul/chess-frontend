import { useId } from 'react'

type EstimateControlProps = {
  gamesRequired: number | null
  enabled: boolean
  submitting: boolean
  healthNotice: string | null
  checkError: string | null
  submitError: string | null
  onEstimate: () => void
}

export function EstimateControl({
  gamesRequired,
  enabled,
  submitting,
  healthNotice,
  checkError,
  submitError,
  onEstimate,
}: EstimateControlProps) {
  const healthId = useId()
  const checkId = useId()
  const submitId = useId()
  if (gamesRequired == null && !healthNotice && !checkError && !submitError) return null

  const describedBy = [
    healthNotice ? healthId : '',
    checkError ? checkId : '',
    submitError ? submitId : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="estimate-block">
      {gamesRequired != null ? (
        <button
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
