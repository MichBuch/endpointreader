/**
 * OrgContext — manages organisations and their encrypted persistence.
 *
 * Data shape stored (encrypted on disk via Electron IPC):
 * {
 *   activeOrgId: string | null,
 *   orgs: [{
 *     id, name, colour,
 *     auth: { type, token, apiKeyHeader, apiKeyValue, username, password,
 *             customHeaders, caCert, clientCert, clientKey,
 *             clientKeyPassphrase, allowSelfSigned },
 *     endpoints: [{ id, name, method, url, headers, body }]
 *   }]
 * }
 *
 * In web mode (no Electron) falls back to sessionStorage — data is NOT
 * persisted across sessions, which is intentional for security in a browser.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

const OrgContext = createContext(null)

const SEED_STORE = {
  activeOrgId: 'org-demo',
  orgs: [
    {
      id: 'org-demo',
      name: 'Demo & Public APIs',
      colour: 'cyan',
      auth: { type: 'none' },
      endpoints: [
        { id: 'ep-1', name: 'JSONPlaceholder – Posts',    method: 'GET',  url: 'https://jsonplaceholder.typicode.com/posts',                              headers: '', body: '' },
        { id: 'ep-2', name: 'JSONPlaceholder – Users',    method: 'GET',  url: 'https://jsonplaceholder.typicode.com/users',                              headers: '', body: '' },
        { id: 'ep-3', name: 'JSONPlaceholder – Todos',    method: 'GET',  url: 'https://jsonplaceholder.typicode.com/todos',                              headers: '', body: '' },
        { id: 'ep-4', name: 'JSONPlaceholder – Create Post', method: 'POST', url: 'https://jsonplaceholder.typicode.com/posts',                           headers: '{"Content-Type":"application/json"}', body: '{\n  "title": "Hello World",\n  "body": "Test post body",\n  "userId": 1\n}' },
        { id: 'ep-5', name: 'REST Countries – All',       method: 'GET',  url: 'https://restcountries.com/v3.1/all?fields=name,capital,population,region', headers: '', body: '' },
        { id: 'ep-6', name: 'Open Library – Search JS',   method: 'GET',  url: 'https://openlibrary.org/search.json?q=javascript&limit=20',               headers: '', body: '' },
        { id: 'ep-7', name: 'Cat Facts',                  method: 'GET',  url: 'https://catfact.ninja/facts?limit=20',                                    headers: '', body: '' },
        { id: 'ep-8', name: 'Public APIs List',           method: 'GET',  url: 'https://api.publicapis.org/entries',                                      headers: '', body: '' },
      ]
    },
    {
      id: 'org-github',
      name: 'GitHub',
      colour: 'violet',
      auth: { type: 'bearer', token: '' },
      endpoints: [
        { id: 'gh-1', name: 'My Repos',         method: 'GET', url: 'https://api.github.com/user/repos?per_page=50&sort=updated', headers: '{"Accept":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"}', body: '' },
        { id: 'gh-2', name: 'My Profile',        method: 'GET', url: 'https://api.github.com/user',                               headers: '{"Accept":"application/vnd.github+json"}', body: '' },
        { id: 'gh-3', name: 'Search Repos',      method: 'GET', url: 'https://api.github.com/search/repositories?q=react&sort=stars&per_page=20', headers: '{"Accept":"application/vnd.github+json"}', body: '' },
      ]
    },
    {
      id: 'org-vercel',
      name: 'Vercel',
      colour: 'sky',
      auth: { type: 'bearer', token: '' },
      endpoints: [
        { id: 'vc-1', name: 'List Projects',     method: 'GET', url: 'https://api.vercel.com/v9/projects',      headers: '', body: '' },
        { id: 'vc-2', name: 'List Deployments',  method: 'GET', url: 'https://api.vercel.com/v6/deployments',   headers: '', body: '' },
        { id: 'vc-3', name: 'List Domains',      method: 'GET', url: 'https://api.vercel.com/v5/domains',       headers: '', body: '' },
      ]
    },
    {
      id: 'org-google',
      name: 'Google',
      colour: 'amber',
      auth: { type: 'bearer', token: '' },
      endpoints: [
        { id: 'gg-1', name: 'User Info',         method: 'GET', url: 'https://www.googleapis.com/oauth2/v3/userinfo',                    headers: '', body: '' },
        { id: 'gg-2', name: 'Drive – List Files', method: 'GET', url: 'https://www.googleapis.com/drive/v3/files?pageSize=20',           headers: '', body: '' },
        { id: 'gg-3', name: 'Gmail – Messages',  method: 'GET', url: 'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20', headers: '', body: '' },
      ]
    },
    {
      id: 'org-work',
      name: 'Work / Corporate',
      colour: 'emerald',
      auth: { type: 'bearer', token: '' },
      endpoints: []
    },
  ]
}

const IS_ELECTRON = !!window.electronAPI?.loadStore

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2) }

const DEFAULT_AUTH = { type: 'none' }

// ── Persistence helpers ───────────────────────────────────────────────────────
async function persistLoad() {
  if (IS_ELECTRON) {
    const data = await window.electronAPI.loadStore()
    if (data?.orgs?.length) return data
    return SEED_STORE
  }
  try {
    const stored = JSON.parse(sessionStorage.getItem('ep_orgs'))
    if (stored?.orgs?.length) return stored
    return SEED_STORE
  } catch { return SEED_STORE }
}

async function persistSave(data) {
  if (IS_ELECTRON) return window.electronAPI.saveStore(data)
  sessionStorage.setItem('ep_orgs', JSON.stringify(data))
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function OrgProvider({ children }) {
  const [orgs, setOrgs]           = useState([])
  const [activeOrgId, setActiveOrgId] = useState(null)
  const [activeEpId, setActiveEpId]   = useState(null)
  const [result, setResult]           = useState(null)
  const [loading, setLoading]         = useState(false)
  const [ready, setReady]             = useState(false)

  // Load on mount
  useEffect(() => {
    persistLoad().then(data => {
      setOrgs(data.orgs || [])
      setActiveOrgId(data.activeOrgId || null)
      setReady(true)
    })
  }, [])

  // Save whenever orgs or activeOrgId changes (after initial load)
  useEffect(() => {
    if (!ready) return
    persistSave({ orgs, activeOrgId })
  }, [orgs, activeOrgId, ready])

  // ── Derived ────────────────────────────────────────────────────────────────
  const activeOrg = orgs.find(o => o.id === activeOrgId) || null
  const endpoints = activeOrg?.endpoints || []
  const activeEp  = endpoints.find(e => e.id === activeEpId) || null

  // ── Org CRUD ───────────────────────────────────────────────────────────────
  const addOrg = useCallback(() => {
    const org = { id: uid(), name: 'New Organisation', colour: 'cyan', auth: DEFAULT_AUTH, endpoints: [] }
    setOrgs(prev => [...prev, org])
    setActiveOrgId(org.id)
    setActiveEpId(null)
    setResult(null)
    return org.id
  }, [])

  const updateOrg = useCallback((id, patch) => {
    setOrgs(prev => prev.map(o => o.id === id ? { ...o, ...patch } : o))
  }, [])

  const deleteOrg = useCallback((id) => {
    setOrgs(prev => prev.filter(o => o.id !== id))
    setActiveOrgId(prev => prev === id ? null : prev)
    setActiveEpId(null)
    setResult(null)
  }, [])

  const switchOrg = useCallback((id) => {
    setActiveOrgId(id)
    setActiveEpId(null)
    setResult(null)
  }, [])

  // ── Endpoint CRUD (scoped to active org) ───────────────────────────────────
  const addEndpoint = useCallback(() => {
    if (!activeOrgId) return
    const ep = { id: uid(), name: 'New Endpoint', method: 'GET', url: '', headers: '', body: '' }
    setOrgs(prev => prev.map(o =>
      o.id === activeOrgId ? { ...o, endpoints: [...o.endpoints, ep] } : o
    ))
    setActiveEpId(ep.id)
    setResult(null)
  }, [activeOrgId])

  const updateEndpoint = useCallback((id, patch) => {
    setOrgs(prev => prev.map(o =>
      o.id === activeOrgId
        ? { ...o, endpoints: o.endpoints.map(e => e.id === id ? { ...e, ...patch } : e) }
        : o
    ))
  }, [activeOrgId])

  const deleteEndpoint = useCallback((id) => {
    setOrgs(prev => prev.map(o =>
      o.id === activeOrgId
        ? { ...o, endpoints: o.endpoints.filter(e => e.id !== id) }
        : o
    ))
    setActiveEpId(null)
    setResult(null)
  }, [activeOrgId])

  // ── Call endpoint ──────────────────────────────────────────────────────────
  const callEndpoint = useCallback(async (ep) => {
    setLoading(true)
    setResult(null)

    // Merge org-level auth with any endpoint-level override
    const auth = activeOrg?.auth || DEFAULT_AUTH

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

    const useProxy = await isProxyAvailable()

    try {
      let status, statusText, ok, text

      if (useProxy) {
        const proxyRes = await fetch('http://127.0.0.1:57321/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: ep.url, method: ep.method, headers, body, auth })
        })
        const envelope = await proxyRes.json()
        if (envelope.error) throw new Error(envelope.error)
        status = envelope.status; statusText = envelope.statusText
        ok = envelope.ok; text = envelope.body
      } else {
        injectAuthHeaders(headers, auth)
        if (!headers['Content-Type'] && body) headers['Content-Type'] = 'application/json'
        const res = await fetch(ep.url, { method: ep.method, headers, body })
        status = res.status; statusText = res.statusText
        ok = res.ok; text = await res.text()
      }

      let data
      try { data = JSON.parse(text) } catch { data = text }
      setResult({ data, raw: text, label: `${ep.method} ${ep.url}`, status, statusText, ok })
    } catch (err) {
      setResult({ data: { error: err.message }, raw: err.message, label: ep.url, status: 0, statusText: 'Network Error', ok: false })
    } finally {
      setLoading(false)
    }
  }, [activeOrg])

  return (
    <OrgContext.Provider value={{
      orgs, activeOrg, activeOrgId, ready,
      addOrg, updateOrg, deleteOrg, switchOrg,
      endpoints, activeEp, activeEpId, setActiveEpId,
      addEndpoint, updateEndpoint, deleteEndpoint,
      callEndpoint, result, setResult, loading,
      isElectron: IS_ELECTRON,
    }}>
      {children}
    </OrgContext.Provider>
  )
}

export const useOrg = () => useContext(OrgContext)

// ── Helpers ───────────────────────────────────────────────────────────────────
async function isProxyAvailable() {
  try {
    const res = await fetch('http://127.0.0.1:57321/health', { signal: AbortSignal.timeout(500) })
    return res.ok
  } catch { return false }
}

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
