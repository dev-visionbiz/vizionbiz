import { supabase } from '@/lib/supabase'
import type { ShareLink } from '@/domain/types'
import type { ShareLinkRepository as IShareLinkRepository } from '../interfaces'

export class SupabaseShareLinkRepository implements IShareLinkRepository {
  async findByDocument(documentId: string): Promise<ShareLink[]> {
    const { data, error } = await supabase.from('share_links').select('*').eq('document_id', documentId)
    if (error) throw error
    return data ?? []
  }

  async findByToken(token: string): Promise<ShareLink | null> {
    const { data, error } = await supabase.from('share_links').select('*').eq('token', token).maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async create(item: ShareLink): Promise<ShareLink> {
    const { data, error } = await supabase.from('share_links').insert(item).select().single()
    if (error) throw error
    return data
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('share_links').delete().eq('id', id)
    if (error) throw error
  }
}
