# opencode-luthien

OpenCode plugin that routes AI traffic through the [Luthien](https://github.com/LuthienResearch/luthien-proxy) gateway for observability and control.

## Installation

```bash
npm install opencode-luthien
```

Add to your `opencode.json`:

```json
{
  "plugins": ["opencode-luthien"]
}
```

Set the gateway URL:

```bash
export LUTHIEN_PROXY_URL=https://your-luthien-gateway.example.com
```

## Configuration

| Environment Variable | Required | Default | Description |
|---|---|---|---|
| `LUTHIEN_PROXY_URL` | No | — | URL of your Luthien gateway. If unset, plugin is a no-op. |
| `LUTHIEN_REQUIRED` | No | `0` | Set to `1` to fail-fast if the gateway is unreachable at startup. |

### Plugin options

Pass options in `opencode.json`:

```json
{
  "plugins": [["opencode-luthien", { "providers": ["anthropic", "openai"] }]]
}
```

| Option | Type | Default | Description |
|---|---|---|---|
| `providers` | `string[]` | `["anthropic", "openai", "google"]` | Providers to route through Luthien. |

## Headers Injected

The plugin injects the following headers on every proxied request. See the full contract at [docs/plugin-header-contract.md](https://github.com/LuthienResearch/luthien-proxy/blob/main/docs/plugin-header-contract.md).

| Header | Value |
|---|---|
| `x-luthien-session-id` | OpenCode session ID |
| `x-luthien-agent` | OpenCode agent name |
| `x-luthien-provider` | AI provider ID |
| `x-luthien-model` | Model ID |
| `x-luthien-plugin-version` | Plugin version |

## Deployment Topology

**Per-developer mode**: Each developer runs their own Luthien gateway locally. Set `LUTHIEN_PROXY_URL=http://localhost:8000` in their shell profile. Session IDs (UUIDs provided by OpenCode) are unique per developer session.

**Shared-team mode**: A single Luthien gateway is deployed for the team (e.g., on Railway or Docker). All developers point `LUTHIEN_PROXY_URL` at the shared URL. Session IDs still uniquely identify each developer's session, enabling per-developer filtering in the Luthien dashboard.

Both modes use the same plugin configuration — only `LUTHIEN_PROXY_URL` differs.

## Troubleshooting

**"proxy unreachable" in stderr**
→ Check that `LUTHIEN_PROXY_URL` is set and the gateway is running: `curl $LUTHIEN_PROXY_URL/health`

**Want to fail-fast if gateway is down**
→ Set `LUTHIEN_REQUIRED=1`. The plugin will throw at startup if the gateway is unreachable.

**Traffic not appearing in Luthien dashboard**
→ Verify `LUTHIEN_PROXY_URL` points to the correct gateway. Check that the provider is in the `providers` allowlist.

## Compatibility

Tested with OpenCode v1.14.x.

## License

Apache 2.0 — see [LICENSE](LICENSE).
