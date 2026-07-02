import type { Api } from '../shared/types'

declare global {
  interface Window {
    api: Api & { getPathForFile: (file: File) => string; rendererReady: () => void }
  }
}

export {}
