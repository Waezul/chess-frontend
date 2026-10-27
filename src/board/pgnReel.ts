import { Chess, type Move } from 'chess.js'
import type { PieceColor, PlacedPiece, ReplayGame, ReplayMove, Slide } from './types.ts'

function place(chess: Chess): PlacedPiece[] {
  const pieces: PlacedPiece[] = []
  for (const row of chess.board()) {
    for (const piece of row) {
      if (!piece) continue
      pieces.push({
        id: `${piece.color}-${piece.type}-${piece.square}`,
        square: piece.square,
        type: piece.type,
        color: piece.color,
      })
    }
  }
  return pieces
}

function signature(pieces: readonly PlacedPiece[]): string {
  return pieces
    .map((piece) => `${piece.square}${piece.color}${piece.type}`)
    .sort()
    .join(' ')
}

function boardSignature(chess: Chess): string {
  return signature(place(chess))
}

function recordMove(pieces: readonly PlacedPiece[], move: Move): { pieces: PlacedPiece[]; move: ReplayMove } {
  const next = pieces.map((piece) => ({ ...piece }))
  const captured: string[] = []
  const slides: Slide[] = []

  const removeAt = (square: string) => {
    const index = next.findIndex((piece) => piece.square === square)
    if (index < 0) return
    captured.push(next[index].id)
    next.splice(index, 1)
  }

  if (move.isEnPassant()) removeAt(`${move.to[0]}${move.from[1]}`)
  else if (move.isCapture()) removeAt(move.to)

  if (move.isKingsideCastle() || move.isQueensideCastle()) {
    const rank = move.from[1]
    const rookFrom = move.isKingsideCastle() ? `h${rank}` : `a${rank}`
    const rookTo = move.isKingsideCastle() ? `f${rank}` : `d${rank}`
    const rook = next.find((piece) => piece.square === rookFrom)
    if (!rook) throw new Error(`Missing rook on ${rookFrom}`)
    slides.push({ id: rook.id, from: rookFrom, to: rookTo })
    rook.square = rookTo
  }

  const mover = next.find((piece) => piece.square === move.from)
  if (!mover) throw new Error(`Missing piece on ${move.from}`)
  slides.push({ id: mover.id, from: move.from, to: move.to })
  mover.square = move.to
  if (move.promotion) mover.type = move.promotion

  return {
    pieces: next,
    move: {
      san: move.san,
      from: move.from,
      to: move.to,
      slides,
      captured,
      promotion: move.promotion ?? null,
      turn: move.color === 'w' ? 'b' : 'w',
    },
  }
}

export function applyReplayMove(pieces: readonly PlacedPiece[], move: ReplayMove): PlacedPiece[] {
  const removed = new Set(move.captured)
  const landed = new Map(move.slides.map((slide) => [slide.id, slide.to]))
  const moverId = move.slides.find((slide) => slide.from === move.from)?.id
  return pieces
    .filter((piece) => !removed.has(piece.id))
    .map((piece) => {
      const square = landed.get(piece.id) ?? piece.square
      const type = move.promotion && piece.id === moverId ? move.promotion : piece.type
      if (square === piece.square && type === piece.type) return piece
      return { ...piece, square, type }
    })
}

export function positionAt(game: ReplayGame, ply: number) {
  let pieces = game.start
  if (ply <= 0 || game.moves.length === 0) {
    return {
      pieces,
      slides: [] as ReplayMove['slides'],
      marks: null as [string, string] | null,
      san: '',
      turn: game.startTurn,
    }
  }
  const index = Math.min(ply, game.moves.length) - 1
  for (let step = 0; step <= index; step += 1) {
    pieces = applyReplayMove(pieces, game.moves[step])
  }
  const move = game.moves[index]
  return {
    pieces,
    slides: move.slides,
    marks: [move.from, move.to] as [string, string],
    san: move.san,
    turn: move.turn,
  }
}

export function splitPgn(pgn: string): string[] {
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

function endingLabel(chess: Chess, white: string, black: string): string | null {
  const headers = chess.getHeaders()
  const result = headers.Result?.trim() ?? ''
  const termination = (headers.Termination ?? '').trim().toLowerCase()
  const whiteWins = result === '1-0'
  const blackWins = result === '0-1'
  const drawn = result === '1/2-1/2'
  if (!whiteWins && !blackWins && !drawn && !chess.isGameOver()) return null

  if (drawn || (!whiteWins && !blackWins && chess.isDraw())) {
    if (chess.isStalemate()) return 'Stalemate. Draw.'
    if (chess.isInsufficientMaterial()) return 'Draw by insufficient material.'
    if (chess.isThreefoldRepetition()) return 'Draw by repetition.'
    if (chess.isDrawByFiftyMoves()) return 'Draw by the fifty-move rule.'
    if (termination.includes('agreement')) return 'Draw by agreement.'
    return 'Draw.'
  }

  const winner = blackWins ? black : white
  const loser = blackWins ? white : black
  if (chess.isCheckmate()) return `Checkmate. ${winner} wins.`
  if (termination.includes('time')) return `${loser} ran out of time.`
  if (termination.includes('abandon')) return `${loser} abandoned the game.`
  if (termination.includes('resign') || termination === 'normal') return `${loser} resigns.`
  if (whiteWins || blackWins) return `${winner} wins.`
  return null
}

function readGame(chunk: string): ReplayGame | null {
  try {
    const chess = new Chess()
    chess.loadPgn(chunk, { strict: false })
    const verbose = chess.history({ verbose: true })
    if (verbose.length === 0) return null
    while (chess.undo()) {
      // Rewind to the setup, including a FEN header.
    }
    let pieces = place(chess)
    const start = pieces.map((piece) => ({ ...piece }))
    const startTurn = chess.turn()
    const moves: ReplayMove[] = []
    for (const move of verbose) {
      const before = pieces
      const recorded = recordMove(before, move)
      const replayed = applyReplayMove(before, recorded.move)
      const played = chess.move(move.san)
      if (!played || signature(recorded.pieces) !== boardSignature(chess)) return null
      if (signature(replayed) !== signature(recorded.pieces)) return null
      if (recorded.move.turn !== chess.turn()) return null
      pieces = recorded.pieces
      moves.push(recorded.move)
    }
    const headers = chess.getHeaders()
    const name = (value: string | undefined, fallback: string) => {
      const trimmed = value?.trim()
      return trimmed && trimmed !== '?' ? trimmed : fallback
    }
    const white = name(headers.White, 'White')
    const black = name(headers.Black, 'Black')
    return {
      white,
      black,
      ending: endingLabel(chess, white, black),
      start,
      startTurn,
      moves,
    }
  } catch {
    return null
  }
}

export function parsePgnReel(pgn: string): ReplayGame[] {
  if (!pgn.trim()) return []
  return splitPgn(pgn).flatMap((chunk) => {
    const game = readGame(chunk)
    return game ? [game] : []
  })
}

export function selectPgn(pgn: string, indexes: readonly number[]): string {
  if (!pgn.trim() || indexes.length === 0) return ''
  const chunks = splitPgn(pgn)
  return indexes
    .map((index) => chunks[index])
    .filter((chunk): chunk is string => Boolean(chunk && readGame(chunk)))
    .join('\n\n')
}

export function parsePgnGames(pgn: string, indexes: readonly number[]): ReplayGame[] {
  return parsePgnReel(selectPgn(pgn, indexes))
}

export function turnLabel(turn: PieceColor): string {
  return turn === 'w' ? 'White to move' : 'Black to move'
}
