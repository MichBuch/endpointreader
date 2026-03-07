/**
 * Local proxy server — runs inside Electron's Node process.
 * The renderer POSTs a request descriptor to /proxy and this
 * module executes the real HTTP call with full Node capabilities:
 *   - Custom CA certificates (corporate PKI)
 *   - Client certificates (mTLS)
 *   - Bearer / API-key / Basic auth injection
 *   - No CORS restrictions
 */

const express = require('express')
const https   = require('https')
const fs      = require('fs')

const PREFERRED_PORT = 57321

// Find next free port starting from preferred
function findFreePort(start) {
  return new Promise((resolve, reject) => {
    const net = require('net')
    const server = net.createServer()
    server.unref()
    server.on('error', () => findFreePort(start + 1).then(resolve, reject))
    server.listen(start, '127.0.0.1', () => {
      const { port } = server.address()
      server.close(() => resolve(port))
    })
  })
}

function buildAgent(auth) {
  if (!auth) return undefined

  const opts = { rejectUnauthorized: true }

  // Custom CA bundle (corporate root cert)
  if (auth.caCert) {
    try { opts.ca = fs.readFileSync(auth.caCert) }
    catch (e) { console.warn('[proxy] caCert read error:', e.message) }
  }

  // Client certificate (mTLS)
  if (auth.clientCert && auth.clientKey) {
    try {
      opts.cert = fs.readFileSync(auth.clientCert)
      opts.key  = fs.readFileSync(auth.clientKey)
      if (auth.clientKeyPassphrase) opts.passphrase = auth.clientKeyPassphrase
    } catch (e) { console.warn('[proxy] clientCert read error:', e.message) }
  }

  // Allow self-signed in dev mode
  if (auth.allowSelfSigned) opts.rejectUnauthorized = false

  return new https.Agent(opts)
}

function buildHeaders(baseHeaders, auth) {
  const headers = { ...baseHeaders }

  if (!auth) return headers

  switch (auth.type) {
    case 'bearer':
      if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`
      break
    case 'apikey':
      if (auth.apiKeyHeader && auth.apiKeyValue)
        headers[auth.apiKeyHeader] = auth.apiKeyValue
      break
    case 'basic': {
      const creds = Buffer.from(`${auth.username || ''}:${auth.password || ''}`).toString('base64')
      headers['Authorization'] = `Basic ${creds}`
      break
    }
    case 'custom':
      // auth.customHeaders is an object of extra headers
      if (auth.customHeaders) Object.assign(headers, auth.customHeaders)
      break
    default:
      break
  }

  return headers
}

function startProxy() {
  const app = express()
  app.use(express.json({ limit: '10mb' }))

  // CORS — only allow requests from our own renderer (localhost)
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    if (req.method === 'OPTIONS') return res.sendStatus(204)
    next()
  })

  /**
   * POST /proxy
   * Body: {
   *   url:     string,
   *   method:  string,
   *   headers: object,
   *   body:    string | null,
   *   auth:    AuthConfig | null
   * }
   */
  app.post('/proxy', async (req, res) => {
    const { url, method, headers: rawHeaders = {}, body, auth } = req.body

    if (!url) return res.status(400).json({ error: 'url is required' })

    const headers  = buildHeaders(rawHeaders, auth)
    const agent    = url.startsWith('https') ? buildAgent(auth) : undefined

    const fetchOpts = { method, headers, agent }
    if (body) fetchOpts.body = body

    try {
      // Use Node's built-in fetch (Node 18+) or fall back to http/https
      const nodeFetch = require('node-fetch')
      const upstream  = await nodeFetch(url, fetchOpts)
      const text      = await upstream.text()

      res.status(200).json({
        status:     upstream.status,
        statusText: upstream.statusText,
        ok:         upstream.ok,
        headers:    Object.fromEntries(upstream.headers.entries()),
        body:       text
      })
    } catch (err) {
      res.status(502).json({ error: err.message })
    }
  })

  // Health check
  app.get('/health', (_, res) => res.json({ ok: true }))

  const server = app.listen(PROXY_PORT, '127.0.0.1', () => {
    console.log(`[proxy] listening on http://127.0.0.1:${PROXY_PORT}`)
  })

  return server
}

module.exports = { startProxy, PROXY_PORT }
