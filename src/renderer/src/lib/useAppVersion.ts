import { useEffect, useState } from 'react'

/** The installed app version (from the main process), fetched once and cached. */
let cached: string | null = null

export function useAppVersion(): string | null {
  const [version, setVersion] = useState<string | null>(cached)
  useEffect(() => {
    if (cached) return
    void window.api.appVersion().then((v) => {
      cached = v
      setVersion(v)
    })
  }, [])
  return version
}
