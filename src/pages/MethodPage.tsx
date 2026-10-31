import { useEffect, useRef, useState } from 'react'
import { getPool } from '../api/client.ts'
import { METHOD_FAILED, isAbortError, messageFrom } from '../api/errors.ts'
import type { PoolCard } from '../api/types.ts'
import { ReadStatus } from '../components/ReadStatus.tsx'
import { MethodTable } from '../components/MethodTable.tsx'
import { SiteHeader } from '../components/SiteHeader.tsx'
import { methodPoolId, presentPoolCard } from '../method/present.ts'
import { useUpload } from '../upload/UploadProvider.tsx'

export function MethodPage() {
  const { form, sheet } = useUpload()
  const [followed, setFollowed] = useState(sheet.reading || sheet.reportId != null)
  if ((sheet.reading || sheet.reportId) && !followed) setFollowed(true)
  const readError = followed && !sheet.reading && !sheet.reportId ? sheet.submitError : null
  // Read the selection once. A direct visit has none, so the card is classical.
  const poolId = useRef(methodPoolId(form.poolId))
  const [card, setCard] = useState<PoolCard | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<'loading' | 'ready' | 'failed'>('loading')

  useEffect(() => {
    window.scrollTo(0, 0)
    const controller = new AbortController()
    let active = true
    getPool(poolId.current, controller.signal)
      .then((next) => {
        if (!active) return
        setCard(next)
        setPhase('ready')
      })
      .catch((reason: unknown) => {
        if (!active || isAbortError(reason)) return
        setError(messageFrom(reason, METHOD_FAILED))
        setPhase('failed')
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [])

  const view = card ? presentPoolCard(card) : null

  return (
    <div className="room">
      <SiteHeader backTo="/" backLabel="Get your Elo guessed" />
      <main className="page method" aria-busy={phase === 'loading'}>
        {sheet.reading || sheet.reportId || readError ? (
          <ReadStatus
            reading={sheet.reading}
            depth={sheet.readDepth}
            reportId={sheet.reportId}
            error={readError}
            onCancel={sheet.cancelRead}
            tone="quiet"
          />
        ) : null}
        {phase === 'loading' ? (
          <p className="method-status" role="status">
            Loading this time control.
          </p>
        ) : null}
        {phase === 'failed' ? (
          <p className="method-error" role="alert">
            {error}
          </p>
        ) : null}
        {view ? (
          <>
            <h1>{view.title}</h1>
            {view.paragraphs.map((paragraph, index) => (
              <p className="method-summary" key={`${index}-${paragraph}`}>
                {paragraph}
              </p>
            ))}
            {view.showTable ? <MethodTable rows={view.rows} caption={view.caption} /> : null}
          </>
        ) : null}
      </main>
    </div>
  )
}
