import React, { useState } from 'react'
import { Building2, Plus, Trash2, ChevronDown, ShieldCheck, Pencil, Check, X } from 'lucide-react'
import { useOrg } from '../context/OrgContext'
import AuthEditor from './AuthEditor'

const ORG_COLOURS = ['cyan','violet','emerald','amber','rose','sky','indigo','pink']

const colourDot = {
  cyan:    'bg-cyan-400',
  violet:  'bg-violet-400',
  emerald: 'bg-emerald-400',
  amber:   'bg-amber-400',
  rose:    'bg-rose-400',
  sky:     'bg-sky-400',
  indigo:  'bg-indigo-400',
  pink:    'bg-pink-400',
}

export default function OrgSwitcher() {
  const { orgs, activeOrg, activeOrgId, addOrg, updateOrg, deleteOrg, switchOrg } = useOrg()
  const [open, setOpen]         = useState(false)
  const [editingAuth, setEditingAuth] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal]   = useState('')
  const [authDraft, setAuthDraft] = useState(null)

  function startEditName() {
    setNameVal(activeOrg?.name || '')
    setEditingName(true)
  }

  function saveName() {
    if (activeOrg) updateOrg(activeOrg.id, { name: nameVal.trim() || 'Unnamed' })
    setEditingName(false)
  }

  function startEditAuth() {
    setAuthDraft(activeOrg?.auth || { type: 'none' })
    setEditingAuth(true)
    setOpen(false)
  }

  function saveAuth() {
    if (activeOrg) updateOrg(activeOrg.id, { auth: authDraft })
    setEditingAuth(false)
  }

  const hasAuth = activeOrg?.auth?.type && activeOrg.auth.type !== 'none'

  return (
    <div className="border-b border-cyan-700/30">
      {/* Org selector bar */}
      <div className="px-3 py-2 flex items-center gap-2">
        <Building2 className="w-4 h-4 text-cyan-400/70 flex-shrink-0" />

        {editingName ? (
          <div className="flex items-center gap-1 flex-1">
            <input
              autoFocus
              value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
              className="flex-1 bg-slate-700 border border-cyan-500 text-cyan-100 rounded px-2 py-0.5 text-sm outline-none"
            />
            <button onClick={saveName} className="text-green-400 hover:text-green-300"><Check className="w-3.5 h-3.5" /></button>
            <button onClick={() => setEditingName(false)} className="text-red-400 hover:text-red-300"><X className="w-3.5 h-3.5" /></button>
          </div>
        ) : (
          <button
            onClick={() => setOpen(o => !o)}
            className="flex-1 flex items-center gap-2 text-left text-sm text-cyan-100 hover:text-cyan-300 transition-colors min-w-0"
          >
            {activeOrg && <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colourDot[activeOrg.colour] || 'bg-cyan-400'}`} />}
            <span className="truncate">{activeOrg?.name || 'Select Organisation'}</span>
            <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 text-cyan-400/50 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        )}

        {activeOrg && !editingName && (
          <div className="flex items-center gap-1">
            <button onClick={startEditName} title="Rename" className="text-cyan-400/40 hover:text-cyan-400 transition-colors">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={startEditAuth}
              title="Security settings"
              className={`transition-colors ${hasAuth ? 'text-cyan-400' : 'text-cyan-400/40 hover:text-cyan-400'}`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="mx-2 mb-2 bg-slate-800 border border-cyan-700/30 rounded-lg overflow-hidden shadow-neon-card">
          {orgs.map(org => (
            <div
              key={org.id}
              className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-all group
                ${org.id === activeOrgId ? 'bg-slate-700 text-cyan-100' : 'text-cyan-300 hover:bg-slate-700/60'}`}
              onClick={() => { switchOrg(org.id); setOpen(false) }}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colourDot[org.colour] || 'bg-cyan-400'}`} />
              <span className="flex-1 text-sm truncate">{org.name}</span>
              {org.auth?.type && org.auth.type !== 'none' && (
                <ShieldCheck className="w-3 h-3 text-cyan-400/60" />
              )}
              <button
                onClick={e => { e.stopPropagation(); if (confirm(`Delete "${org.name}"?`)) deleteOrg(org.id) }}
                className="opacity-0 group-hover:opacity-100 text-red-400/60 hover:text-red-400 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {/* Colour picker for active org */}
          {activeOrg && (
            <div className="px-3 py-2 border-t border-cyan-700/20 flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-cyan-400/50 mr-1">Colour:</span>
              {ORG_COLOURS.map(c => (
                <button
                  key={c}
                  onClick={e => { e.stopPropagation(); updateOrg(activeOrg.id, { colour: c }) }}
                  className={`w-4 h-4 rounded-full ${colourDot[c]} transition-all ${activeOrg.colour === c ? 'ring-2 ring-white/50 scale-110' : 'opacity-60 hover:opacity-100'}`}
                />
              ))}
            </div>
          )}

          <button
            onClick={() => { addOrg(); setOpen(false) }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-cyan-400 hover:bg-slate-700/60 border-t border-cyan-700/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Organisation
          </button>
        </div>
      )}

      {/* Auth editor modal */}
      {editingAuth && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setEditingAuth(false)}>
          <div
            className="bg-slate-800 border border-cyan-700/30 rounded-xl shadow-neon-card w-full max-w-2xl mx-4 max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-cyan-700/30">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <span className="text-cyan-100 font-semibold">Security — {activeOrg?.name}</span>
              </div>
              <button onClick={() => setEditingAuth(false)} className="text-cyan-400/50 hover:text-cyan-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs text-cyan-400/50 mb-4 font-mono">
                Auth config is applied to all endpoints in this organisation.
                {window.electronAPI?.saveStore
                  ? ' Data is encrypted with AES-256-GCM and stored locally using your OS credential store.'
                  : ' Running in web mode — data is session-only and not persisted.'}
              </p>
              <AuthEditor auth={authDraft} onChange={setAuthDraft} />
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-cyan-700/30">
              <button onClick={() => setEditingAuth(false)} className="px-4 py-2 text-sm text-cyan-400 bg-slate-700 hover:bg-slate-600 rounded-lg border border-cyan-700/40 transition-all">
                Cancel
              </button>
              <button onClick={saveAuth} className="px-4 py-2 text-sm font-semibold bg-cyan-600 hover:bg-cyan-500 text-slate-900 rounded-lg shadow-neon-btn transition-all">
                Save Security Config
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
