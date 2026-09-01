/**
 * `crypto.randomUUID()` only exists in secure contexts (HTTPS, or `localhost`) — it's
 * silently absent when this app is opened over plain HTTP from another device on the
 * LAN (e.g. `http://192.168.x.x:5173`), which is exactly how it gets tested/used before
 * anything is deployed behind HTTPS. Fall back through `crypto.getRandomValues` (broader
 * availability, no secure-context requirement) and finally to `Math.random` — these IDs
 * are only ever used as local, unique identifiers, never as security tokens, so losing
 * cryptographic randomness in the last-resort path is an acceptable trade for the app
 * simply working everywhere it's opened.
 */
export function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant 10xx
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
