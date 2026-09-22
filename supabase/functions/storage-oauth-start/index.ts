import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders, optionsResponse, jsonResponse } from '../_shared/cors.ts'
import { assinarState } from '../_shared/crypto.ts'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return optionsResponse()

  try {
    const { escritorioId, redirectTo } = await req.json() as { escritorioId: string; redirectTo: string }
    if (!escritorioId) return jsonResponse({ error: 'escritorioId obrigatório' }, 400)

    const state = await assinarState({
      escritorioId,
      redirectTo: redirectTo ?? '',
      nonce: crypto.randomUUID(),
      ts: Date.now(),
    })

    const params = new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
      redirect_uri: Deno.env.get('GOOGLE_REDIRECT_URI')!,
      response_type: 'code',
      scope: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/userinfo.email',
      ].join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state,
    })

    return jsonResponse({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` })
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500)
  }
})
