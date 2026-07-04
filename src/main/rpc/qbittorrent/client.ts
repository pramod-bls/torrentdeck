/**
 * qBittorrent WebUI API v2 transport (qBittorrent 4.1+). HTTP with a session
 * cookie, built on node:http/https for the same per-request TLS control as the
 * other clients.
 *
 * qBittorrent specifics this class hides from the adapter:
 * - Auth: `POST /api/v2/auth/login` (form username/password) → an `SID` cookie,
 *   which is captured and replayed; a 403 triggers one transparent re-login.
 * - CSRF: qBittorrent rejects API calls whose `Referer`/`Origin` don't match
 *   its host, so every request carries `Referer`/`Origin` set to the base URL.
 * - Verbs: reads are GET (JSON), actions are POST form-urlencoded, and adding a
 *   torrent is multipart/form-data.
 */
import http from 'node:http'
import https from 'node:https'
import type { RpcError, RpcResult } from '@shared/types'

export interface QbitTarget {
  host: string
  port: number
  useTls: boolean
  allowSelfSignedCert: boolean
  username?: string
  password?: string
}

const REQUEST_TIMEOUT_MS = 15_000
const API = '/api/v2'

interface HttpResponse {
  status: number
  headers: Record<string, string | string[] | undefined>
  body: string
}

interface SendOptions {
  method: 'GET' | 'POST'
  path: string // full path incl. /api/v2
  query?: Record<string, string>
  contentType?: string
  body?: string | Buffer
}

/** A multipart file part for torrent uploads. */
export interface MultipartFile {
  field: string
  filename: string
  content: Buffer
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

export function formEncode(params: Record<string, string | number | boolean | undefined>): string {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&')
}

export class QbittorrentClient {
  private cookie: string | null = null
  private ready: Promise<RpcResult<void>> | null = null

  constructor(private readonly target: QbitTarget) {}

  private get base(): string {
    return `${this.target.useTls ? 'https' : 'http'}://${this.target.host}:${this.target.port}`
  }

