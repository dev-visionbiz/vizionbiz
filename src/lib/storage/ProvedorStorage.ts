export interface DestinoEnvio {
  escritorioId: string
  clienteId: string
  nomeCliente: string
  ano: number
  tipoDoc: string
}

export interface ResultadoEnvio {
  provider_file_id: string
  sha256: string
  tamanho_bytes: number
  mime_type: string
}

export interface ProvedorStorage {
  enviar(arquivo: File, destino: DestinoEnvio): Promise<ResultadoEnvio>
  baixar(providerFileId: string): Promise<string>
  excluir(providerFileId: string): Promise<void>
  garantirPasta(caminho: string[]): Promise<string>
  testarConexao(): Promise<{ ok: boolean; mensagem?: string }>
}
