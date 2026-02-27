import React from 'react'
import { Download, CheckCircle, XCircle, Loader } from 'lucide-react'
import { useEndpoints } from '../context/EndpointContext'

// ── JSON flattening ───────────────────────────────────────────────────────────
function flatten(obj, prefix = '', out = {}) {
  if (obj === null || typeof obj !== 'object') {
    out[prefix || 'value'] = obj
    return out
  }
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length <= 8) {
      flatten(v, key, out)
    } else {
      out[key] = v
    }
  }
  return out
}

function normalise(data) {
  if (Array.isArray(data)) return data.map(r => flatten(r))
  if (data && typeof data === 'object') return [flatten(data)]
  return [{ value: data }]
}

function humanise(key) {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_.\-]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

function exportCSV(rows, cols) {
  const header = cols.map(c => `"${humanise(c)}"`).join(',')
  const body = rows.map(r => cols.map(c => {
    const v = r[c]
    const s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)
    return `"${s.replace(/"/g, '""')}"`
  }).join(','))
  const blob = new Blob([[header, ...body].join('\n')], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'results.csv'
  a.click()
}

// ── Cell renderer ─────────────────────────────────────────────────────────────
function Cell({ value }) {
  if (value === null || value === undefined)
    return <span className="text-cyan-400/30 italic">—</span>
  if (typeof value === 'boolean')
    return <span className="text-purple-400 font-semibold font-mono">{String(value)}</span>
  if (typeof value === 'number')
    return <span className="text-cyan-300 font-mono">{value.toLocaleString()}</span>
  if (typeof value === 'object')
    return <span className="text-cyan-400/60 text-xs font-mono">{JSON.stringify(value)}</span>
  if (typeof value === 'string' && /^https?:\/\//.test(value))
    return <a href={value} target="_blank" rel="noopener" className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300 transition-colors">{value}</a>
  return <span className="text-cyan-100">{String(value)}</span>
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Spreadsheet() {
  const { result, loading, active } = useEndpoints()

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-cyan-400/60">
          <Loader className="w-8 h-8 animate-spin text-cyan-400" />
          <span className="text-sm font-mono">Calling endpoint…</span>
        </div>
      </div>
    )
  }

  if (!active) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-cyan-400/40">
          <div className="text-5xl mb-4">⚡</div>
          <p className="text-sm">Select or add an endpoint to get started.</p>
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-cyan-400/40">
          <div className="text-4xl mb-4">▶</div>
          <p className="text-sm">Hit <span className="text-cyan-400 font-semibold">Call</span> to load data.</p>
        </div>
      </div>
    )
  }

  const rows = normalise(result.data)
  const cols = [...new Set(rows.flatMap(r => Object.keys(r)))]

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-4 gap-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          {result.ok
            ? <CheckCircle className="w-4 h-4 text-green-400" />
            : <XCircle className="w-4 h-4 text-red-400" />
          }
          <span className="text-xs font-mono text-cyan-300 truncate max-w-lg">{result.label}</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${result.ok ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
            {result.status} {result.statusText}
          </span>
          <span className="text-xs text-cyan-400/50">{rows.length} row{rows.length !== 1 ? 's' : ''}</span>
        </div>
        <button
          onClick={() => exportCSV(rows, cols)}
          className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-cyan-300 border border-cyan-700/50 hover:border-cyan-500 px-3 py-1.5 rounded-lg text-xs transition-all duration-200"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-xl border border-cyan-700/30 shadow-neon-card">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10">
            <tr>
              {cols.map(c => (
                <th key={c} className="bg-slate-800 text-cyan-400 font-semibold text-left px-4 py-2.5 border-b border-cyan-700/30 whitespace-nowrap text-xs uppercase tracking-wider font-mono">
                  {humanise(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-cyan-700/10 hover:bg-slate-800/50 transition-colors">
                {cols.map(c => (
                  <td key={c} className="px-4 py-2.5 align-top max-w-xs">
                    <Cell value={row[c]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
