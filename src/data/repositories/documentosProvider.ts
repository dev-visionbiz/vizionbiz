/**
 * Provider de repositórios de documentos.
 *
 * Quando VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY estão no .env.local:
 *   → usa implementações Supabase (persistência real, multi-device)
 *
 * Quando não estão configuradas:
 *   → cai silenciosamente para localStorage (modo desenvolvimento/demo)
 */

import { isSupabaseEnabled } from '@/lib/supabase'

// --- localStorage ---
import { LocalFolderRepository } from './localStorage/FolderRepository'
import { LocalDocumentTypeRepository } from './localStorage/DocumentTypeRepository'
import { LocalDocumentRepository } from './localStorage/DocumentRepository'
import { LocalDocumentEventRepository } from './localStorage/DocumentEventRepository'
import { LocalShareLinkRepository } from './localStorage/ShareLinkRepository'
import { LocalStorageConnectionRepository } from './localStorage/StorageConnectionRepository'

// --- Supabase ---
import { SupabaseFolderRepository } from './supabase/FolderRepository'
import { SupabaseDocumentTypeRepository } from './supabase/DocumentTypeRepository'
import { SupabaseDocumentRepository } from './supabase/DocumentRepository'
import { SupabaseDocumentEventRepository } from './supabase/DocumentEventRepository'
import { SupabaseShareLinkRepository } from './supabase/ShareLinkRepository'
import { SupabaseStorageConnectionRepository } from './supabase/StorageConnectionRepository'

export const folderRepo = isSupabaseEnabled
  ? new SupabaseFolderRepository()
  : new LocalFolderRepository()

export const documentTypeRepo = isSupabaseEnabled
  ? new SupabaseDocumentTypeRepository()
  : new LocalDocumentTypeRepository()

export const documentRepo = isSupabaseEnabled
  ? new SupabaseDocumentRepository()
  : new LocalDocumentRepository()

export const documentEventRepo = isSupabaseEnabled
  ? new SupabaseDocumentEventRepository()
  : new LocalDocumentEventRepository()

export const shareLinkRepo = isSupabaseEnabled
  ? new SupabaseShareLinkRepository()
  : new LocalShareLinkRepository()

export const storageConnectionRepo = isSupabaseEnabled
  ? new SupabaseStorageConnectionRepository()
  : new LocalStorageConnectionRepository()
