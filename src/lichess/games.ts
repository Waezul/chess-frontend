import { FILE_TOO_LARGE, isAbortError } from '../api/errors.ts'
import { PGN_BYTE_LIMIT } from '../upload/pgnFile.ts'

export type LichessPool = 'rapid' | 'classical'

export const LICHESS_LOADING = 'Loading games from Lichess.'

export const LICHESS_EMPTY = 'No rated games came back for that player.'

export const LICHESS_NOT_FOUND = 'No Lichess player by that name.'

export const LICHESS_LIMIT = 'Lichess is limiting requests. Wait a moment and try again.'

export const LICHESS_UNREACHABLE = 'Lichess could not be reached. Paste a PGN instead.'

const GAMES_MAX = 30

export type LichessGamesResult =
  | { ok: true; pgn: string; username: string }
  | { ok: false; message: string }

export function isLichessPool(id: string | null): id is LichessPool {
  return id === 'rapid' || id === 'classical'
}

export function ratedGamesUrl(username: string, pool: LichessPool): string {
  const params = new URLSearchParams({
    rated: 'true',
    perfType: pool,
    moves: 'true',
    opening: 'true',
    tags: 'true',
    max: String(GAMES_MAX),
  })
  return `https://lichess.org/api/games/user/${encodeURIComponent(username)}?${params.toString()}`
}

function concat(chunks: Uint8Array[], total: number): Uint8Array {
  const body = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return body
}

async function readBody(response: Response): Promise<Uint8Array | 'too-large'> {
  const reader = response.body?.getReader()
  if (!reader) {
    const buffer = new Uint8Array(await response.arrayBuffer())
    if (buffer.byteLength > PGN_BYTE_LIMIT) return 'too-large'
    return buffer
  }

  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value?.byteLength) continue
    total += value.byteLength
    if (total > PGN_BYTE_LIMIT) {
      await reader.cancel()
      return 'too-large'
    }
    chunks.push(value)
  }
  return concat(chunks, total)
}

function messageForStatus(status: number): string | null {
  if (status === 404) return LICHESS_NOT_FOUND
  if (status === 429) return LICHESS_LIMIT
  if (!status || status < 200 || status >= 300) return LICHESS_UNREACHABLE
  return null
}

export async function loadRatedGames(
  username: string,
  pool: LichessPool,
  signal: AbortSignal,
): Promise<LichessGamesResult> {
  const name = username.trim()
  let response: Response
  try {
    response = await fetch(ratedGamesUrl(name, pool), {
      method: 'GET',
      signal,
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      headers: { Accept: 'application/x-chess-pgn' },
    })
  } catch (error) {
    if (isAbortError(error)) throw error
    return { ok: false, message: LICHESS_UNREACHABLE }
  }

  const statusMessage = messageForStatus(response.status)
  if (statusMessage) {
    await response.body?.cancel()
    return { ok: false, message: statusMessage }
  }

  const body = await readBody(response)
  if (signal.aborted) throw new DOMException('The operation was aborted.', 'AbortError')
  if (body === 'too-large') return { ok: false, message: FILE_TOO_LARGE }
  const pgn = new TextDecoder().decode(body)
  if (!pgn.trim()) return { ok: false, message: LICHESS_EMPTY }
  return { ok: true, pgn, username: name }
}
