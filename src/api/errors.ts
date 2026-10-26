const SENTENCES: Record<string, string> = {
  wrong_count: 'Select exactly the number of games this pool requires.',
  pool_unavailable: 'That time control is not published yet.',
  empty_pgn: 'Paste a PGN first.',
  subject_required: 'Enter the name you played under.',
  bad_indexes: 'Tick only accepted games from the checklist, each once.',
  bad_request: 'That request was malformed. Reload the page and try again.',
  body_too_large: 'That file is over 2 MB.',
  unknown_pool: 'That time control is not published.',
  unknown_job: 'That read expired. Start it again.',
  busy: 'The engine is busy. Wait a moment and try again.',
  engine_down: 'The engine is down. The checklist still works.',
}

export const POOLS_FAILED = 'The time controls could not be loaded. Reload the page and try again.'

export const FILE_TOO_LARGE = 'That file is over 2 MB.'

export const ENGINE_DOWN = SENTENCES.engine_down

export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export class AbsentApiError extends Error {
  constructor() {
    super('API absent')
    this.name = 'AbsentApiError'
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

function record(body: unknown): { error?: unknown; message?: unknown } | null {
  if (!body || typeof body !== 'object') return null
  return body
}

export function sentenceFor(body: unknown): string | null {
  const fields = record(body)
  if (!fields) return null
  if (typeof fields.message === 'string' && fields.message.trim()) return fields.message.trim()
  if (typeof fields.error === 'string' && SENTENCES[fields.error]) return SENTENCES[fields.error]
  return null
}

export function errorCode(body: unknown): string {
  const fields = record(body)
  return fields && typeof fields.error === 'string' ? fields.error : ''
}
