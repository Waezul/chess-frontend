import { createContext } from 'react'
import type { Slide } from './types.ts'

export type ReelFrame = {
  zoom: number
  slideT: number
  slides: Slide[]
}

export type FrameRef = { current: ReelFrame }

export const ReelFrameContext = createContext<FrameRef | null>(null)
