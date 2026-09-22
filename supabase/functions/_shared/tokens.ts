// deno-lint-ignore-file no-explicit-any
import { decifrar, criptografar } from './crypto.ts'
import { renovarAccessToken } from './google.ts'

/**
 * Retorna um access token válido para o escritório.
 * Renova automaticamente se expirado. Lança se o refresh token for inválido
 * (invalid_grant) e marca a conexão como 'reconectar'.
 */
export async function obterTokensValidos(supabase: any, escritorioId: string): Promise<string> {
  const { data: conn, error } = await supabase
    .from('storage_connections')
    .select('access_token_enc, refresh_token_enc, token_expires_at, status')
    .eq('escritorio_id', escritorioId)
    .single()

  if (error || !conn) throw new Error('Conexão de armazenamento não encontrada')
  if (conn.status === 'desconectado') throw new Error('Armazenamento desconectado')

  // Ainda válido (com folga de 5 min)
  const expires = conn.token_expires_at ? new Date(conn.token_expires_at) : new Date(0)
  if (expires > new Date(Date.now() + 5 * 60 * 1000)) {
    return decifrar(conn.access_token_enc)
  }

  // Renovar
  const refreshToken = await decifrar(conn.refresh_token_enc)
  try {
    const { accessToken, expiresAt } = await renovarAccessToken(refreshToken)
    await supabase.from('storage_connections').update({
      access_token_enc: await criptografar(accessToken),
      token_expires_at: expiresAt.toISOString(),
      status: 'conectado',
      updated_at: new Date().toISOString(),
    }).eq('escritorio_id', escritorioId)
    return accessToken
  } catch (err) {
    if (String(err).includes('invalid_grant')) {
      await supabase.from('storage_connections').update({
        status: 'reconectar',
        updated_at: new Date().toISOString(),
      }).eq('escritorio_id', escritorioId)
    }
    throw err
  }
}
