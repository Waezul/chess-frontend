import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatCount } from '../api/format.ts'
import { isAbortError } from '../api/errors.ts'
import { useReducedMotion } from '../board/useReducedMotion.ts'
import { SiteHeader } from '../components/SiteHeader.tsx'
import { loadReport, type ReportView } from '../report/loadReport.ts'
import {
  CENTERING_LEAD,
  EXPIRED_ACTION,
  EXPIRED_LEAD,
  reportBeats,
  WATCH_REPLAYS,
  type ReportBeat,
  type ReportBlock,
} from '../report/present.ts'
import { postedReadFor } from '../upload/postedRead.ts'

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

function Track({ block, labelId }: { block: Extract<ReportBlock, { type: 'track' }>; labelId: string }) {
  return (
    <figure className="band-scale">
      <div
        className="band-rail"
        id={labelId}
        role="img"
        aria-label={`Scale from ${formatCount(block.min)} to ${formatCount(block.max)}`}
      >
        <span className="band-line" />
        <span className="band-tick" style={{ left: `${block.centerAt}%` }} />
      </div>
      <div className="band-ends" aria-hidden="true">
        <span>{formatCount(block.min)}</span>
        <span>{formatCount(block.max)}</span>
      </div>
    </figure>
  )
}

function beatKey(beat: ReportBeat, index: number): string {
  return `${beat.type}-${index}`
}

function labelId(index: number): string {
  return `beat-${index}-label`
}

function sectionLabel(beat: ReportBeat, index: number, named: boolean): string {
  const id = labelId(index)
  const ids = []
  if (named) ids.push(`${id}-name`)
  ids.push(`${id}-lead`, id, `${id}-played`, `${id}-range`)
  if (beat.track) ids.push(`${id}-scale`)
  return ids.join(' ')
}

function BeatView({ beat, index, name }: { beat: ReportBeat; index: number; name: string | null }) {
  const id = labelId(index)
  return (
    <div className="report-opening">
      {name ? (
        <p className="report-name" id={`${id}-name`}>
          {name}
        </p>
      ) : null}
      <p className="report-centering" id={`${id}-lead`}>
        {CENTERING_LEAD}
      </p>
      <h1 className="report-figure" id={id}>
        {beat.headline.figure}
      </h1>
      <p className="report-played-line" id={`${id}-played`}>
        {beat.headline.played}
      </p>
      {beat.track ? <Track block={beat.track} labelId={`${id}-scale`} /> : null}
      <p className="report-range" id={`${id}-range`}>
        {beat.headline.range}
      </p>
    </div>
  )
}

function scrollWithin(section: HTMLElement, direction: 1 | -1, reduced: boolean): boolean {
  const inner = section.querySelector('.report-beat-inner')
  if (!(inner instanceof HTMLElement)) return false
  const behavior = reduced ? 'auto' : 'smooth'
  if (direction > 0) {
    const room = inner.scrollHeight - inner.clientHeight - inner.scrollTop
    if (room <= 2) return false
    inner.scrollBy({ top: Math.min(inner.clientHeight * 0.85, room), behavior })
    return true
  }
  if (inner.scrollTop <= 2) return false
  inner.scrollBy({ top: -Math.min(inner.clientHeight * 0.85, inner.scrollTop), behavior })
  return true
}

