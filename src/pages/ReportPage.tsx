import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatCount } from '../api/format.ts'
import { isAbortError } from '../api/errors.ts'
import { SiteHeader } from '../components/SiteHeader.tsx'
import { loadReport, type ReportView } from '../report/loadReport.ts'
import { EXPIRED_ACTION, EXPIRED_LEAD, type ReportBlock } from '../report/present.ts'

function useReport(id: string) {
  const [view, setView] = useState<ReportView | { kind: 'loading' }>({ kind: 'loading' })
  const [forId, setForId] = useState(id)
  if (forId !== id) {
    setForId(id)
    setView({ kind: 'loading' })
  }

  useEffect(() => {
    const controller = new AbortController()
    let cancel = false
    loadReport(id, controller.signal)
      .then((next) => {
        if (!cancel) setView(next)
      })
      .catch((error: unknown) => {
        if (cancel || isAbortError(error)) return
        setView({ kind: 'failed', message: 'The read could not be loaded. Reload the page and try again.' })
      })
    return () => {
      cancel = true
      controller.abort()
    }
  }, [id])

  if (forId !== id) return { kind: 'loading' as const }
  return view
}

function Track({ block }: { block: Extract<ReportBlock, { type: 'track' }> }) {
  const span = block.end - block.start
  const point = span === 0
  return (
    <figure className="band-scale">
      <div className="band-rail" role="img" aria-label={`Scale from ${formatCount(block.min)} to ${formatCount(block.max)}`}>
        <span className="band-line" />
        <span
          className="band-span"
          style={{
            left: point && block.start >= 100 ? 'calc(100% - 2px)' : `${block.start}%`,
            width: point ? '2px' : `${span}%`,
          }}
        />
        <span className="band-tick" style={{ left: `${block.centerAt}%` }} />
      </div>
      <div className="band-ends" aria-hidden="true">
        <span>{formatCount(block.min)}</span>
        <span>{formatCount(block.max)}</span>
      </div>
    </figure>
  )
}

function ReportBlockView({ block }: { block: ReportBlock }) {
  switch (block.type) {
    case 'limit':
      return <p className={block.quiet ? 'report-limit is-quiet' : 'report-limit'}>{block.text}</p>
    case 'headline':
      return (
        <div className="report-lead">
          <h1>{block.range}</h1>
          <p className="report-center">{block.center}</p>
          {block.count ? <p className="report-count">{block.count}</p> : null}
        </div>
      )
    case 'track':
      return <Track block={block} />
    case 'pool':
      return (
        <p className="field-error" role="status">
          {block.text}
        </p>
      )
    case 'tail':
      return <p className="report-tail">{block.text}</p>
    case 'drivers':
      return (
        <div className="report-drivers">
          {block.lines.map((line) => (
            <p key={line.key}>{line.text}</p>
          ))}
        </div>
      )
    case 'games':
      return (
        <section className="report-played">
          {block.colors ? <p className="report-tally">{block.colors}</p> : null}
          {block.results ? <p className="report-tally">{block.results}</p> : null}
          {block.rows.length > 0 ? (
            <ul>
              {block.rows.map((row) => (
                <li key={row.key}>{row.text}</li>
              ))}
            </ul>
          ) : null}
        </section>
      )
    case 'footer':
      return (
        <p className="report-footer">
          {block.label}
          <span aria-hidden="true"> · </span>
          {block.depth}
          <span aria-hidden="true"> · </span>
          <Link to="/method" className="report-revision">
            {block.revision}
          </Link>
        </p>
      )
    case 'again':
      return (
        <Link to="/" className="text-button report-again">
          {block.label}
        </Link>
      )
  }
}

export function ReportPage() {
  const { id = '' } = useParams()
  const view = useReport(id)
  const mainRef = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [id])

  useEffect(() => {
    if (view.kind === 'loading') return
    mainRef.current?.focus({ preventScroll: true })
  }, [view])

  return (
    <div className="room">
      <SiteHeader />
      <main
        className="page report"
        ref={mainRef}
        tabIndex={-1}
        aria-busy={view.kind === 'loading' || view.kind === 'running' ? true : undefined}
      >
        {view.kind === 'loading' ? (
          <p className="report-status" role="status">
            Loading the read.
          </p>
        ) : null}
        {view.kind === 'running' ? (
          <p className="report-status" role="status">
            {view.text}
          </p>
        ) : null}
        {view.kind === 'failed' ? (
          <p className="field-error" role="alert">
            {view.message}
          </p>
        ) : null}
        {view.kind === 'expired' ? (
          <p className="field-error report-expired" role="status">
            {EXPIRED_LEAD} <Link to="/">{EXPIRED_ACTION}</Link>
          </p>
        ) : null}
        {view.kind === 'done' ? (
          <div className="report-stack">
            {view.blocks.map((block, index) => (
              <ReportBlockView key={`${block.type}-${index}`} block={block} />
            ))}
          </div>
        ) : null}
      </main>
    </div>
  )
}
