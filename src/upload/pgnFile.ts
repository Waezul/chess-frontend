export const PGN_BYTE_LIMIT = 2_097_152

const byteFormat = new Intl.NumberFormat('en-US')

export function utf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).length
}

export function exceedsPgnLimit(text: string): boolean {
  if (text.length > PGN_BYTE_LIMIT) return true
  return utf8ByteLength(text) > PGN_BYTE_LIMIT
}

export function formatByteSize(bytes: number): string {
  return `${byteFormat.format(bytes)} bytes`
}

export async function readPgnFile(
  file: File,
): Promise<{ ok: true; name: string; bytes: number; text: string } | { ok: false }> {
  if (file.size > PGN_BYTE_LIMIT) return { ok: false }
  const text = await file.text()
  if (exceedsPgnLimit(text)) return { ok: false }
  return { ok: true, name: file.name, bytes: file.size, text }
}
