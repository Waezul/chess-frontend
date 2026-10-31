import { isLichessPool } from './games.ts'

/** Same wait as `games:check` so typing the name feels consistent. */
export const LICHESS_NAME_RELOAD_MS = 400

export type NameReloadAction = 'ignore' | 'schedule' | 'cancel'

/** After a Lichess paste (or while one is loading), a subject edit may refetch. */
export function nameReloadAction(input: {
  lichessPaste: boolean
  lichessLoading: boolean
  username: string
  poolId: string | null
}): NameReloadAction {
  if (!input.lichessPaste && !input.lichessLoading) return 'ignore'
  if (!input.username.trim() || !isLichessPool(input.poolId)) return 'cancel'
  return 'schedule'
}
