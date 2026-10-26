import { useEffect, useRef, useState } from 'react'
import { loadLanding } from '../api/client.ts'
import { FILE_TOO_LARGE, isAbortError, POOLS_FAILED } from '../api/errors.ts'
import type { PoolId, PoolSummary } from '../api/types.ts'
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
  const fileText = useRef<string | null>(null)
  const readId = useRef(0)
  const alive = useRef(true)

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
    }
  }, [])

  function selectPool(id: string) {
    const pool = pools?.find((item) => item.id === id)
    if (!pool?.available) return
    setPoolId(pool.id)
  }

  function editPgn(next: string) {
    readId.current += 1
    if (exceedsPgnLimit(next)) {
      setPgnError(FILE_TOO_LARGE)
      return
    }
    setPgn(next)
    setPgnError(null)
    if (fileText.current !== null && next !== fileText.current) {
      fileText.current = null
      setFileName(null)
      setFileBytes(null)
    }
  }

  function removeFile() {
    readId.current += 1
    fileText.current = null
    setPgn('')
    setFileName(null)
    setFileBytes(null)
    setPgnError(null)
  }

  async function chooseFile(file: File) {
    const id = ++readId.current
    try {
      const result = await readPgnFile(file)
      if (!alive.current || id !== readId.current) return
      if (!result.ok) {
        setPgnError(FILE_TOO_LARGE)
        return
      }
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
  }
}
