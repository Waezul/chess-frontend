import type { CheckedGame, GameCheck, PoolId, Reason } from './types.ts'

const SPEEDS = ['ultrabullet', 'bullet', 'blitz', 'rapid', 'classical'] as const

type Speed = (typeof SPEEDS)[number]

export function checkFromPgn(input: {
  pool: PoolId
  pgn: string
  subject: string
  gamesRequired: number
}): GameCheck {
  const games = splitPgn(input.pgn).map((chunk, index) => inspect(chunk, index, input.pool, input.subject))
  return { pool: input.pool, games_required: input.gamesRequired, games }
}

function splitPgn(pgn: string): string[] {
  const text = pgn.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim()
  if (!text) return []
  const chunks: string[] = []
  let buffer: string[] = []
  let headerPhase = false
  for (const line of text.split('\n')) {
    const header = /^\s*\[[A-Za-z0-9_]+\s+".*"\]\s*$/.test(line)
    if (header) {
      if (!headerPhase && buffer.some((entry) => entry.trim())) {
        chunks.push(buffer.join('\n'))
        buffer = []
      }
      headerPhase = true
    } else if (line.trim()) {
      headerPhase = false
    }
    buffer.push(line)
  }
  if (buffer.some((entry) => entry.trim())) chunks.push(buffer.join('\n'))
  return chunks.map((chunk) => chunk.trim()).filter(Boolean)
}

function inspect(chunk: string, index: number, pool: PoolId, subject: string): CheckedGame {
  const headers = headersOf(chunk)
  const movetext = movetextOf(chunk)
  const plies = plyCount(movetext)
  const white = headerText(headers, 'White') ?? ''
  const black = headerText(headers, 'Black') ?? ''
  const asWhite = sameName(white, subject)
  const asBlack = sameName(black, subject)
  const result = resultOf(headers, movetext)
  const reason = decide({ headers, result, pool, asWhite, asBlack, plies })
  return {
    index,
    accepted: reason === 'ok',
    reason,
    color: reason === 'ok' ? (asWhite ? 'white' : 'black') : null,
    white,
    black,
    date: headerText(headers, 'Date'),
    opening: headerText(headers, 'Opening'),
    result,
    moves: plies > 0 ? Math.ceil(plies / 2) : null,
  }
}

function decide(input: {
  headers: Map<string, string>
  result: string | null
  pool: PoolId
  asWhite: boolean
  asBlack: boolean
  plies: number
}): Reason {
  if (input.headers.has('Variant') && !isStandard(input.headers.get('Variant') ?? '')) return 'variant'
  if ((headerText(input.headers, 'Site') ?? '').toLowerCase().includes('chess.com')) return 'wrong_pool'

  const event = headerText(input.headers, 'Event') ?? ''
  const timeControl = headerText(input.headers, 'TimeControl')
  if (isUnrated(event, timeControl)) return 'unrated'

  if (gameSpeed(event, timeControl) !== input.pool) return 'wrong_pool'
  if (!input.asWhite && !input.asBlack) return 'name_missing'

  const termination = headerText(input.headers, 'Termination')
  const normalResult = input.result === '1-0' || input.result === '0-1' || input.result === '1/2-1/2'
  if (!termination || termination.toLowerCase() !== 'normal' || !normalResult) return 'unfinished'

  const played = input.asWhite ? Math.ceil(input.plies / 2) : Math.floor(input.plies / 2)
  if (played < 10) return 'too_short'
  return 'ok'
}

function headersOf(chunk: string): Map<string, string> {
  const headers = new Map<string, string>()
  for (const line of chunk.split('\n')) {
    const match = /^\s*\[([A-Za-z0-9_]+)\s+"(.*)"\]\s*$/.exec(line)
    if (!match) continue
    headers.set(match[1], match[2].replace(/\\"/g, '"').replace(/\\\\/g, '\\'))
  }
  return headers
}

function movetextOf(chunk: string): string {
  return chunk
    .split('\n')
    .filter((line) => !/^\s*\[[A-Za-z0-9_]+\s+".*"\]\s*$/.test(line))
    .join('\n')
}

function headerText(headers: Map<string, string>, key: string): string | null {
  const value = headers.get(key)?.trim()
  return value ? value : null
}

function sameName(header: string, subject: string): boolean {
  const left = header.trim().toLowerCase()
  const right = subject.trim().toLowerCase()
  return left.length > 0 && left === right
}

function isStandard(variant: string): boolean {
  const value = variant.trim().toLowerCase()
  return value === 'standard' || value === 'standard chess'
}

function isUnrated(event: string, timeControl: string | null): boolean {
  const name = event.toLowerCase()
  if (name.includes('correspondence') || name.includes('casual') || name.includes('unrated')) return true
  if (!name.includes('rated')) return true
  return !timeControl || timeControl === '-'
}

function gameSpeed(event: string, timeControl: string | null): Speed | null {
  const name = event.toLowerCase()
  const named = SPEEDS.find((speed) => name.includes(speed))
  if (named) return named
  if (!timeControl) return null
  const match = /^(\d+)\+(\d+)$/.exec(timeControl)
  if (!match) return null
  const seconds = Number(match[1]) + 40 * Number(match[2])
  if (seconds < 180) return 'bullet'
  if (seconds < 480) return 'blitz'
  if (seconds < 1500) return 'rapid'
  return 'classical'
}

function resultOf(headers: Map<string, string>, movetext: string): string | null {
  const header = headerText(headers, 'Result')
  if (header) return header
  const tokens = movetext.match(/\b(?:1-0|0-1|1\/2-1\/2|\*)\b/g)
  return tokens ? tokens[tokens.length - 1] : null
}

function plyCount(movetext: string): number {
  const text = stripAnnotations(movetext)
    .replace(/\b\d+\.+/g, ' ')
    .replace(/\b(?:1-0|0-1|1\/2-1\/2|\*)\b/g, ' ')
  return text.split(/\s+/).filter(Boolean).length
}

function stripAnnotations(text: string): string {
  let out = ''
  let index = 0
  while (index < text.length) {
    const ch = text[index]
    if (ch === '{') {
      const end = text.indexOf('}', index + 1)
      index = end < 0 ? text.length : end + 1
      out += ' '
      continue
    }
    if (ch === ';') {
      const end = text.indexOf('\n', index + 1)
      index = end < 0 ? text.length : end + 1
      out += ' '
      continue
    }
    if (ch === '(') {
      let depth = 1
      index += 1
      while (index < text.length && depth > 0) {
        if (text[index] === '{') {
          const end = text.indexOf('}', index + 1)
          index = end < 0 ? text.length : end + 1
          continue
        }
        if (text[index] === '(') depth += 1
        else if (text[index] === ')') depth -= 1
        index += 1
      }
      out += ' '
      continue
    }
    out += ch
    index += 1
  }
  return out.replace(/\$\d+/g, ' ')
}
