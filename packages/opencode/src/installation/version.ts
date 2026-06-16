declare global {
  const ASYNC_CODER_VERSION: string
  const ASYNC_CODER_CHANNEL: string
}

export const InstallationVersion = typeof ASYNC_CODER_VERSION === "string" ? ASYNC_CODER_VERSION : "local"
export const InstallationChannel = typeof ASYNC_CODER_CHANNEL === "string" ? ASYNC_CODER_CHANNEL : "local"
export const InstallationLocal = InstallationChannel === "local"
