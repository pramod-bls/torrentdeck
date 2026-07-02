import { createServer, type Server } from 'node:http'
import { afterEach, describe, expect, it } from 'vitest'
import { TransmissionClient, type RpcTarget } from './client'

let server: Server | undefined

function listen(handler: Parameters<typeof createServer>[1]): Promise<number> {
  return new Promise((resolve) => {
    server = createServer(handler)
    server.listen(0, '127.0.0.1', () => {
      const addr = server!.address()
      resolve(typeof addr === 'object' && addr ? addr.port : 0)
    })
  })
}

function target(port: number, extra?: Partial<RpcTarget>): RpcTarget {
  return {
    host: '127.0.0.1',
    port,
    useTls: false,
    allowSelfSignedCert: false,
    rpcPath: '/transmission/rpc',
    ...extra
  }
}

afterEach(() => {
  server?.close()
  server = undefined
})

describe('TransmissionClient', () => {
  it('performs the 409 session-id handshake and retries', async () => {
    let calls = 0
    const port = await listen((req, res) => {
      calls++
      if (!req.headers['x-transmission-session-id']) {
        res.writeHead(409, { 'X-Transmission-Session-Id': 'abc123' })
        res.end()
        return
      }
      expect(req.headers['x-transmission-session-id']).toBe('abc123')
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ result: 'success', arguments: { version: '4.0.6' } }))
    })

    const client = new TransmissionClient(target(port))
    const res = await client.call<{ version: string }>('session-get')
    expect(res).toEqual({ ok: true, data: { version: '4.0.6' } })
    expect(calls).toBe(2)

    // session id is cached: the next call succeeds in a single request
    const res2 = await client.call('session-get')
    expect(res2.ok).toBe(true)
    expect(calls).toBe(3)
  })

  it('reports auth failures distinctly', async () => {
    const port = await listen((_req, res) => {
      res.writeHead(401)
      res.end()
    })
    const res = await new TransmissionClient(target(port)).call('session-get')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.kind).toBe('auth')
  })

  it('sends basic auth credentials', async () => {
    const port = await listen((req, res) => {
      const expected = 'Basic ' + Buffer.from('user:pass').toString('base64')
      if (req.headers.authorization !== expected) {
        res.writeHead(401)
        res.end()
        return
      }
      res.writeHead(200)
      res.end(JSON.stringify({ result: 'success', arguments: {} }))
    })
    const res = await new TransmissionClient(
      target(port, { username: 'user', password: 'pass' })
    ).call('session-get')
    expect(res.ok).toBe(true)
  })

  it('surfaces daemon-level rpc errors', async () => {
    const port = await listen((_req, res) => {
      res.writeHead(200)
      res.end(JSON.stringify({ result: 'unrecognized method', arguments: {} }))
    })
    const res = await new TransmissionClient(target(port)).call('bogus-method')
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.kind).toBe('rpc')
      expect(res.error.message).toBe('unrecognized method')
    }
  })

  it('rejects malformed JSON bodies', async () => {
    const port = await listen((_req, res) => {
      res.writeHead(200)
      res.end('<html>not json</html>')
    })
    const res = await new TransmissionClient(target(port)).call('session-get')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.kind).toBe('http')
  })

  it('reports unreachable hosts as network errors', async () => {
    const res = await new TransmissionClient(target(1, { host: '127.0.0.1' })).call('session-get')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.kind).toBe('network')
  })
})
