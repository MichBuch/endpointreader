import React, { createContext, useContext, useState, useCallback } from 'react'

const STORAGE_KEY = 'ep_mgr_v1'

const SEED_ENDPOINTS = [
  {
    id: 'seed-1',
    name: 'JSONPlaceholder – Posts',
    method: 'GET',
    url: 'https://jsonplaceholder.typicode.com/posts',
    headers: '',
    body: ''
  },
  {
    id: 'seed-2',
    name: 'JSONPlaceholder – Users',
    method: 'GET',
    url: 'https://jsonplaceholder.typicode.com/users',
    headers: '',
    body: ''
  },
  {
    id: 'seed-3',
    name: 'JSONPlaceholder – Todos',
    method: 'GET',
    url: 'https://jsonplaceholder.typicode.com/todos',
    headers: '',
    body: ''
  },
  {
    id: 'seed-4',
    name: 'Open Library – Search',
    method: 'GET',
    url: 'https://openlibrary.org/search.json?q=javascript&limit=20',
    headers: '',
    body: ''
  },
  {
    id: 'seed-5',
    name: 'REST Countries – All',
    method: 'GET',
    url: 'https://restcountries.com/v3.1/all?fields=name,capital,population,region,flags',
    headers: '',
    body: ''
  },
  {
    id: 'seed-6',
    name: 'Cat Facts',
    method: 'GET',
    url: 'https://catfact.ninja/facts?limit=20',
    headers: '',
    body: ''
  },
  {
    id: 'seed-7',
    name: 'Public APIs List',
    method: 'GET',
    url: 'https://api.publicapis.org/entries',
    headers: '',
    body: ''
  },
]

function loadEndpoints() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (stored && stored.length > 0) return stored
    // First run — seed with demo endpoints
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_ENDPOINTS))
    return SEED_ENDPOINTS
  } catch { return SEED_ENDPOINTS }
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

const EndpointContext = createContext(null)

// Check if the local Electron proxy is running
async function isProxyAvailable() {
  try {
    const res = await fetch('http://127.0.0.1:57321/health', { signal: AbortSignal.timeout(500) })
    return res.ok
  } catch { return false }
}

// Inject auth headers for direct (non-proxy) web mode
function injectAuthHeaders(headers, auth) {
  if (!auth || auth.type === 'none') return
  switch (auth.type) {
    case 'bearer':
      if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`
      break
    case 'apikey':
      if (auth.apiKeyHeader && auth.apiKeyValue) headers[auth.apiKeyHeader] = auth.apiKeyValue
      break
    case 'basic': {
      const creds = btoa(`${auth.username || ''}:${auth.password || ''}`)
      headers['Authorization'] = `Basic ${creds}`
      break
    }
    case 'custom':
      if (auth.customHeaders && typeof auth.customHeaders === 'object')
        Object.assign(headers, auth.customHeaders)
      break
  }
}

export function EndpointProvider({ children }) {
  const [endpoints, setEndpoints] = useState(loadEndpoints)
  const [activeId, setActiveId] = useState(null)
  const [result, setResult] = useState(null)   // { data, label, status }
  const [loading, setLoading] = useState(false)

  const persist = useCallback((list) => {
    setEndpoints(list)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  }, [])

  const addEndpoint = useCallback(() => {
    const ep = { id: uid(), name: 'New Endpoint', method: 'GET', url: '', headers: '', body: '' }
    const next = [...endpoints, ep]
    persist(next)
    setActiveId(ep.id)
    setResult(null)
    return ep.id
  }, [endpoints, persist])

  const updateEndpoint = useCallback((id, patch) => {
    persist(endpoints.map(e => e.id === id ? { ...e, ...patch } : e))
  }, [endpoints, persist])

  const deleteEndpoint = useCallback((id) => {
    persist(endpoints.filter(e => e.id !== id))
    setActiveId(null)
    setResult(null)
  }, [endpoints, persist])

  const callEndpoint = useCallback(async (ep) => {
    setLoading(true)
    setResult(null)

    let headers = {}
    if (ep.headers?.trim()) {
      try { Object.assign(headers, JSON.parse(ep.headers)) }
      catch { setLoading(false); return { error: 'Invalid headers JSON' } }
    }

    let body = null
    if (['POST','PUT','PATCH'].includes(ep.method) && ep.body?.trim()) {
      try { body = JSON.stringify(JSON.parse(ep.body)) }
      catch { setLoading(false); return { error: 'Invalid body JSON' } }
    }

    // Route through local Electron proxy when available (handles certs, CORS, auth injection)
    // Falls back to direct fetch for plain web usage
    const useProxy = await isProxyAvailable()

    try {
      let status, statusText, ok, text

      if (useProxy) {
        const proxyRes = await fetch('http://127.0.0.1:57321/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: ep.url, method: ep.method, headers, body, auth: ep.auth || null })
        })
        const envelope = await proxyRes.json()
        if (envelope.error) throw new Error(envelope.error)
        status = envelope.status
        statusText = envelope.statusText
        ok = envelope.ok
        text = envelope.body
      } else {
        // Direct fetch — web mode, no cert support
        const directHeaders = { ...headers }
        if (!directHeaders['Content-Type'] && body) directHeaders['Content-Type'] = 'application/json'
        injectAuthHeaders(directHeaders, ep.auth)
        const res = await fetch(ep.url, { method: ep.method, headers: directHeaders, body })
        status = res.status
        statusText = res.statusText
        ok = res.ok
        text = await res.text()
      }

      let data
      try { data = JSON.parse(text) } catch { data = text }
      setResult({ data, label: `${ep.method} ${ep.url}`, status, statusText, ok })
    } catch (err) {
      setResult({ data: { error: err.message }, label: ep.url, status: 0, statusText: 'Network Error', ok: false })
    } finally {
      setLoading(false)
    }
  }, [])

  const active = endpoints.find(e => e.id === activeId) || null

  return (
    <EndpointContext.Provider value={{
      endpoints, active, activeId, setActiveId, result, loading,
      addEndpoint, updateEndpoint, deleteEndpoint, callEndpoint, setResult
    }}>
      {children}
    </EndpointContext.Provider>
  )
}

export const useEndpoints = () => useContext(EndpointContext)
