const MAX_PACKAGE_BYTES = 64 * 1024 * 1024

function packageAddress(input: string): { url: URL; expectedDigest: string } {
  const url = new URL(input)
  const match = /\/packages\/([a-f0-9]{64})\.zip$/.exec(url.pathname)
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !match
  ) {
    throw new Error('Bitte einen HTTPS-Paketlink des Terminologieservers angeben.')
  }
  return { url, expectedDigest: match[1] }
}

async function readPackage(response: Response): Promise<Blob> {
  const reader = response.body?.getReader()
  if (!reader) throw new Error('Paketdownload enthält keine Daten.')
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    let result = await reader.read()
    while (!result.done) {
      size += result.value.byteLength
      if (size > MAX_PACKAGE_BYTES) throw new Error('Terminologiepaket überschreitet 64 MiB.')
      chunks.push(new Uint8Array(result.value))
      result = await reader.read()
    }
  } finally {
    await reader.cancel()
    reader.releaseLock()
  }
  return new Blob(chunks, { type: 'application/zip' })
}

/** Fetch public package bytes only; registration uses the existing authenticated importer. */
export async function downloadTerminologyPackage(input: string): Promise<File> {
  const { url, expectedDigest } = packageAddress(input)
  const response = await fetch(url.href, {
    credentials: 'omit',
    redirect: 'error',
    signal: AbortSignal.timeout(120_000)
  })
  if (!response.ok)
    throw new Error(`Paketdownload fehlgeschlagen (HTTP ${String(response.status)}).`)
  const blob = await readPackage(response)
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
  const actual = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('')
  if (actual !== expectedDigest)
    throw new Error('Prüfsumme des Terminologiepakets stimmt nicht überein.')
  return new File([blob], `${actual}.zip`, { type: 'application/zip' })
}
