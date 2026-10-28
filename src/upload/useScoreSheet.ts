import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { checkGames, getEstimate, postEstimate } from '../api/client.ts'
import { CHECK_FAILED, ESTIMATE_FAILED, isAbortError, messageFrom } from '../api/errors.ts'
import type { CheckedGame, PoolId } from '../api/types.ts'
import { pollEstimate, settleRead } from './estimatePoll.ts'
import { dropPostedRead, rememberPostedRead, rowsFromChecklist } from './postedRead.ts'
import {
  canEstimate,
  firstAcceptedIndexes,
  nextCheck,
  SHOWN_GAME_LIMIT,
  shownGames,
  tickedIndexes,
  watchLimit,
  type CheckedSnapshot,
} from './scoreSheet.ts'

type SheetPhase = 'idle' | 'checking' | 'ready' | 'failed'

type UseScoreSheetInput = {
  poolId: PoolId | null
  gamesRequired: number | null
  pgn: string
  subject: string
  engineDown: boolean
  holdCheck: boolean
  depth: number | null
}

type CheckSnapshot = {
  poolId: PoolId
  pgn: string
  subject: string
}

export function useScoreSheet({
  poolId,
  gamesRequired,
  pgn,
  subject,
  engineDown,
  holdCheck,
  depth,
}: UseScoreSheetInput) {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<SheetPhase>('idle')
  const [games, setGames] = useState<CheckedGame[]>([])
  const [ticked, setTicked] = useState<number[]>([])
  const [checked, setChecked] = useState<CheckedSnapshot | null>(null)
  const [checkError, setCheckError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [reading, setReading] = useState(false)
  const [readDepth, setReadDepth] = useState<number | null>(null)
  const [shownCount, setShownCount] = useState(SHOWN_GAME_LIMIT)

  const latest = useRef({ poolId, pgn, subject })
  latest.current = { poolId, pgn, subject }
  const handledRef = useRef<CheckedSnapshot | null>(null)
  const holdRef = useRef(holdCheck)
  holdRef.current = holdCheck
  const generation = useRef(0)
  const timer = useRef<number | null>(null)
  const inflight = useRef<AbortController | null>(null)
  const submitAbort = useRef<AbortController | null>(null)
  const submittingRef = useRef(false)

  function stopInFlight() {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
    inflight.current?.abort()
    inflight.current = null
    generation.current += 1
  }

  function resetSheet(next: 'idle' | 'checking') {
    dropPostedRead()
    submitAbort.current?.abort()
    submitAbort.current = null
    submittingRef.current = false
    setSubmitting(false)
    setReading(false)
    setReadDepth(null)
    setPhase(next)
    setGames([])
    setTicked([])
    setShownCount(SHOWN_GAME_LIMIT)
    handledRef.current = null
    setChecked(null)
    setCheckError(null)
    setSubmitError(null)
  }

  async function perform(snapshot: CheckSnapshot, signal: AbortSignal, id: number) {
    try {
      const result = await checkGames(
        { pool: snapshot.poolId, pgn: snapshot.pgn, subject: snapshot.subject },
        signal,
      )
      if (id !== generation.current || signal.aborted) return
      const settled = { pool: snapshot.poolId, pgn: snapshot.pgn, subject: snapshot.subject }
      handledRef.current = settled
      setGames(result.games)
      setChecked(settled)
      setCheckError(null)
      setPhase('ready')
    } catch (error) {
      if (signal.aborted || isAbortError(error)) return
      if (id !== generation.current) return
      handledRef.current = { pool: snapshot.poolId, pgn: snapshot.pgn, subject: snapshot.subject }
      setGames([])
      setChecked(null)
      setCheckError(messageFrom(error, CHECK_FAILED))
      setPhase('failed')
    }
  }

  function startNow(snapshot: CheckSnapshot) {
    const id = ++generation.current
    const controller = new AbortController()
    inflight.current = controller
    void perform(snapshot, controller.signal, id)
    return controller
  }

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
      inflight.current?.abort()
      submitAbort.current?.abort()
      generation.current += 1
    }
  }, [])

  useEffect(() => {
    if (holdCheck) {
      // The load is the next paste. Skip games:check until it lands or fails.
      stopInFlight()
      setPhase((current) => (current === 'checking' ? 'idle' : current))
      return
    }

    const handled = handledRef.current
    const textSame = handled !== null && handled.pgn === pgn && handled.subject === subject
    const poolSame = handled !== null && handled.pool === poolId
    if (textSame && poolSame) return

    if (textSame && !poolSame) {
      const plan = nextCheck({
        hasPool: poolId !== null,
        hasPaste: pgn.trim().length > 0,
        hasSubject: subject.trim().length > 0,
        trigger: 'pool',
      })
      if (plan !== 'now' || !poolId) {
        if (poolId && pgn.trim()) {
          stopInFlight()
          resetSheet('idle')
        }
        return
      }
      stopInFlight()
      resetSheet('checking')
      const controller = startNow({ poolId, pgn, subject })
      return () => {
        controller.abort()
        if (inflight.current === controller) inflight.current = null
        generation.current += 1
      }
    }

    const plan = nextCheck({
      hasPool: poolId !== null,
      hasPaste: pgn.trim().length > 0,
      hasSubject: subject.trim().length > 0,
      trigger: 'text',
    })
    if (plan !== 'debounce' || !poolId) {
      stopInFlight()
      resetSheet('idle')
      return
    }

    stopInFlight()
    resetSheet('checking')
    const snapshot = { poolId, pgn, subject }
    timer.current = window.setTimeout(() => {
      timer.current = null
      const current = latest.current
      if (!current.poolId || current.pgn !== snapshot.pgn || current.subject !== snapshot.subject) return
      startNow({ poolId: current.poolId, pgn: current.pgn, subject: current.subject })
    }, 400)

    return () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current)
        timer.current = null
      }
    }
    // resetSheet and stopInFlight close over stable setters and refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pgn, subject, holdCheck])

  useEffect(() => {
    if (holdRef.current) return
    const current = latest.current
    const plan = nextCheck({
      hasPool: current.poolId !== null,
      hasPaste: current.pgn.trim().length > 0,
      hasSubject: current.subject.trim().length > 0,
      trigger: 'pool',
    })
    if (plan !== 'now' || !current.poolId) {
      if (current.poolId && current.pgn.trim()) {
        stopInFlight()
        resetSheet('idle')
      }
      return
    }

    stopInFlight()
    resetSheet('checking')
    const controller = startNow({ poolId: current.poolId, pgn: current.pgn, subject: current.subject })
    return () => {
      controller.abort()
      if (inflight.current === controller) inflight.current = null
      generation.current += 1
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolId])

  function showMore() {
    setShownCount((count) => count + SHOWN_GAME_LIMIT)
  }

  function toggle(index: number) {
    const visible = shownGames(games, shownCount)
    const game = visible.find((item) => item.index === index)
    if (!game?.accepted) return
    setTicked((current) => {
      const allowed = new Set(visible.filter((item) => item.accepted).map((item) => item.index))
      const kept = current.filter((item) => allowed.has(item))
      if (kept.includes(index)) return kept.filter((item) => item !== index)
      if (kept.length >= watchLimit(gamesRequired)) return kept
      return [...kept, index]
    })
  }

  function selectFirst() {
    setTicked(firstAcceptedIndexes(shownGames(games, shownCount), watchLimit(gamesRequired)))
  }

  const ready = canEstimate({
    engineDown,
    submitting,
    gamesRequired,
    poolId,
    pgn,
    subject,
    checked,
    games,
    ticked,
  })

  async function submit() {
    if (submittingRef.current || !checked || !poolId) return
    const indexes = tickedIndexes(games, ticked)
    if (
      !canEstimate({
        engineDown,
        submitting: false,
        gamesRequired,
        poolId,
        pgn,
        subject,
        checked,
        games,
        ticked,
      })
    ) {
      return
    }

    if (depth == null || !Number.isFinite(depth)) return

    const jobDepth = depth
    const controller = new AbortController()
    submitAbort.current = controller
    submittingRef.current = true
    setSubmitting(true)
    setReading(true)
    setReadDepth(jobDepth)
    setSubmitError(null)
    try {
      const started = await postEstimate(
        {
          pool: checked.pool,
          pgn: checked.pgn,
          subject: checked.subject,
          game_indexes: indexes,
        },
        controller.signal,
      )
      if (controller.signal.aborted) return
      const held = rowsFromChecklist(games, indexes)
      rememberPostedRead({ id: started.id, depth: jobDepth, games: held })
      const outcome = await pollEstimate({
        id: started.id,
        signal: controller.signal,
        read: getEstimate,
      })
      if (controller.signal.aborted || outcome.type === 'cancelled') return
      const settled = settleRead(outcome)
      if (settled.reportId) {
        if (settled.reportId !== started.id) {
          rememberPostedRead({ id: settled.reportId, depth: jobDepth, games: held })
        }
        navigate(`/report/${encodeURIComponent(settled.reportId)}`)
        return
      }
      if (settled.error) setSubmitError(settled.error)
    } catch (error) {
      if (controller.signal.aborted || isAbortError(error)) return
      setSubmitError(messageFrom(error, ESTIMATE_FAILED))
    } finally {
      if (submitAbort.current === controller) {
        submittingRef.current = false
        setSubmitting(false)
        setReading(false)
        setReadDepth(null)
        submitAbort.current = null
      }
    }
  }

  function cancelRead() {
    submitAbort.current?.abort()
    submitAbort.current = null
    submittingRef.current = false
    setSubmitting(false)
    setReading(false)
    setReadDepth(null)
    setSubmitError(null)
  }

  return {
    phase,
    games,
    ticked,
    checkError,
    submitError,
    submitting,
    reading,
    readDepth,
    canEstimate: ready,
    shownCount,
    showMore,
    toggle,
    selectFirst,
    submit,
    cancelRead,
  }
}
