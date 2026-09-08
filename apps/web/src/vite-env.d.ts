/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly NEXT_PUBLIC_NEON_AUTH_URL: string
  readonly NEXT_PUBLIC_NEON_DATA_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
