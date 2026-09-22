import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, optionsResponse, jsonResponse } from '../_shared/cors.ts'
import { garantirPastaGoogleDrive } from '../_shared/google.ts'
import { obterTokensValidos } from '../_shared/tokens.ts'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return optionsResponse()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const escritorioId = req.headers.get('x-escritorio-id')
  if (!escritorioId) return jsonResponse({ error: 'x-escritorio-id obrigatório' }, 400)

  try {
    const accessToken = await obterTokensValidos(supabase, escritorioId)

    // DELETE: excluir arquivo no Drive
    if (req.method === 'DELETE') {
      const { provider_file_id } = await req.json() as { provider_file_id: string }
      const del = await fetch(`https://www.googleapis.com/drive/v3/files/${provider_file_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!del.ok && del.status !== 404) throw new Error(`Drive delete: ${del.status}`)
      return jsonResponse({ ok: true })
    }

    // POST: upload de arquivo
    const nomeCliente = req.headers.get('x-nome-cliente') ?? 'Cliente'
    const ano = req.headers.get('x-ano') ?? new Date().getFullYear().toString()
    const tipoDoc = req.headers.get('x-tipo-doc') ?? 'Documento'
    const filename = req.headers.get('x-filename') ?? 'arquivo'
    const contentType = req.headers.get('content-type') ?? 'application/octet-stream'
    const contentLength = req.headers.get('content-length') ?? '0'

    // Estrutura: VizionBiz / {nomeCliente} / {ano} / {tipoDoc}
    const folderId = await garantirPastaGoogleDrive(
      accessToken,
      ['VizionBiz', nomeCliente, ano, tipoDoc],
    )

    // Inicia sessão de upload resumível (evita carregar o arquivo inteiro na memória)
    const sessionRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Type': contentType,
          ...(contentLength !== '0' ? { 'X-Upload-Content-Length': contentLength } : {}),
        },
        body: JSON.stringify({ name: filename, parents: [folderId] }),
      },
    )

    const sessionUri = sessionRes.headers.get('Location')
    if (!sessionUri) throw new Error('Falha ao criar sessão de upload no Google Drive')

    // Faz stream do body da requisição diretamente para o Drive
    const uploadRes = await fetch(sessionUri, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        ...(contentLength !== '0' ? { 'Content-Length': contentLength } : {}),
      },
      body: req.body,
    })

    if (!uploadRes.ok) throw new Error(`Upload falhou: ${uploadRes.status}`)

    const driveFile = await uploadRes.json() as { id: string }

    return jsonResponse({
      provider_file_id: driveFile.id,
      mime_type: contentType,
      tamanho_bytes: parseInt(contentLength) || 0,
    })
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500)
  }
})
