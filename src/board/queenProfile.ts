import { Vector2 } from 'three'

type ProfilePoint = readonly [number, number]

function catmull(points: ProfilePoint[], steps: number): ProfilePoint[] {
  if (points.length < 2) return [...points]

  const out: ProfilePoint[] = []
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[Math.max(index - 1, 0)]
    const p1 = points[index]
    const p2 = points[index + 1]
    const p3 = points[Math.min(index + 2, points.length - 1)]
    for (let step = 0; step < steps; step += 1) {
      const t = step / steps
      const t2 = t * t
      const t3 = t2 * t
      const radius =
        0.5 *
        (2 * p1[0] +
          (-p0[0] + p2[0]) * t +
          (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
          (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3)
      const height =
        0.5 *
        (2 * p1[1] +
          (-p0[1] + p2[1]) * t +
          (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
          (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
      out.push([Math.max(radius, 0), height])
    }
  }
  out.push(points[points.length - 1])
  return out
}

function turned(sections: ProfilePoint[][]): ProfilePoint[] {
  return sections.flatMap((section) => catmull(section, 6))
}

function profile(sections: ProfilePoint[][]): Vector2[] {
  return turned(sections).map(([radius, height]) => new Vector2(radius, height))
}

const FOOT: ProfilePoint[] = [
  [0, 0],
  [0.3, 0],
  [0.348, 0.016],
  [0.352, 0.04],
  [0.31, 0.058],
  [0.24, 0.078],
]

const COLLAR: ProfilePoint[] = [
  [0.24, 0.078],
  [0.205, 0.092],
  [0.242, 0.112],
  [0.248, 0.132],
  [0.19, 0.15],
]

const QUEEN_SECTIONS: ProfilePoint[][] = [
  FOOT,
  COLLAR,
  [
    [0.19, 0.15],
    [0.128, 0.2],
    [0.1, 0.32],
    [0.096, 0.46],
    [0.112, 0.56],
    [0.15, 0.6],
  ],
  [
    [0.15, 0.6],
    [0.186, 0.624],
    [0.154, 0.648],
    [0.136, 0.69],
  ],
  [
    [0.136, 0.69],
    [0.15, 0.74],
    [0.2, 0.84],
    [0.262, 0.96],
    [0.292, 1.06],
    [0.268, 1.15],
    [0.21, 1.23],
    [0.164, 1.3],
    [0.156, 1.36],
  ],
  [
    [0.156, 1.36],
    [0.178, 1.41],
    [0.23, 1.48],
    [0.268, 1.54],
    [0.24, 1.59],
    [0.15, 1.64],
    [0.08, 1.69],
    [0.04, 1.73],
  ],
]

const PAWN_SECTIONS: ProfilePoint[][] = [
  FOOT,
  COLLAR,
  [
    [0.19, 0.15],
    [0.12, 0.22],
    [0.078, 0.36],
    [0.07, 0.5],
    [0.086, 0.58],
  ],
  [
    [0.086, 0.58],
    [0.13, 0.63],
    [0.15, 0.68],
    [0.11, 0.73],
  ],
]

const ROOK_SECTIONS: ProfilePoint[][] = [
  FOOT,
  COLLAR,
  [
    [0.19, 0.15],
    [0.15, 0.26],
    [0.142, 0.48],
    [0.158, 0.72],
    [0.186, 0.9],
    [0.21, 1.0],
  ],
  [
    [0.21, 1.0],
    [0.238, 1.04],
    [0.232, 1.12],
    [0.22, 1.15],
  ],
]

const BISHOP_SECTIONS: ProfilePoint[][] = [
  FOOT,
  COLLAR,
  [
    [0.19, 0.15],
    [0.114, 0.28],
    [0.086, 0.5],
    [0.084, 0.68],
    [0.112, 0.8],
    [0.15, 0.88],
  ],
  [
    [0.15, 0.88],
    [0.188, 0.92],
    [0.15, 0.96],
    [0.128, 1.02],
  ],
  [
    [0.128, 1.02],
    [0.168, 1.1],
    [0.198, 1.2],
    [0.17, 1.32],
    [0.09, 1.44],
    [0.028, 1.52],
    [0.01, 1.55],
  ],
]

function tallerStem(sections: ProfilePoint[][], top: number): ProfilePoint[][] {
  const sourceTop = 1.73
  const collar = 0.15
  const factor = (top - collar) / (sourceTop - collar)
  return sections.map((section) =>
    section.map(([radius, height]) => {
      if (height <= collar) return [radius, height] as const
      return [radius, collar + (height - collar) * factor] as const
    }),
  )
}

const KING_SECTIONS = tallerStem(QUEEN_SECTIONS, 1.88)

export function createQueenProfile(): Vector2[] {
  return profile(QUEEN_SECTIONS)
}

export function createPawnProfile(): Vector2[] {
  return profile(PAWN_SECTIONS)
}

export function createRookProfile(): Vector2[] {
  return profile(ROOK_SECTIONS)
}

export function createBishopProfile(): Vector2[] {
  return profile(BISHOP_SECTIONS)
}

export function createKingProfile(): Vector2[] {
  return profile(KING_SECTIONS)
}

export function createFootProfile(): Vector2[] {
  return profile([FOOT, COLLAR])
}
