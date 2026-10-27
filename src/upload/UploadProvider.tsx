import { createContext, useContext, type ReactNode } from 'react'
import { useScoreSheet } from './useScoreSheet.ts'
import { useUploadForm } from './useUploadForm.ts'

type UploadForm = ReturnType<typeof useUploadForm>
type ScoreSheet = ReturnType<typeof useScoreSheet>

type UploadContextValue = {
  form: UploadForm
  sheet: ScoreSheet
  selected: NonNullable<UploadForm['pools']>[number] | null
}

const UploadContext = createContext<UploadContextValue | null>(null)

export function UploadProvider({ children }: { children: ReactNode }) {
  const form = useUploadForm()
  const selected = form.pools?.find((pool) => pool.id === form.poolId) ?? null
  const sheet = useScoreSheet({
    poolId: form.poolId,
    gamesRequired: selected?.games_required ?? null,
    pgn: form.pgn,
    subject: form.subject,
    engineDown: form.engineDown,
    holdCheck: form.lichessLoading,
  })

  return <UploadContext.Provider value={{ form, sheet, selected }}>{children}</UploadContext.Provider>
}

export function useUpload() {
  const value = useContext(UploadContext)
  if (!value) throw new Error('useUpload must be used within UploadProvider')
  return value
}
