import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, optionsResponse, jsonResponse } from '../_shared/cors.ts'
import { obterTokensValidos } from '../_shared/tokens.ts'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return optionsResponse()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const url = new URL(req.url)
  const escritorioId = req.headers.get('x-escritorio-id')

  if (!escritorioId) return jsonResponse({ error: 'x-escritorio-id obrigatório' }, 400)

  // Teste de conexão
  if (url.searchParams.get('action') === 'test') {
    try {
      const accessToken = await obterTokensValidos(supabase, escritorioId)
      const testRes = await fetch(
        'https://www.googleapis.com/drive/v3/files?pageSize=1&fields=files(id)',
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )
      return jsonResponse({ ok: testRes.ok })
    } catch {
      return jsonResponse({ ok: false })
    }
  }

  const providerFileId = url.searchParams.get('file_id')
  if (!providerFileId) return jsonResponse({ error: 'file_id obrigatório' }, 400)

  try {
    const accessToken = await obterTokensValidos(supabase, escritorioId)

    // Metadados do arquivo
    const metaRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${providerFileId}?fields=id,name,mimeType,size`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )

    if (metaRes.status === 404) {
      return jsonResponse({ error: 'arquivo_ausente' }, 404)
    }
    if (!metaRes.ok) throw new Error(`Metadados: ${metaRes.status}`)

    const meta = await metaRes.json() as { id: string; name: string; mimeType: string; size?: string }

    // Stream do arquivo do Drive para o cliente
    const fileRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${providerFileId}?alt=media`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )

    if (!fileRes.ok) throw new Error(`Download Drive: ${fileRes.status}`)

    return new Response(fileRes.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': meta.mimeType ?? 'application/octet-stream',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(meta.name)}`,
        ...(meta.size ? { 'Content-Length': meta.size } : {}),
      },
    })
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500)
  }
})
