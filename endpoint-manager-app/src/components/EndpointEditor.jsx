import React, { useState, useEffect } from 'react'
import { Play, Save, Trash2, ChevronDown, Settings } from 'lucide-react'
import { useOrg } from '../context/OrgContext'

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

const METHOD_COLORS = {
  GET:    'text-green-400',
  POST:   'text-blue-400',
  PUT:    'text-yellow-400',
  PATCH:  'text-purple-400',
  DELETE: 'text-red-400',
}

const inputCls = 'bg-slate-700 border border-cyan-700/50 text-cyan-100 placeholder-cyan-400/40 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all shadow-neon-input'

export default function EndpointEditor() {
  const { activeEp, updateEndpoint, deleteEndpoint, callEndpoint, loading, activeOrg } = useOrg()

  const [form, setForm]   = useState({ name: '', method: 'GET', url: '', headers: '', body: '' })
  const [error, setError] = useState(null)

  useEffect(() => {
    if (activeEp) setForm({
      name:    activeEp.name    || '',
      method:  activeEp.method  || 'GET',
      url:     activeEp.url     || '',
      headers: activeEp.headers || '',
      body:    activeEp.body    || '',
    })
  }, [activeEp?.id])

  if (!activeEp) return null

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))

  function handleSave() { updateEndpoint(activeEp.id, form) }

  async function handleCall() {
    setError(null)
    if (!form.url.trim()) { setError('URL is required'); return }
    await callEndpoint({ ...activeEp, ...form })
  }

  function handleDelete() {
    if (confirm(`Delete "${activeEp.name}"?`)) deleteEndpoint(activeEp.id)
  }

  const showBody = ['POST', 'PUT', 'PATCH'].includes(form.method)
  const authType = activeOrg?.auth?.type
  const hasOrgAuth = authType && authType !== 'none'

  return (
    <div className="bg-slate-800 border-b border-cyan-700/30 flex flex-col">
      {/* Top bar */}
      <div className="px-5 py-3 flex items-center gap-2 flex-wrap">
        <input
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="Endpoint name"
          className={`${inputCls} w-40`}
        />

        <div className="relative">
          <select
            value={form.method}
            onChange={e => set('method', e.target.value)}
            className={`appearance-none bg-slate-700 border border-cyan-700/50 rounded-lg pl-3 pr-7 py-1.5 text-sm font-bold outline-none focus:ring-2 focus:ring-cyan-500 transition-all cursor-pointer ${METHOD_COLORS[form.method]}`}
          >
            {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-cyan-400/50 pointer-events-none" />
        </div>

        <input
          value={form.url}
          onChange={e => set('url', e.target.value)}
          placeholder="https://internal.corp.com/api/data"
          className={`${inputCls} flex-1 min-w-[200px] font-mono`}
        />

        <button
          onClick={handleCall}
          disabled={loading}
          className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-900 font-semibold px-4 py-1.5 rounded-lg text-sm transition-all duration-200 shadow-neon-btn"
        >
          <Play className="w-4 h-4" />
          {loading ? 'Calling…' : 'Call'}
        </button>

        <button onClick={handleSave} className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-cyan-300 border border-cyan-700/50 hover:border-cyan-500 px-3 py-1.5 rounded-lg text-sm transition-all duration-200">
          <Save className="w-4 h-4" />
          Save
        </button>

        <button onClick={handleDelete} className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 hover:border-red-500 px-3 py-1.5 rounded-lg text-sm transition-all duration-200">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Org auth badge */}
      {hasOrgAuth && (
        <div className="px-5 pb-1 flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-cyan-400/50 uppercase tracking-wider">Using org auth:</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono uppercase">{authType}</span>
        </div>
      )}

      {/* Request config */}
      <div className="px-5 py-3 flex gap-3">
        <div className="flex-1 flex flex-col gap-1">
          <label className="text-[11px] text-cyan-400/70 font-mono uppercase tracking-wider flex items-center gap-1">
            <Settings className="w-3 h-3" /> Headers (JSON)
          </label>
          <textarea
            value={form.headers}
            onChange={e => set('headers', e.target.value)}
            placeholder={'{"Content-Type": "application/json"}'}
            rows={2}
            className="bg-slate-700 border border-cyan-700/50 text-cyan-100 placeholder-cyan-400/30 rounded-lg px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all resize-none shadow-neon-input"
          />
        </div>
        {showBody && (
          <div className="flex-1 flex flex-col gap-1">
            <label className="text-[11px] text-cyan-400/70 font-mono uppercase tracking-wider">Body (JSON)</label>
            <textarea
              value={form.body}
              onChange={e => set('body', e.target.value)}
              placeholder={'{"key": "value"}'}
              rows={2}
              className="bg-slate-700 border border-cyan-700/50 text-cyan-100 placeholder-cyan-400/30 rounded-lg px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all resize-none shadow-neon-input"
            />
          </div>
        )}
      </div>

      {error && <p className="px-5 pb-3 text-red-400 text-xs font-mono">{error}</p>}
    </div>
  )
}
