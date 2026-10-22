import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// isSupabaseEnabled = true quando as variáveis estiverem no .env.local
// Quando false, os providers usam localStorage automaticamente
export const isSupabaseEnabled = !!(supabaseUrl && supabaseAnonKey)

if (!isSupabaseEnabled) {
  // aviso em dev para lembrar de configurar o .env.local
  if (import.meta.env.DEV) {
    console.info('[VisionBiz] Supabase não configurado — usando localStorage. Adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY ao .env.local para ativar.')
  }
}

// Criamos o cliente sempre — em modo localStorage ele nunca será chamado
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
)

// Cria um usuário no Supabase Auth sem afetar a sessão atual.
// Usa um cliente temporário com persistSession: false e storageKey isolado.
export async function createSupabaseAuthUser(
  email: string,
  password: string,
): Promise<{ error: string | null }> {
  if (!isSupabaseEnabled) return { error: null }

  const temp = createClient(
    supabaseUrl ?? '',
    supabaseAnonKey ?? '',
    { auth: { storageKey: 'vb-temp-signup', persistSession: false, autoRefreshToken: false } },
  )

  const { error } = await temp.auth.signUp({ email, password })
  if (error) return { error: error.message }
  return { error: null }
}
