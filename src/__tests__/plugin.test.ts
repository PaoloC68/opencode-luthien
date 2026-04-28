import { afterEach, describe, expect, it, vi } from "vitest"
import LuthienPlugin from "../index.js"

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe("LuthienPlugin", () => {
  it("config hook injects baseURL for default allowlist when proxy healthy", async () => {
    vi.stubEnv("LUTHIEN_PROXY_URL", "http://localhost:9999")
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200 }))

    const hooks = await LuthienPlugin({} as any)
    const cfg: Record<string, any> = {}
    await (hooks as any).config(cfg)

    expect(cfg.provider.anthropic.options.baseURL).toBe("http://localhost:9999/anthropic")
    expect(cfg.provider.openai.options.baseURL).toBe("http://localhost:9999/openai")
    expect(cfg.provider.google.options.baseURL).toBe("http://localhost:9999/google")
  })

  it("config hook no-ops when health check returns non-200", async () => {
    vi.stubEnv("LUTHIEN_PROXY_URL", "http://localhost:9999")
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }))

    const hooks = await LuthienPlugin({} as any)
    const cfg: Record<string, any> = {}
    await (hooks as any).config(cfg)

    expect(cfg).toEqual({})
  })

  it("config hook no-ops when LUTHIEN_PROXY_URL not set", async () => {
    const hooks = await LuthienPlugin({} as any)
    const cfg: Record<string, any> = {}
    await (hooks as any).config(cfg)

    expect(cfg).toEqual({})
  })

  it("config hook respects user-provided allowlist", async () => {
    vi.stubEnv("LUTHIEN_PROXY_URL", "http://localhost:9999")
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200 }))

    const hooks = await LuthienPlugin({} as any, { providers: ["anthropic"] })
    const cfg: Record<string, any> = {}
    await (hooks as any).config(cfg)

    expect(cfg.provider.anthropic.options.baseURL).toBe("http://localhost:9999/anthropic")
    expect(cfg.provider.openai).toBeUndefined()
  })

  it("chat.headers injects all 5 headers when proxy healthy + provider in allowlist", async () => {
    vi.stubEnv("LUTHIEN_PROXY_URL", "http://localhost:9999")
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200 }))

    const hooks = await LuthienPlugin({} as any)
    const input = {
      sessionID: "sess-1",
      agent: "build",
      provider: { info: { id: "anthropic" } },
      model: { id: "claude-3-5-sonnet-20241022" },
    }
    const output = { headers: {} as Record<string, string> }
    await (hooks as any)["chat.headers"](input, output)

    expect(output.headers["x-luthien-session-id"]).toBe("sess-1")
    expect(output.headers["x-luthien-agent"]).toBe("build")
    expect(output.headers["x-luthien-provider"]).toBe("anthropic")
    expect(output.headers["x-luthien-model"]).toBe("claude-3-5-sonnet-20241022")
    expect(output.headers["x-luthien-plugin-version"]).toBe("0.1.0")
  })

  it("chat.headers skips injection for provider NOT in allowlist", async () => {
    vi.stubEnv("LUTHIEN_PROXY_URL", "http://localhost:9999")
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200 }))

    const hooks = await LuthienPlugin({} as any, { providers: ["anthropic"] })
    const input = {
      sessionID: "sess-2",
      agent: "build",
      provider: { info: { id: "openai" } },
      model: { id: "gpt-4o" },
    }
    const output = { headers: {} as Record<string, string> }
    await (hooks as any)["chat.headers"](input, output)

    expect(output.headers).toEqual({})
  })

  it("chat.headers skips when proxy unreachable", async () => {
    vi.stubEnv("LUTHIEN_PROXY_URL", "http://localhost:9999")
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")))

    const hooks = await LuthienPlugin({} as any)
    const input = {
      sessionID: "sess-3",
      agent: "build",
      provider: { info: { id: "anthropic" } },
      model: { id: "claude-3-5-sonnet-20241022" },
    }
    const output = { headers: {} as Record<string, string> }
    await (hooks as any)["chat.headers"](input, output)

    expect(output.headers).toEqual({})
  })

  it("plugin throws when LUTHIEN_REQUIRED=1 and health check fails", async () => {
    vi.stubEnv("LUTHIEN_PROXY_URL", "http://localhost:9999")
    vi.stubEnv("LUTHIEN_REQUIRED", "1")
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")))

    await expect(LuthienPlugin({} as any)).rejects.toThrow("LUTHIEN_REQUIRED=1")
  })

  it("invalid allowlist entries are filtered", async () => {
    vi.stubEnv("LUTHIEN_PROXY_URL", "http://localhost:9999")
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200 }))

    const hooks = await LuthienPlugin({} as any, {
      providers: ["anthropic", "", 42 as any, "openai"],
    })
    const cfg: Record<string, any> = {}
    await (hooks as any).config(cfg)

    expect(cfg.provider.anthropic.options.baseURL).toBe("http://localhost:9999/anthropic")
    expect(cfg.provider.openai.options.baseURL).toBe("http://localhost:9999/openai")
    expect(cfg.provider[""]).toBeUndefined()
  })
})
