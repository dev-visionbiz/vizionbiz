// Funções de assinatura de state (HMAC-SHA256) e criptografia de tokens (AES-GCM).

const enc = new TextEncoder()
const dec = new TextDecoder()

async function signingKey(): Promise<CryptoKey> {
  const raw = enc.encode(Deno.env.get('STATE_SIGNING_KEY') ?? 'dev-signing-key-change-in-prod')
  return crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

async function encryptionKey(): Promise<CryptoKey> {
  const raw = enc.encode(Deno.env.get('ENCRYPTION_KEY') ?? 'dev-encryption-key-change-in-prod-xx')
  // Deriva exatamente 32 bytes para AES-256-GCM
  const keyBytes = await crypto.subtle.digest('SHA-256', raw)
  return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

/** Cria um state assinado com HMAC-SHA256. Formato: base64(payload) + "." + base64(signature) */
export async function assinarState(payload: Record<string, unknown>): Promise<string> {
  const key = await signingKey()
  const data = btoa(JSON.stringify(payload))
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  return `${data}.${btoa(String.fromCharCode(...new Uint8Array(sig)))}`
}

/** Verifica e extrai o payload do state. Retorna null se inválido ou expirado (5 min). */
export async function verificarState(state: string): Promise<Record<string, unknown> | null> {
  try {
    const [data, sigB64] = state.split('.')
    if (!data || !sigB64) return null
    const key = await signingKey()
    const sig = Uint8Array.from(atob(sigB64), (c) => c.charCodeAt(0))
    const valid = await crypto.subtle.verify('HMAC', key, sig, enc.encode(data))
    if (!valid) return null
    const payload = JSON.parse(atob(data)) as Record<string, unknown>
    if (Date.now() - (payload.ts as number) > 5 * 60 * 1000) return null
    return payload
  } catch {
    return null
  }
}

/** Criptografa texto com AES-256-GCM. Retorna base64(iv + ciphertext). */
export async function criptografar(text: string): Promise<string> {
  const key = await encryptionKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text))
  const out = new Uint8Array(12 + cipher.byteLength)
  out.set(iv)
  out.set(new Uint8Array(cipher), 12)
  return btoa(String.fromCharCode(...out))
}

/** Decifra texto criptografado com `criptografar`. */
export async function decifrar(encrypted: string): Promise<string> {
  const key = await encryptionKey()
  const raw = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0))
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: raw.slice(0, 12) }, key, raw.slice(12))
  return dec.decode(plain)
}
