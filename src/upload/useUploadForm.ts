import { useEffect, useRef, useState } from 'react'
import { loadLanding } from '../api/client.ts'
import { FILE_TOO_LARGE, isAbortError, POOLS_FAILED } from '../api/errors.ts'
import type { PoolId, PoolSummary } from '../api/types.ts'
import {
  isLichessPool,
  LICHESS_LOADING,
  LICHESS_UNREACHABLE,
  loadRatedGames,
  type LichessPool,
} from '../lichess/games.ts'
import { exceedsPgnLimit, readPgnFile } from './pgnFile.ts'

export type UploadPhase = 'loading' | 'ready' | 'failed'

export function useUploadForm() {
  const [healthNotice, setHealthNotice] = useState<string | null>(null)
  const [engineDown, setEngineDown] = useState(false)
  const [pools, setPools] = useState<PoolSummary[] | null>(null)
  const [poolsError, setPoolsError] = useState<string | null>(null)
  const [phase, setPhase] = useState<UploadPhase>('loading')
  const [poolId, setPoolId] = useState<PoolId | null>(null)
  const [subject, setSubject] = useState('')
  const [pgn, setPgn] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileBytes, setFileBytes] = useState<number | null>(null)
  const [pgnError, setPgnError] = useState<string | null>(null)
  const [lichessLoading, setLichessLoading] = useState(false)
  const [lichessError, setLichessError] = useState<string | null>(null)
  const fileText = useRef<string | null>(null)
  const readId = useRef(0)
  const alive = useRef(true)
  const lichessPaste = useRef(false)
  const lichessAbort = useRef<AbortController | null>(null)

  useEffect(() => {
    alive.current = true
    const controller = new AbortController()
    loadLanding(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        setHealthNotice(result.healthNotice)
        setEngineDown(result.health?.engine === 'down')
        setPools(result.pools)
        setPoolsError(result.poolsError)
        setPhase(result.pools ? 'ready' : 'failed')
        const first = result.pools?.find((pool) => pool.available)?.id ?? null
        setPoolId((current) => current ?? first)
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) return
        setEngineDown(false)
        setPools(null)
        setPoolsError(POOLS_FAILED)
        setPhase('failed')
      })
    return () => {
      alive.current = false
      controller.abort()
      lichessAbort.current?.abort()
    }
  }, [])

  function cancelLichess() {
    readId.current += 1
    lichessAbort.current?.abort()
    lichessAbort.current = null
    setLichessLoading(false)
  }

  function selectPool(id: string) {
    const pool = pools?.find((item) => item.id === id)
    if (!pool?.available || pool.id === poolId) return
    const reload = lichessPaste.current || lichessLoading
    setPoolId(pool.id)
    if (!reload) return
    const name = subject.trim()
    if (name && isLichessPool(pool.id)) {
      void startLoad(name, pool.id)
      return
    }
    if (lichessLoading) cancelLichess()
  }

  function editPgn(next: string) {
    readId.current += 1
    lichessAbort.current?.abort()
    lichessAbort.current = null
    setLichessLoading(false)
    if (exceedsPgnLimit(next)) {
      setPgnError(FILE_TOO_LARGE)
      return
    }
    lichessPaste.current = false
    setLichessError(null)
    setPgn(next)
    setPgnError(null)
    if (fileText.current !== null && next !== fileText.current) {
      fileText.current = null
      setFileName(null)
      setFileBytes(null)
    }
  }

  function removeFile() {
    cancelLichess()
    lichessPaste.current = false
    fileText.current = null
    setLichessError(null)
    setPgn('')
    setFileName(null)
    setFileBytes(null)
    setPgnError(null)
  }

  async function chooseFile(file: File) {
    const id = ++readId.current
    lichessAbort.current?.abort()
    lichessAbort.current = null
    lichessPaste.current = false
    setLichessLoading(false)
    try {
      const result = await readPgnFile(file)
      if (!alive.current || id !== readId.current) return
      if (!result.ok) {
        setPgnError(FILE_TOO_LARGE)
        return
      }
      lichessPaste.current = false
      setLichessError(null)
      fileText.current = result.text
      setPgn(result.text)
      setFileName(result.name)
      setFileBytes(result.bytes)
      setPgnError(null)
    } catch {
      if (!alive.current || id !== readId.current) return
      setPgnError('That file could not be read. Choose another.')
    }
  }

  async function startLoad(username: string, pool: LichessPool) {
    const id = ++readId.current
    lichessAbort.current?.abort()
    const controller = new AbortController()
    lichessAbort.current = controller
    setLichessLoading(true)
    setLichessError(null)
    try {
      const result = await loadRatedGames(username, pool, controller.signal)
      if (!alive.current || id !== readId.current) return
      if (!result.ok) {
        setLichessLoading(false)
        setLichessError(result.message)
        return
      }
      lichessPaste.current = true
      fileText.current = null
      setFileName(null)
      setFileBytes(null)
      setPgnError(null)
      setLichessLoading(false)
      setSubject(result.username)
      setPgn(result.pgn)
    } catch (error) {
      if (!alive.current || id !== readId.current || isAbortError(error)) return
      setLichessLoading(false)
      setLichessError(LICHESS_UNREACHABLE)
    }
  }

  function loadLichess() {
    if (!poolId || !isLichessPool(poolId)) return
    const username = subject.trim()
    if (!username) return
    const selected = pools?.find((pool) => pool.id === poolId)
    if (!selected?.available) return
    void startLoad(username, poolId)
  }

  return {
    healthNotice,
    engineDown,
    pools,
    poolsError,
    phase,
    poolId,
    selectPool,
    subject,
    setSubject,
    pgn,
    editPgn,
    fileName,
    fileBytes,
    pgnError,
    chooseFile,
    removeFile,
    lichessLoading,
    lichessNotice: (lichessLoading
      ? { tone: 'status' as const, text: LICHESS_LOADING }
      : lichessError
        ? { tone: 'error' as const, text: lichessError }
        : null),
    canLoadLichess:
      subject.trim().length > 0 &&
      isLichessPool(poolId) &&
      (pools?.some((pool) => pool.id === poolId && pool.available) ?? false),
    loadLichess,
  }
}
