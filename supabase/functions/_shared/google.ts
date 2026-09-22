/** Renova o access token usando o refresh token. Lança 'invalid_grant' se o refresh token expirou. */
export async function renovarAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresAt: Date }> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error ?? 'token_refresh_failed')
  }
  return {
    accessToken: data.access_token as string,
    expiresAt: new Date(Date.now() + (data.expires_in as number) * 1000),
  }
}

/** Revoga um token no Google (best-effort). */
export async function revogarToken(token: string): Promise<void> {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, { method: 'POST' })
}

/** Retorna o e-mail da conta Google autenticada. */
export async function obterEmailConta(accessToken: string): Promise<string> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await res.json()
  return (data.email as string) ?? ''
}

/**
 * Garante que a cadeia de pastas existe no Google Drive e retorna o ID da pasta-folha.
 * Reutiliza pastas existentes (não cria duplicatas).
 */
export async function garantirPastaGoogleDrive(
  accessToken: string,
  nomes: string[],
  parentId?: string,
): Promise<string> {
  let currentId = parentId

  for (const nome of nomes) {
    let q = `name = '${nome.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
    if (currentId) q += ` and '${currentId}' in parents`

    const search = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    const { files } = await search.json()

    if (files?.length > 0) {
      currentId = files[0].id as string
    } else {
      const create = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nome,
          mimeType: 'application/vnd.google-apps.folder',
          ...(currentId ? { parents: [currentId] } : {}),
        }),
      })
      const folder = await create.json()
      currentId = folder.id as string
    }
  }

  return currentId!
}
