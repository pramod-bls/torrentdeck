/**
 * Deluge Web UI (deluge-web) JSON-RPC transport, `POST {path}` with
 * `{ id, method, params }` and a `{ result, error }` envelope (Deluge 2.x).
 * Built on node:http/https for the same per-request TLS control as the
 * Transmission client.
 *
 * Two Deluge-specific wrinkles this class hides from the adapter:
 * - Auth is a single Web UI password exchanged for a `_session_id` cookie via
 *   `auth.login`; the cookie is captured and replayed, and a "not authenticated"
 *   error triggers one transparent re-login.
 * - deluge-web is a THIN CLIENT that must be bound to a backing `deluged` host
 *   before any `core.*` call works. On first use we `auth.login`, check
 *   `web.connected`, and if unbound auto-connect to the sole/default host
 *   (erroring clearly only when several hosts exist and none is bound).
 */
import http from 'node:http'
import https from 'node:https'
import type { RpcError, RpcResult } from '@shared/types'

export interface DelugeTarget {
  host: string
  port: number
  useTls: boolean
  allowSelfSignedCert: boolean
  rpcPath: string
  password?: string
}

const REQUEST_TIMEOUT_MS = 15_000

interface HttpResponse {
  status: number
  headers: Record<string, string | string[] | undefined>
  body: string
}

type DelugeHost = [id: string, host: string, port: number, status: string]

function toRpcError(err: unknown): RpcError {
  const e = err as NodeJS.ErrnoException
  const message = e?.message ?? String(err)
  if (e?.code === 'ETIMEDOUT') return { kind: 'timeout', message: 'The server did not respond in time' }
  if (
    e?.code &&
    ['DEPTH_ZERO_SELF_SIGNED_CERT', 'SELF_SIGNED_CERT_IN_CHAIN', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'CERT_HAS_EXPIRED', 'ERR_TLS_CERT_ALTNAME_INVALID'].includes(e.code)
  ) {
    return { kind: 'tls', message: `Certificate rejected (${e.code}). Enable "allow self-signed certificate" for this server if you trust it.` }
  }
  return { kind: 'network', message }
}

export class DelugeClient {
  private cookie: string | null = null
  /** Memoized login+bind; reset to null to force a fresh handshake. */
  private ready: Promise<RpcResult<void>> | null = null
  private reqId = 0

  constructor(private readonly target: DelugeTarget) {}

  private postRaw(payload: string): Promise<HttpResponse> {
    return new Promise((resolve, reject) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Content-Length': Buffer.byteLength(payload).toString()
      }
      if (this.cookie) headers['Cookie'] = this.cookie
      const options: https.RequestOptions = {
        host: this.target.host,
        port: this.target.port,
        path: this.target.rpcPath || '/json',
        method: 'POST',
        headers,
        timeout: REQUEST_TIMEOUT_MS
      }
      if (this.target.useTls && this.target.allowSelfSignedCert) options.rejectUnauthorized = false
      const req = (this.target.useTls ? https : http).request(options, (res) => {
        // Capture the session cookie the Web UI hands back on auth.login.
        const setCookie = res.headers['set-cookie']
        if (setCookie) {
          const sid = (Array.isArray(setCookie) ? setCookie : [setCookie])
            .map((c) => c.split(';')[0])
            .find((c) => c.startsWith('_session_id='))
          if (sid) this.cookie = sid
        }
        const chunks: Buffer[] = []
        res.on('data', (c: Buffer) => chunks.push(c))
        res.on('end', () =>
          resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') })
        )
        res.on('error', reject)
      })
      req.on('timeout', () => req.destroy(Object.assign(new Error('Request timed out'), { code: 'ETIMEDOUT' })))
      req.on('error', reject)
      req.write(payload)
      req.end()
    })
  }

  /** One JSON-RPC round trip with no session handling (used during connect). */
  private async raw<T>(method: string, params: unknown[]): Promise<RpcResult<T>> {
    let res: HttpResponse
    try {
      res = await this.postRaw(JSON.stringify({ id: ++this.reqId, method, params }))
    } catch (err) {
      return { ok: false, error: toRpcError(err) }
    }
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: { kind: 'auth', message: 'Authentication failed. Check the Web UI password.', status: res.status } }
    }
    if (res.status !== 200) {
      return { ok: false, error: { kind: 'http', message: `Server responded with HTTP ${res.status}`, status: res.status } }
    }
    let parsed: { result?: T; error?: { message: string; code?: number } | null }
    try {
      parsed = JSON.parse(res.body)
    } catch {
      return { ok: false, error: { kind: 'http', message: 'Server response was not valid JSON — is this a Deluge Web UI (/json) endpoint?' } }
    }
    if (parsed.error) {
      // code 1 = not authenticated (session expired / never logged in)
      const kind = parsed.error.code === 1 ? 'auth' : 'rpc'
      return { ok: false, error: { kind, message: parsed.error.message } }
    }
    return { ok: true, data: (parsed.result ?? null) as T }
  }

  private async connect(): Promise<RpcResult<void>> {
    const login = await this.raw<boolean>('auth.login', [this.target.password ?? ''])
    if (!login.ok) return login
    if (login.data !== true) {
      return { ok: false, error: { kind: 'auth', message: 'Deluge rejected the Web UI password.' } }
    }
    const connected = await this.raw<boolean>('web.connected', [])
    if (!connected.ok) return connected
    if (connected.data === true) return { ok: true, data: undefined }

    // Unbound Web UI: auto-connect to the sole/default deluged host.
    const hosts = await this.raw<DelugeHost[]>('web.get_hosts', [])
    if (!hosts.ok) return hosts
    const list = hosts.data ?? []
    if (list.length === 0) {
      return { ok: false, error: { kind: 'rpc', message: 'The Deluge Web UI has no configured daemon host to connect to.' } }
    }
    const bound = list.find((h) => h[3] === 'Connected')
    const chosen = bound ?? (list.length === 1 ? list[0] : undefined)
    if (!chosen) {
      const names = list.map((h) => `${h[1]}:${h[2]}`).join(', ')
      return { ok: false, error: { kind: 'rpc', message: `The Deluge Web UI knows multiple daemons and none is connected (${names}). Connect one in the Deluge Web UI first.` } }
    }
    const conn = await this.raw<unknown>('web.connect', [chosen[0]])
    if (!conn.ok) return conn
    return { ok: true, data: undefined }
  }

  private ensureReady(): Promise<RpcResult<void>> {
    if (!this.ready) this.ready = this.connect()
    return this.ready
  }

  /** Logged-in, host-bound JSON-RPC call with one transparent re-auth retry. */
  async rpc<T = unknown>(method: string, params: unknown[] = []): Promise<RpcResult<T>> {
    const ready = await this.ensureReady()
    if (!ready.ok) {
      this.ready = null // don't cache a failed handshake
      return ready
    }
    let res = await this.raw<T>(method, params)
    if (!res.ok && res.error.kind === 'auth') {
      // Session likely expired — re-handshake once and retry.
      this.cookie = null
      this.ready = this.connect()
      const reconnected = await this.ready
      if (!reconnected.ok) {
        this.ready = null
        return reconnected
      }
      res = await this.raw<T>(method, params)
    }
    return res
  }
}
