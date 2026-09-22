import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { optionsResponse, jsonResponse } from '../_shared/cors.ts'
import { decifrar } from '../_shared/crypto.ts'
import { revogarToken } from '../_shared/google.ts'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return optionsResponse()

  try {
    const { escritorioId } = await req.json() as { escritorioId: string }
    if (!escritorioId) return jsonResponse({ error: 'escritorioId obrigatório' }, 400)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: conn } = await supabase
      .from('storage_connections')
      .select('refresh_token_enc')
      .eq('escritorio_id', escritorioId)
      .single()

    // Revoga o token no Google (best-effort — não falha a operação se der erro)
    if (conn?.refresh_token_enc) {
      try {
        const refreshToken = await decifrar(conn.refresh_token_enc)
        await revogarToken(refreshToken)
      } catch {
        // Ignora — o mais importante é limpar o registro local
      }
    }

    await supabase.from('storage_connections').update({
      status: 'desconectado',
      access_token_enc: null,
      refresh_token_enc: null,
      token_expires_at: null,
      updated_at: new Date().toISOString(),
    }).eq('escritorio_id', escritorioId)

    return jsonResponse({ ok: true })
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500)
  }
})