  private send(opts: SendOptions): Promise<HttpResponse> {
    return new Promise((resolve, reject) => {
      const query = opts.query ? '?' + formEncode(opts.query) : ''
      const headers: Record<string, string> = {
        // qBittorrent's CSRF guard requires Referer/Origin to match the host.
        Referer: this.base,
        Origin: this.base,
        Accept: 'application/json'
      }
      if (this.cookie) headers['Cookie'] = this.cookie
      if (opts.body !== undefined) {
        headers['Content-Type'] = opts.contentType ?? 'application/x-www-form-urlencoded'
        headers['Content-Length'] = Buffer.byteLength(opts.body).toString()
      }
      const options: https.RequestOptions = {
        host: this.target.host,
        port: this.target.port,
        path: opts.path + query,
        method: opts.method,
        headers,
        timeout: REQUEST_TIMEOUT_MS
      }
      if (this.target.useTls && this.target.allowSelfSignedCert) options.rejectUnauthorized = false
      const req = (this.target.useTls ? https : http).request(options, (res) => {
        const setCookie = res.headers['set-cookie']
        if (setCookie) {
          // qBittorrent names the session cookie `SID` (4.x) or `QBT_SID_<port>` (5.x).
          const sid = (Array.isArray(setCookie) ? setCookie : [setCookie])
            .map((c) => c.split(';')[0])
            .find((c) => c.split('=')[0].toUpperCase().includes('SID'))
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
      if (opts.body !== undefined) req.write(opts.body)
      req.end()
    })
  }

  private async connect(): Promise<RpcResult<void>> {
    let res: HttpResponse
    try {
      res = await this.send({
        method: 'POST',
        path: `${API}/auth/login`,
        body: formEncode({ username: this.target.username ?? '', password: this.target.password ?? '' })
      })
    } catch (err) {
      return { ok: false, error: toRpcError(err) }
    }
    if (res.status === 403) {
      return { ok: false, error: { kind: 'auth', message: 'qBittorrent refused the login (IP banned after failed attempts?).', status: 403 } }
    }
    // Bad credentials → 200 with body "Fails."; success → 200 "Ok." (4.x) or
    // 204 empty (5.x), always with a session cookie set.
    if (res.body.trim() === 'Fails.') {
      return { ok: false, error: { kind: 'auth', message: 'qBittorrent rejected the username or password.' } }
    }
    if (res.status < 200 || res.status >= 300 || !this.cookie) {
      return { ok: false, error: { kind: 'auth', message: 'qBittorrent login failed (no session cookie).', status: res.status } }
    }
    return { ok: true, data: undefined }
  }

  private ensureReady(): Promise<RpcResult<void>> {
    if (!this.ready) this.ready = this.connect()
    return this.ready
  }

  /** Core request with login + one transparent re-auth on 403. Returns the raw
   * text body on success (callers parse JSON as needed). */
  private async call(opts: SendOptions): Promise<RpcResult<string>> {
    const ready = await this.ensureReady()
    if (!ready.ok) {
      this.ready = null
      return ready
    }
    const once = async (): Promise<HttpResponse | RpcError> => {
      try {
        return await this.send(opts)
      } catch (err) {
        return toRpcError(err)
      }
    }
    let res = await once()
    if ('kind' in res) {
      if (res.kind === 'timeout' || res.kind === 'network') this.ready = null
      return { ok: false, error: res }
    }
    if (res.status === 403) {
      // Session likely expired — re-login once and retry.
      this.cookie = null
      this.ready = this.connect()
      const re = await this.ready
      if (!re.ok) {
        this.ready = null
        return re
      }
      const retry = await once()
      if ('kind' in retry) return { ok: false, error: retry }
      res = retry
    }
    if (res.status === 403 || res.status === 401) {
      return { ok: false, error: { kind: 'auth', message: 'Not authorized', status: res.status } }
    }
    if (res.status === 404) {
      return { ok: false, error: { kind: 'rpc', message: 'qBittorrent API method not found (unsupported version?)', status: 404 } }
    }
    if (res.status < 200 || res.status >= 300) {
      return { ok: false, error: { kind: 'http', message: `Server responded with HTTP ${res.status}`, status: res.status } }
    }
    return { ok: true, data: res.body }
  }

  /** GET a JSON endpoint. */
  async get<T = unknown>(apiPath: string, query?: Record<string, string>): Promise<RpcResult<T>> {
    const res = await this.call({ method: 'GET', path: API + apiPath, query })
    if (!res.ok) return res
    try {
      return { ok: true, data: res.data ? (JSON.parse(res.data) as T) : (undefined as T) }
    } catch {
      return { ok: false, error: { kind: 'http', message: 'qBittorrent returned invalid JSON' } }
    }
  }

  /** GET returning the raw text body (e.g. app/version, pieceStates numbers). */
  getText(apiPath: string, query?: Record<string, string>): Promise<RpcResult<string>> {
    return this.call({ method: 'GET', path: API + apiPath, query })
  }

  /** POST a form-urlencoded action. Resolves to the text body ("Ok." etc.). */
  post(apiPath: string, params: Record<string, string | number | boolean | undefined> = {}): Promise<RpcResult<string>> {
    return this.call({ method: 'POST', path: API + apiPath, body: formEncode(params) })
  }

  /** POST multipart/form-data (torrent add): text fields + optional file parts. */
  postMultipart(
    apiPath: string,
    fields: Record<string, string | undefined>,
    files: MultipartFile[] = []
  ): Promise<RpcResult<string>> {
    const boundary = '----torrentdeck' + Math.abs(Buffer.from(apiPath).reduce((a, c) => a + c, 7)).toString(16) + 'z'
    const parts: Buffer[] = []
    for (const [name, value] of Object.entries(fields)) {
      if (value === undefined) continue
      parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`))
    }
    for (const f of files) {
      parts.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="${f.field}"; filename="${f.filename}"\r\nContent-Type: application/x-bittorrent\r\n\r\n`
        )
      )
      parts.push(f.content)
      parts.push(Buffer.from('\r\n'))
    }
    parts.push(Buffer.from(`--${boundary}--\r\n`))
    return this.call({
      method: 'POST',
      path: API + apiPath,
      contentType: `multipart/form-data; boundary=${boundary}`,
      body: Buffer.concat(parts)
    })
  }
}