function ReportStory({ blocks, name }: { blocks: readonly ReportBlock[]; name: string | null }) {
  const beats = reportBeats(blocks)
  const reduced = useReducedMotion()
  const mainRef = useRef<HTMLElement>(null)
  const beatRefs = useRef<Array<HTMLElement | null>>([])
  const [current, setCurrent] = useState(0)
  const currentRef = useRef(0)
  const scrolling = useRef(false)
  const scrollToken = useRef(0)
  const scrollTimer = useRef(0)
  const pointerNav = useRef(false)

  const go = useCallback(
    (index: number, focus: boolean, fromPointer: boolean) => {
      const next = Math.min(beats.length - 1, Math.max(0, index))
      const node = beatRefs.current[next]
      const main = mainRef.current
      if (!node || !main) return
      const token = scrollToken.current + 1
      scrollToken.current = token
      scrolling.current = true
      currentRef.current = next
      setCurrent(next)
      const inner = node.querySelector('.report-beat-inner')
      if (inner instanceof HTMLElement) inner.scrollTop = 0
      node.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
      for (const candidate of beatRefs.current) candidate?.removeAttribute('data-pointer-focus')
      if (focus) {
        if (fromPointer) node.setAttribute('data-pointer-focus', '')
        node.focus({ preventScroll: true })
      }
      window.clearTimeout(scrollTimer.current)
      const stop = () => {
        if (scrollToken.current !== token) return
        scrolling.current = false
      }
      main.addEventListener('scrollend', stop, { once: true })
      scrollTimer.current = window.setTimeout(stop, reduced ? 40 : 900)
    },
    [beats.length, reduced],
  )

  useEffect(() => {
    currentRef.current = current
  }, [current])

  useLayoutEffect(() => {
    mainRef.current?.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true })
    return () => window.clearTimeout(scrollTimer.current)
  }, [])

  useEffect(() => {
    beatRefs.current.length = beats.length
    const root = mainRef.current
    if (!root) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (scrolling.current) return
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (!visible) return
        const index = beatRefs.current.findIndex((node) => node === visible.target)
        if (index < 0) return
        currentRef.current = index
        setCurrent(index)
      },
      { root, threshold: [0.55, 0.75] },
    )
    for (const node of beatRefs.current) {
      if (node) observer.observe(node)
    }
    return () => observer.disconnect()
  }, [beats.length])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      const target = event.target
      if (target instanceof HTMLElement) {
        const tag = target.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return
      }
      const direction =
        event.key === 'ArrowDown' || event.key === 'ArrowRight' || event.key === 'PageDown'
          ? 1
          : event.key === 'ArrowUp' || event.key === 'ArrowLeft' || event.key === 'PageUp'
            ? -1
            : 0
      if (direction === 0) return
      const section = beatRefs.current[currentRef.current]
      if (section && scrollWithin(section, direction, reduced)) {
        event.preventDefault()
        return
      }
      const next = currentRef.current + direction
      if (next < 0 || next >= beats.length) {
        event.preventDefault()
        return
      }
      event.preventDefault()
      go(next, true, false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [beats.length, go, reduced])

  const step = `${current + 1} of ${beats.length}`

  return (
    <>
      <main className="page report is-story" ref={mainRef} tabIndex={-1}>
        {beats.map((beat, index) => {
          const labelledBy = sectionLabel(beat, index, Boolean(name))
          return (
            <section
              key={beatKey(beat, index)}
              className={`report-beat report-beat-${beat.type}`}
              ref={(node) => {
                beatRefs.current[index] = node
              }}
              tabIndex={-1}
              aria-labelledby={labelledBy || undefined}
              aria-current={index === current ? 'step' : undefined}
            >
              <div className="report-beat-inner">
                <BeatView beat={beat} index={index} name={name} />
                <Link to="/replay" className="text-button report-watch">
                  {WATCH_REPLAYS}
                </Link>
              </div>
            </section>
          )
        })}
      </main>
      {beats.length > 1 ? (
      <nav className="report-nav" aria-label="This read">
        {current > 0 ? (
          <button
            type="button"
            className="text-button report-nav-prev"
            onPointerDown={() => {
              pointerNav.current = true
            }}
            onClick={() => {
              const fromPointer = pointerNav.current
              pointerNav.current = false
              go(current - 1, true, fromPointer)
            }}
          >
            Previous
          </button>
        ) : (
          <span className="report-nav-gap" aria-hidden="true" />
        )}
        <div className="report-step-wrap">
          <p className="report-step">{step}</p>
          <span className="report-marks" aria-hidden="true">
            {beats.map((beat, index) => (
              <span key={beatKey(beat, index)} className={index === current ? 'report-mark is-current' : 'report-mark'} />
            ))}
          </span>
        </div>
        {current < beats.length - 1 ? (
          <button
            type="button"
            className="text-button report-nav-next"
            onPointerDown={() => {
              pointerNav.current = true
            }}
            onClick={() => {
              const fromPointer = pointerNav.current
              pointerNav.current = false
              go(current + 1, true, fromPointer)
            }}
          >
            Next
          </button>
        ) : (
          <span className="report-nav-gap" aria-hidden="true" />
        )}
      </nav>
      ) : null}
    </>
  )
}

function postedName(id: string): string | null {
  const subject = postedReadFor(id)?.subject.trim() ?? ''
  return subject || null
}

export function ReportPage() {
  const { id = '' } = useParams()
  const view = useReport(id)
  const mainRef = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [id])

  useEffect(() => {
    if (view.kind === 'loading' || view.kind === 'done') return
    mainRef.current?.focus({ preventScroll: true })
  }, [view])

  return (
    <div className="room">
      <SiteHeader backTo="/" backLabel="Get your Elo guessed" />
      {view.kind === 'done' ? (
        <ReportStory blocks={view.blocks} name={postedName(id)} />
      ) : (
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
        </main>
      )}
    </div>
  )
}
