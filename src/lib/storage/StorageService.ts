export interface StorageService {
  salvar(arquivo: File, destino: { escritorioId: string; clienteId: string }): Promise<{ key: string; sha256: string; tamanho: number }>
  gerarUrlDownload(key: string, expiraEmSegundos: number): Promise<string>
  excluir(key: string): Promise<void>
  existe(key: string): Promise<boolean>
  salvarThumbnail(storageKey: string, dataUrl: string): Promise<void>
  obterThumbnail(storageKey: string): Promise<string | null>
  excluirThumbnail(storageKey: string): Promise<void>
}
