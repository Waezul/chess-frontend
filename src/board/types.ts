export type PieceColor = 'w' | 'b'
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k'

export type PlacedPiece = {
  id: string
  square: string
  type: PieceType
  color: PieceColor
}

export type Slide = {
  id: string
  from: string
  to: string
}

export type ReplayMove = {
  san: string
  from: string
  to: string
  slides: Slide[]
  captured: string[]
  promotion: PieceType | null
  turn: PieceColor
}

export type ReplayGame = {
  start: PlacedPiece[]
  startTurn: PieceColor
  moves: ReplayMove[]
}

export type ReelCue = {
  label: string
  san: string
  turn: string
}
