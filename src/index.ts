import type { Plugin } from "@opencode-ai/plugin"

interface LuthienOptions {
  providers?: string[]
}

const PLUGIN_VERSION = "0.1.0"
const DEFAULT_PROVIDERS = ["anthropic", "openai", "google"]

export const LuthienPlugin: Plugin = async (_input, options?) => {
  const proxyUrl = process.env.LUTHIEN_PROXY_URL
  const required = process.env.LUTHIEN_REQUIRED === "1"
  const opts = (options ?? {}) as LuthienOptions
  const allowlist =
    Array.isArray(opts.providers) && opts.providers.length > 0
      ? opts.providers
      : DEFAULT_PROVIDERS

  let proxyAvailable = false
  let healthError: string | null = null
  if (proxyUrl) {
    try {
      const res = await fetch(`${proxyUrl}/health`, {
        signal: AbortSignal.timeout(2000),
      })
      proxyAvailable = res.ok
      if (!res.ok) healthError = `health check returned ${res.status}`
    } catch (e) {
      healthError = (e as Error).message
    }
  } else {
    healthError = "LUTHIEN_PROXY_URL not set"
  }

  if (!proxyAvailable) {
    const msg = `[opencode-luthien] proxy unreachable (${healthError ?? "unknown"}) — routing direct to providers; observability disabled`
    process.stderr.write(msg + "\n")
    if (required) {
      throw new Error(
        `[opencode-luthien] LUTHIEN_REQUIRED=1 but proxy unreachable: ${healthError}`,
      )
    }
  }

  return {
    config: async (config) => {
      if (!proxyUrl || !proxyAvailable) return
      config.provider ??= {}
      for (const id of allowlist) {
        if (typeof id !== "string" || id.length === 0) continue
        config.provider[id] = {
          ...config.provider[id],
          options: {
            ...(config.provider[id]?.options ?? {}),
            baseURL: `${proxyUrl}/${id}`,
          },
        }
      }
    },
    "chat.headers": async (input, output) => {
      if (!proxyUrl || !proxyAvailable) return
      if (!allowlist.includes(input.provider.info.id)) return
      output.headers["x-luthien-session-id"] = input.sessionID
      output.headers["x-luthien-agent"] = input.agent
      output.headers["x-luthien-provider"] = input.provider.info.id
      output.headers["x-luthien-model"] = input.model.id
      output.headers["x-luthien-plugin-version"] = PLUGIN_VERSION
    },
  }
}

export default LuthienPlugin
