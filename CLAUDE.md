# VisionBiz — Instruções para o assistente

## Stack

React 18 + Vite + TypeScript, React Router, TailwindCSS v4, shadcn/ui, lucide-react,
react-hook-form + zod, date-fns, TanStack Query.
Persistência atual: localStorage (migração futura para Supabase).

> **Tailwind v4** — usar `@import "tailwindcss"` no CSS, nunca as diretivas `@tailwind base/components/utilities` do v3.

---

## Regras obrigatórias — armazenamento de arquivos

Estas regras se aplicam a **todo código novo gerado** relacionado a upload, download ou exclusão de arquivos.

1. **Módulo único.** Todo acesso ao storage passa por `src/lib/storage`. É proibido importar ou instanciar qualquer SDK de storage (Supabase, S3, R2) fora desse módulo.

2. **Banco guarda caminho, não URL.** O campo `storage_key` armazena apenas o caminho relativo (`{escritorio_id}/{cliente_id}/{ano}/{uuid}.{ext}`). URLs são geradas sob demanda via `storageService.gerarUrlDownload`.

3. **Buckets sempre privados.** Na migração Supabase, download somente por URL assinada (≤ 2 min), gerada por Edge Function após verificar permissão e pendência financeira.

4. **Nenhuma URL em e-mail ou notificação.** Links enviados ao cliente apontam para a rota `/documentos/{id}/baixar`, que gera a URL na hora.

5. **Nome físico é UUID.** Nome original fica apenas na tabela. Padrão: `{escritorio_id}/{cliente_id}/{ano}/{uuid}.{ext}`.

6. **Todo upload grava hash SHA-256 e tamanho em bytes.** A função `storageService.salvar` retorna `{ key, sha256, tamanho }`.

7. **Exclusão é sempre lógica (`deleted_at`).** Remoção física só por rotina de retenção. A camada de storage remove o arquivo físico; o documento no banco deve receber `deleted_at`.

8. **Autorização decidida no banco e na Edge Function,** nunca dependendo apenas de políticas do bucket.

### Interface do serviço (`src/lib/storage/StorageService.ts`)

```ts
interface StorageService {
  salvar(arquivo: File, destino: { escritorioId: string; clienteId: string }): Promise<{ key: string; sha256: string; tamanho: number }>
  gerarUrlDownload(key: string, expiraEmSegundos: number): Promise<string>
  excluir(key: string): Promise<void>
  existe(key: string): Promise<boolean>
}
```

### Implementações

| Arquivo | Provedor |
|---|---|
| `src/lib/storage/LocalStorageStorage.ts` | localStorage (MVP) |
| `src/lib/storage/SupabaseStorage.ts` *(a criar)* | Supabase Storage |

Importe sempre o singleton: `import { storageService } from '@/lib/storage'`

### Como verificar conformidade

- Buscar `supabase.storage` e `.storage.from(` — deve aparecer **somente** dentro de `src/lib/storage`.
- Buscar `supabase.co/storage` — **não deve aparecer em lugar nenhum**.
- Checar registros da tabela: `storage_key` deve conter apenas o caminho relativo, nunca uma URL.

---

## Estrutura-chave

```
src/
  domain/types.ts          — todos os tipos de domínio
  domain/financeiro/       — calcularEncargos, simularRenegociacao, gerarTermo
  domain/documentos/       — podeBaixar
  data/repositories/       — interfaces + implementações localStorage
  data/hooks/              — hooks TanStack Query
  lib/storage/             — StorageService, LocalStorageStorage, index
  lib/utils.ts             — utilitários gerais
  auth/AuthProvider.tsx    — mock auth com switchUser
  theme/ThemeProvider.tsx  — CSS vars dinâmicas
  data/seed/               — runSeed() chamada no App.tsx
```

## Papéis

- `escritorio_admin` — acesso total
- `escritorio_colaborador` — operação (sem alterar política)
- `cliente` — só vê a própria empresa
