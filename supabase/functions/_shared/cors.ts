export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': [
    'authorization', 'x-client-info', 'apikey', 'content-type',
    'x-escritorio-id', 'x-nome-cliente', 'x-ano', 'x-tipo-doc',
    'x-filename', 'content-length', 'x-action',
  ].join(', '),
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE',
}

export function optionsResponse(): Response {
  return new Response('ok', { headers: corsHeaders })
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
