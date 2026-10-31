import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { LICHESS_NAME_RELOAD_MS, nameReloadAction } from '../src/lichess/nameReload.ts'

test('name reload waits 400 ms, matching games:check', () => {
  assert.equal(LICHESS_NAME_RELOAD_MS, 400)
})

test('a typed name reloads Lichess only after a Lichess paste', () => {
  assert.equal(
    nameReloadAction({
      lichessPaste: true,
      lichessLoading: false,
      username: 'Ada',
      poolId: 'classical',
    }),
    'schedule',
  )
  assert.equal(
    nameReloadAction({
      lichessPaste: false,
      lichessLoading: true,
      username: 'Ada',
      poolId: 'rapid',
    }),
    'schedule',
  )
  assert.equal(
    nameReloadAction({
      lichessPaste: false,
      lichessLoading: false,
      username: 'Ada',
      poolId: 'classical',
    }),
    'ignore',
  )
})

test('clearing the name or leaving a Lichess pool cancels the load', () => {
  assert.equal(
    nameReloadAction({
      lichessPaste: true,
      lichessLoading: false,
      username: '  ',
      poolId: 'classical',
    }),
    'cancel',
  )
  assert.equal(
    nameReloadAction({
      lichessPaste: true,
      lichessLoading: false,
      username: 'Ada',
      poolId: 'blitz',
    }),
    'cancel',
  )
})

test('the replay picker starts play when another game is chosen', () => {
  const page = readFileSync(new URL('../src/pages/ReplayPage.tsx', import.meta.url), 'utf8')
  const select = page.match(/onChange=\{\(event\) => \{[\s\S]*?\}\}/)
  assert.ok(select, 'expected a select onChange handler')
  assert.match(select[0]!, /setPausedPgn\(null\)/)
  assert.equal(select[0]!.includes('setPausedPgn(form.pgn)'), false)
})

test('the upload form debounces a Lichess reload when the subject is edited', () => {
  const form = readFileSync(new URL('../src/upload/useUploadForm.ts', import.meta.url), 'utf8')
  assert.match(form, /nameReloadAction/)
  assert.match(form, /LICHESS_NAME_RELOAD_MS/)
  assert.match(form, /function editSubject/)
  assert.match(form, /setSubject:\s*editSubject/)
})
