import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verificarState, criptografar } from '../_shared/crypto.ts'
import { obterEmailConta } from '../_shared/google.ts'

const FRONTEND_URL = Deno.env.get('FRONTEND_URL') ?? ''

function frontendRedirect(path: string): Response {
  return Response.redirect(`${FRONTEND_URL}${path}`)
}

serve(async (req: Request) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const oauthError = url.searchParams.get('error')

  if (oauthError || !code || !state) {
    return frontendRedirect('/escritorio/configuracoes?erro=oauth_cancelado')
  }

  const payload = await verificarState(state)
  if (!payload) {
    return frontendRedirect('/escritorio/configuracoes?erro=estado_invalido')
  }

  const { escritorioId, redirectTo } = payload as { escritorioId: string; redirectTo: string }
  const destino = redirectTo || `${FRONTEND_URL}/escritorio/configuracoes`

  try {
    // Troca código por tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
        redirect_uri: Deno.env.get('GOOGLE_REDIRECT_URI')!,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) throw new Error('Falha ao trocar código por tokens')

    const tokens = await tokenRes.json() as {
      access_token: string
      refresh_token: string
      expires_in: number
    }

    const email = await obterEmailConta(tokens.access_token)
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    await supabase.from('storage_connections').upsert({
      escritorio_id: escritorioId,
      provider: 'google_drive',
      status: 'conectado',
      conta_email: email,
      conectado_por: 'admin',
      conectado_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      access_token_enc: await criptografar(tokens.access_token),
      refresh_token_enc: await criptografar(tokens.refresh_token),
      token_expires_at: expiresAt,
    }, { onConflict: 'escritorio_id' })

    const dest = new URL(destino)
    dest.searchParams.set('armazenamento', 'google_drive')
    dest.searchParams.set('email', email)
    dest.searchParams.set('status', 'conectado')
    return Response.redirect(dest.toString())
  } catch (err) {
    const dest = new URL(destino)
    dest.searchParams.set('erro', String(err))
    return Response.redirect(dest.toString())
  }
})
