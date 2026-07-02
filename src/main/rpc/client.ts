/**
 * Transmission RPC over HTTP, built on node:http/https rather than fetch so
 * TLS trust (`rejectUnauthorized`) can be decided per request — global fetch
 * offers no per-call escape hatch for a user's self-signed NAS certificate.
 *
 * Protocol notes (Transmission 4.x, rpc-version >= 17):
 * - Every request is `POST {rpcPath}` with `{ method, arguments }` JSON.
 * - The daemon issues a CSRF token via the `X-Transmission-Session-Id`
 *   header and answers 409 when it's missing/rotated; the client retries
 *   once with the fresh token and caches it for subsequent calls.
 * - A 200 response can still be a failure: `result` carries the error text
 *   and only the literal "success" means success.
 */
import http from 'node:http'
import https from 'node:https'
import type { RpcError, RpcResult } from '@shared/types'

export interface RpcTarget {
  host: string
  port: number
  useTls: boolean
  allowSelfSignedCert: boolean
  rpcPath: string
  username?: string
  password?: string
}

const REQUEST_TIMEOUT_MS = 15_000

interface HttpResponse {
  status: number
  headers: Record<string, string | string[] | undefined>
  body: string
}

function postJson(target: RpcTarget, sessionId: string | null, payload: string): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload).toString()
    }
    if (sessionId) headers['X-Transmission-Session-Id'] = sessionId
    if (target.username) {
      headers['Authorization'] =
        'Basic ' + Buffer.from(`${target.username}:${target.password ?? ''}`).toString('base64')
    }
    const options: https.RequestOptions = {
      host: target.host,
      port: target.port,
      path: target.rpcPath,
      method: 'POST',
      headers,
      timeout: REQUEST_TIMEOUT_MS
    }
    if (target.useTls && target.allowSelfSignedCert) {
      options.rejectUnauthorized = false
    }
    const req = (target.useTls ? https : http).request(options, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (c: Buffer) => chunks.push(c))
      res.on('end', () =>
        resolve({
          status: res.statusCode ?? 0,
          headers: res.headers,
          body: Buffer.concat(chunks).toString('utf8')
        })
      )
      res.on('error', reject)
    })
    req.on('timeout', () => {
      req.destroy(Object.assign(new Error('Request timed out'), { code: 'ETIMEDOUT' }))
    })
    req.on('error', reject)
    req.write(payload)
    req.end()
  })
}

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

/**
 * One client per Server Profile. Caches the CSRF session id across calls and
 * transparently redoes the 409 handshake when the daemon rotates it.
 */
export class TransmissionClient {
  private sessionId: string | null = null

  constructor(private readonly target: RpcTarget) {}

  async call<T = unknown>(method: string, args?: Record<string, unknown>): Promise<RpcResult<T>> {
    const payload = JSON.stringify({ method, arguments: args ?? {} })
    let res: HttpResponse
    try {
      res = await postJson(this.target, this.sessionId, payload)
      if (res.status === 409) {
        const fresh = res.headers['x-transmission-session-id']
        this.sessionId = Array.isArray(fresh) ? fresh[0] : (fresh ?? null)
        if (!this.sessionId) {
          return { ok: false, error: { kind: 'http', message: 'Server sent 409 without a session id', status: 409 } }
        }
        res = await postJson(this.target, this.sessionId, payload)
      }
    } catch (err) {
      return { ok: false, error: toRpcError(err) }
    }

    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: { kind: 'auth', message: 'Authentication failed. Check the username and password.', status: res.status } }
    }
    if (res.status !== 200) {
      return { ok: false, error: { kind: 'http', message: `Server responded with HTTP ${res.status}`, status: res.status } }
    }

    let parsed: { result?: string; arguments?: T }
    try {
      parsed = JSON.parse(res.body)
    } catch {
      return { ok: false, error: { kind: 'http', message: 'Server response was not valid JSON — is this a Transmission RPC endpoint?' } }
    }
    if (parsed.result !== 'success') {
      return { ok: false, error: { kind: 'rpc', message: parsed.result ?? 'Unknown RPC error' } }
    }
    return { ok: true, data: (parsed.arguments ?? {}) as T }
  }
}
