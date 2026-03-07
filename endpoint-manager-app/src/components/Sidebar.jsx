import React from 'react'
import { Plus, Zap, Globe } from 'lucide-react'
import { useOrg } from '../context/OrgContext'
import OrgSwitcher from './OrgSwitcher'

const METHOD_COLORS = {
  GET:    'text-green-400 bg-green-500/10 border-green-500/30',
  POST:   'text-blue-400 bg-blue-500/10 border-blue-500/30',
  PUT:    'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  PATCH:  'text-purple-400 bg-purple-500/10 border-purple-500/30',
  DELETE: 'text-red-400 bg-red-500/10 border-red-500/30',
}

export default function Sidebar() {
  const { endpoints, activeEpId, setActiveEpId, addEndpoint, setResult, activeOrg } = useOrg()

  function select(id) { setActiveEpId(id); setResult(null) }

  return (
    <aside className="w-64 flex-shrink-0 bg-slate-900 border-r border-cyan-700/30 flex flex-col h-full">
      {/* App header */}
      <div className="px-4 py-4 border-b border-cyan-700/30 flex items-center gap-2">
        <Zap className="w-5 h-5 text-cyan-400" />
        <span className="text-cyan-100 font-semibold tracking-wide">Endpoint Manager</span>
      </div>

      {/* Org switcher */}
      <OrgSwitcher />

      {/* Add endpoint button */}
      <div className="px-3 py-3">
        <button
          onClick={addEndpoint}
          disabled={!activeOrg}
          className="w-full flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 font-medium px-3 py-2 rounded-lg transition-all duration-200 shadow-neon-btn text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Endpoint
        </button>
      </div>

      {/* Endpoint list */}
      <nav className="flex-1 overflow-y-auto px-2 pb-4 flex flex-col gap-1">
        {!activeOrg && (
          <p className="text-cyan-400/40 text-xs text-center mt-8 px-4">Create or select an organisation first.</p>
        )}
        {activeOrg && endpoints.length === 0 && (
          <p className="text-cyan-400/40 text-xs text-center mt-8 px-4">No endpoints yet.</p>
        )}
        {endpoints.map(ep => {
          const isActive = ep.id === activeEpId
          return (
            <button
              key={ep.id}
              onClick={() => select(ep.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-all duration-200 flex flex-col gap-1
                ${isActive
                  ? 'bg-slate-800 border-r-2 border-cyan-400 text-cyan-100 shadow-neon-card'
                  : 'text-cyan-300 hover:bg-slate-800/60 hover:text-cyan-100'
                }`}
            >
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 flex-shrink-0 text-cyan-400/70" />
                <span className="text-sm font-medium truncate">{ep.name || 'Unnamed'}</span>
              </div>
              <div className="flex items-center gap-2 pl-5">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${METHOD_COLORS[ep.method] || 'text-cyan-400'}`}>
                  {ep.method}
                </span>
                <span className="text-[11px] text-cyan-400/50 truncate">{ep.url || '—'}</span>
              </div>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
