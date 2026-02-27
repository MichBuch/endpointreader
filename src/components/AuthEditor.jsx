import React from 'react'
import { ShieldCheck, Eye, EyeOff, FolderOpen } from 'lucide-react'

const AUTH_TYPES = [
  { value: 'none',    label: 'None' },
  { value: 'bearer',  label: 'Bearer Token' },
  { value: 'apikey',  label: 'API Key' },
  { value: 'basic',   label: 'Basic Auth' },
  { value: 'custom',  label: 'Custom Headers' },
]

const inputCls = 'w-full bg-slate-700 border border-cyan-700/50 text-cyan-100 placeholder-cyan-400/30 rounded-lg px-3 py-1.5 text-sm font-mono focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all shadow-neon-input'
const labelCls = 'text-[11px] text-cyan-400/70 font-mono uppercase tracking-wider mb-1 block'

function Field({ label, children }) {
  return (
    <div className="flex flex-col">
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  )
}

function FileInput({ label, value, onChange, placeholder }) {
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <input value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder || '/path/to/file'} className={inputCls} />
        <button
          type="button"
          title="Browse"
          onClick={async () => {
            // Electron file dialog via showOpenDialog if available
            if (window.electronAPI?.openFile) {
              const p = await window.electronAPI.openFile()
              if (p) onChange(p)
            }
          }}
          className="bg-slate-700 border border-cyan-700/50 hover:border-cyan-500 text-cyan-400 px-2 rounded-lg transition-all"
        >
          <FolderOpen className="w-4 h-4" />
        </button>
      </div>
    </Field>
  )
}

export default function AuthEditor({ auth = {}, onChange }) {
  const type = auth.type || 'none'
  const set = (field, val) => onChange({ ...auth, [field]: val })

  const [showSecret, setShowSecret] = React.useState(false)

  return (
    <div className="flex flex-col gap-3">
      {/* Auth type selector */}
      <Field label="Auth Type">
        <div className="flex gap-2 flex-wrap">
          {AUTH_TYPES.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => onChange({ ...auth, type: t.value })}
              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all duration-200
                ${type === t.value
                  ? 'bg-cyan-600 border-cyan-500 text-slate-900 shadow-neon-btn'
                  : 'bg-slate-700 border-cyan-700/40 text-cyan-300 hover:border-cyan-500'
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Field>

      {/* Bearer */}
      {type === 'bearer' && (
        <Field label="Token">
          <div className="flex gap-2">
            <input
              type={showSecret ? 'text' : 'password'}
              value={auth.token || ''}
              onChange={e => set('token', e.target.value)}
              placeholder="eyJhbGci..."
              className={inputCls}
            />
            <button type="button" onClick={() => setShowSecret(s => !s)} className="text-cyan-400/60 hover:text-cyan-400 px-2">
              {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </Field>
      )}

      {/* API Key */}
      {type === 'apikey' && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Header Name">
            <input value={auth.apiKeyHeader || ''} onChange={e => set('apiKeyHeader', e.target.value)} placeholder="X-API-Key" className={inputCls} />
          </Field>
          <Field label="Value">
            <div className="flex gap-2">
              <input
                type={showSecret ? 'text' : 'password'}
                value={auth.apiKeyValue || ''}
                onChange={e => set('apiKeyValue', e.target.value)}
                placeholder="your-api-key"
                className={inputCls}
              />
              <button type="button" onClick={() => setShowSecret(s => !s)} className="text-cyan-400/60 hover:text-cyan-400 px-2">
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>
        </div>
      )}

      {/* Basic */}
      {type === 'basic' && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Username">
            <input value={auth.username || ''} onChange={e => set('username', e.target.value)} placeholder="username" className={inputCls} />
          </Field>
          <Field label="Password">
            <div className="flex gap-2">
              <input
                type={showSecret ? 'text' : 'password'}
                value={auth.password || ''}
                onChange={e => set('password', e.target.value)}
                placeholder="password"
                className={inputCls}
              />
              <button type="button" onClick={() => setShowSecret(s => !s)} className="text-cyan-400/60 hover:text-cyan-400 px-2">
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>
        </div>
      )}

      {/* Custom headers */}
      {type === 'custom' && (
        <Field label="Custom Headers (JSON)">
          <textarea
            value={typeof auth.customHeaders === 'object' ? JSON.stringify(auth.customHeaders, null, 2) : (auth.customHeaders || '')}
            onChange={e => {
              try { set('customHeaders', JSON.parse(e.target.value)) }
              catch { set('customHeaders', e.target.value) }
            }}
            rows={3}
            placeholder={'{\n  "X-Corp-Token": "abc123",\n  "X-Tenant-ID": "corp"\n}'}
            className={`${inputCls} resize-none`}
          />
        </Field>
      )}

      {/* Certificate section — always visible when not 'none' */}
      {type !== 'none' && (
        <div className="border-t border-cyan-700/20 pt-3 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-cyan-400/60 text-xs font-mono uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            TLS / Certificate Options
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FileInput label="CA Certificate (.pem / .crt)" value={auth.caCert} onChange={v => set('caCert', v)} placeholder="/certs/corporate-ca.pem" />
            <FileInput label="Client Certificate (.pem)" value={auth.clientCert} onChange={v => set('clientCert', v)} placeholder="/certs/client.pem" />
            <FileInput label="Client Key (.key)" value={auth.clientKey} onChange={v => set('clientKey', v)} placeholder="/certs/client.key" />
            <Field label="Key Passphrase">
              <input
                type={showSecret ? 'text' : 'password'}
                value={auth.clientKeyPassphrase || ''}
                onChange={e => set('clientKeyPassphrase', e.target.value)}
                placeholder="optional passphrase"
                className={inputCls}
              />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-xs text-cyan-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!auth.allowSelfSigned}
              onChange={e => set('allowSelfSigned', e.target.checked)}
              className="accent-cyan-500"
            />
            Allow self-signed certificates (dev/staging only)
          </label>
        </div>
      )}
    </div>
  )
}
