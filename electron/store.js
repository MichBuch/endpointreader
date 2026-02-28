/**
 * Encrypted local store — no database, no cloud.
 *
 * Strategy:
 *   - Electron's safeStorage encrypts/decrypts a master AES key using the OS
 *     credential store (Keychain on macOS, DPAPI on Windows, libsecret on Linux).
 *   - All org data (auth tokens, certs, endpoints) is AES-256-GCM encrypted with
 *     that master key and written to a plain JSON file on disk.
 *   - The file is safe to back up — it's unreadable without the OS user session.
 */

const { safeStorage, app } = require('electron')
const crypto = require('crypto')
const fs     = require('fs')
const path   = require('path')

const STORE_FILE = path.join(app.getPath('userData'), 'orgs.enc.json')
const KEY_FILE   = path.join(app.getPath('userData'), 'master.key')

const ALGO = 'aes-256-gcm'

// ── Master key ────────────────────────────────────────────────────────────────
function getMasterKey() {
  if (fs.existsSync(KEY_FILE)) {
    const encrypted = fs.readFileSync(KEY_FILE)
    return safeStorage.decryptString(encrypted)
  }
  // First run — generate and persist a new master key
  const key = crypto.randomBytes(32).toString('hex')
  const encrypted = safeStorage.encryptString(key)
  fs.writeFileSync(KEY_FILE, encrypted)
  return key
}

// ── AES-256-GCM encrypt/decrypt ───────────────────────────────────────────────
function encrypt(plaintext, keyHex) {
  const key = Buffer.from(keyHex, 'hex')
  const iv  = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, key, iv)
  const enc  = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag  = cipher.getAuthTag()
  return JSON.stringify({
    iv:  iv.toString('hex'),
    tag: tag.toString('hex'),
    data: enc.toString('hex')
  })
}

function decrypt(payload, keyHex) {
  const { iv, tag, data } = JSON.parse(payload)
  const key    = Buffer.from(keyHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(iv, 'hex'))
  decipher.setAuthTag(Buffer.from(tag, 'hex'))
  return decipher.update(Buffer.from(data, 'hex')) + decipher.final('utf8')
}

// ── Public API ────────────────────────────────────────────────────────────────
function readStore() {
  if (!fs.existsSync(STORE_FILE)) return { orgs: [], activeOrgId: null }
  try {
    const key  = getMasterKey()
    const raw  = fs.readFileSync(STORE_FILE, 'utf8')
    return JSON.parse(decrypt(raw, key))
  } catch (e) {
    console.error('[store] read error:', e.message)
    return { orgs: [], activeOrgId: null }
  }
}

function writeStore(data) {
  const key = getMasterKey()
  fs.writeFileSync(STORE_FILE, encrypt(JSON.stringify(data), key), 'utf8')
}

module.exports = { readStore, writeStore }
