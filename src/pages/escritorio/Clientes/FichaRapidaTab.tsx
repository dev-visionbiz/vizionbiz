import { useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Check, Copy, Download, Lock, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { useRegistrarLogAtividade } from '@/data/hooks/useLogAtividadeCliente'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/EmptyState'
import type { Client, ClienteContato, ClienteEndereco, FichaBloco, FichaCampo, FichaCampoTipo } from '@/domain/types'
import { FICHA_CAMPO_TIPOS_DUPLOS } from '@/domain/types'
import {
  LocalFichaBlocoRepository,
  LocalFichaCampoRepository,
  clienteEnderecoRepo,
  clienteContatoRepo,
} from '@/data/repositories/localStorage'
import type { PFComVinculo } from '@/data/hooks/useClientVinculos'
import { useClienteEnderecos } from '@/data/hooks/useClienteEnderecos'
import { useClienteContatos } from '@/data/hooks/useClienteContatos'
import {
  useFichaBlocos,
  useCreateFichaBloco,
  useUpdateFichaBloco,
  useDeleteFichaBloco,
  useFichaCampos,
  useCreateFichaCampo,
  useUpdateFichaCampo,
  useDeleteFichaCampo,
} from '@/data/hooks/useFichaRapida'
import { copyToClipboard, digitsOnly, formatDate, formatFichaCampoValor } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

// ---- Import/Export helpers ----

type CampoImportado = {
  rotulo: string
  valor: string
  tipo: FichaCampoTipo
  sensivel: boolean
}

type BlocoImportado = {
  titulo: string
  campos: CampoImportado[]
}

function detectarTipo(rotulo: string): { tipo: FichaCampoTipo; sensivel: boolean } {
  const u = rotulo.toUpperCase()
  if (u.includes('CNPJ')) return { tipo: 'cnpj', sensivel: false }
  if (u.includes('CPF')) return { tipo: 'cpf', sensivel: false }
  if (u.includes('CEP')) return { tipo: 'cep', sensivel: false }
  if (u.includes('PIS') || u.includes('PASEP')) return { tipo: 'pis', sensivel: false }
  if (u.includes('TITULO ELEITOR') || u.includes('TÍTULO ELEITOR') || u.includes('TITULO DE ELEITOR'))
    return { tipo: 'titulo_eleitor', sensivel: false }
  if (u.includes('EMAIL') || u.includes('E-MAIL')) return { tipo: 'email', sensivel: false }
  if (u.includes('TEL') || u.includes('CEL') || u.includes('FONE') || u.includes('WHATSAPP'))
    return { tipo: 'telefone', sensivel: false }
  if (u.includes('SENHA') || u.includes('PASSWORD') || u.includes('ACESSO') || u.includes('CODIGO') || u.includes('CÓDIGO'))
    return { tipo: 'senha', sensivel: true }
  if (u.includes('URL') || u.includes('SITE') || u.includes('LINK') || u.includes('HTTP'))
    return { tipo: 'url', sensivel: false }
  return { tipo: 'texto', sensivel: false }
}

function parsearTxt(texto: string): BlocoImportado[] {
  const blocos: BlocoImportado[] = []
  let blocoAtual: BlocoImportado | null = null

  for (const linha of texto.split('\n')) {
    const trimmed = linha.trim()
    if (!trimmed) continue

    const headerMatch = trimmed.match(/^\[(.+)\]$/)
    if (headerMatch) {
      // [~ TÍTULO] = seção automática (cadastro) — ignorada no import
      if (headerMatch[1].startsWith('~ ')) {
        blocoAtual = null
        continue
      }
      blocoAtual = { titulo: headerMatch[1], campos: [] }
      blocos.push(blocoAtual)
      continue
    }

    const colonIdx = trimmed.indexOf(':')
    if (colonIdx > 0 && blocoAtual) {
      const rotulo = trimmed.slice(0, colonIdx).trim()
      const valor = trimmed.slice(colonIdx + 1).trim()
      if (rotulo && valor) {
        blocoAtual.campos.push({ rotulo, valor, ...detectarTipo(rotulo) })
      }
    }
  }

  return blocos.filter((b) => b.campos.length > 0)
}

type BlocoParaTxt = {
  titulo: string
  auto?: boolean
  campos: Array<{ rotulo: string; valor: string }>
}

function gerarTxt(blocos: BlocoParaTxt[]): string {
  const linhas: string[] = []
  for (const bloco of blocos) {
    if (linhas.length > 0) linhas.push('')
    // [~ TÍTULO] para seções automáticas, [TÍTULO] para editáveis
    const header = bloco.auto ? `[~ ${bloco.titulo.toUpperCase()}]` : `[${bloco.titulo.toUpperCase()}]`
    linhas.push(header)
    for (const campo of bloco.campos) {
      linhas.push(`${campo.rotulo}: ${campo.valor}`)
    }
  }
  return linhas.join('\n')
}

const TIPO_LABELS: Record<FichaCampoTipo, string> = {
  texto: 'Texto livre',
  cnpj: 'CNPJ',
  cpf: 'CPF',
  telefone: 'Telefone',
  email: 'E-mail',
  cep: 'CEP',
  pis: 'PIS/PASEP',
  titulo_eleitor: 'Título de Eleitor',
  senha: 'Senha / Código de acesso',
  url: 'URL / Link',
}

// ---- CopyButton ----

interface CopyButtonProps {
  value: string
  title?: string
}

function CopyButton({ value, title = 'Copiar' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const ok = await copyToClipboard(value)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? 'Copiado!' : title}
      className="inline-flex items-center align-middle text-muted-foreground/40 hover:text-muted-foreground transition-colors"
    >
      {copied ? (
        <Check className="h-3 w-3 text-green-600" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  )
}

// ---- CampoRow ----

interface CampoRowProps {
  campo: FichaCampo
  onEdit: (campo: FichaCampo) => void
  onDelete: (campo: FichaCampo) => void
}

function CampoRow({ campo, onEdit, onDelete }: CampoRowProps) {
  const formatted = formatFichaCampoValor(campo.valor, campo.tipo)
  const isDuplo = FICHA_CAMPO_TIPOS_DUPLOS.includes(campo.tipo)

  return (
    <div className="flex items-start gap-2 py-1.5 text-sm min-w-0 group">
      <span className="text-muted-foreground w-40 shrink-0 truncate text-xs mt-0.5">{campo.rotulo}</span>
      <div className="min-w-0 flex-1">
        {campo.sensivel ? (
          <span className="font-mono tracking-widest text-muted-foreground text-xs">••••••••</span>
        ) : (
          <span className="font-mono text-xs wrap-break-word">{formatted}</span>
        )}
        {' '}
        {campo.sensivel ? (
          <CopyButton value={campo.valor} />
        ) : isDuplo ? (
          <>
            <CopyButton value={formatted} title="Copiar formatado" />
            {' '}
            <CopyButton value={digitsOnly(campo.valor)} title="Copiar só dígitos" />
          </>
        ) : (
          <CopyButton value={campo.valor} />
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => onEdit(campo)}
        >
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
          onClick={() => onDelete(campo)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

// ---- CampoDialog ----

interface CampoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: FichaCampo
  onSave: (data: { rotulo: string; tipo: FichaCampoTipo; valor: string; sensivel: boolean }) => void
}

function CampoDialog({ open, onOpenChange, initial, onSave }: CampoDialogProps) {
  const [rotulo, setRotulo] = useState(initial?.rotulo ?? '')
  const [tipo, setTipo] = useState<FichaCampoTipo>(initial?.tipo ?? 'texto')
  const [valor, setValor] = useState(initial?.valor ?? '')
  const [sensivel, setSensivel] = useState(initial?.sensivel ?? false)

  const handleSave = () => {
    if (!rotulo.trim()) return
    onSave({ rotulo: rotulo.trim(), tipo, valor, sensivel })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? 'Editar Campo' : 'Adicionar Campo'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Rótulo</Label>
            <Input
              value={rotulo}
              onChange={(e) => setRotulo(e.target.value)}
              placeholder="Ex: CNPJ, Senha de acesso..."
            />
          </div>
          <div className="space-y-1">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as FichaCampoTipo)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(TIPO_LABELS) as [FichaCampoTipo, string][]).map(([val, lbl]) => (
                  <SelectItem key={val} value={val}>
                    {lbl}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Valor</Label>
            <Input
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              type={sensivel ? 'password' : 'text'}
              placeholder={
                tipo === 'cnpj' || tipo === 'cpf'
                  ? 'Somente dígitos'
                  : tipo === 'cep'
                  ? 'Ex: 01310100'
                  : ''
              }
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="sensivel" checked={sensivel} onCheckedChange={setSensivel} />
            <Label htmlFor="sensivel">Campo sensível (senha / código de acesso)</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!rotulo.trim()}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---- BlocoCard ----

interface BlocoCardProps {
  bloco: FichaBloco
  tenantId: string
}

function BlocoCard({ bloco, tenantId }: BlocoCardProps) {
  const { data: campos = [] } = useFichaCampos(tenantId, bloco.id)
  const { currentUser } = useAuth()
  const registrarLog = useRegistrarLogAtividade()
  const updateBloco = useUpdateFichaBloco()
  const deleteBloco = useDeleteFichaBloco()
  const createCampo = useCreateFichaCampo()
  const updateCampo = useUpdateFichaCampo()
  const deleteCampo = useDeleteFichaCampo()

  const logFicha = (descricao: string) => registrarLog.mutate({
    tenantId,
    clientId: bloco.client_id,
    acao: 'ficha_rapida_alterada',
    descricao,
    usuarioId: currentUser?.id ?? 'desconhecido',
    usuarioNome: currentUser?.nome ?? 'Sistema',
  })

  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(bloco.titulo)
  const [campoDialog, setCampoDialog] = useState(false)
  const [editingCampo, setEditingCampo] = useState<FichaCampo | null>(null)

  const saveTitle = () => {
    if (titleDraft.trim() && titleDraft.trim() !== bloco.titulo) {
      updateBloco.mutate({ id: bloco.id, data: { titulo: titleDraft.trim() } })
      logFicha(`Bloco renomeado: "${bloco.titulo}" → "${titleDraft.trim()}"`)
    }
    setEditingTitle(false)
  }

  const handleDeleteBloco = () => {
    if (!window.confirm(`Excluir bloco "${bloco.titulo}" e todos os seus campos?`)) return
    deleteBloco.mutate({ id: bloco.id, tenantId, clientId: bloco.client_id })
    logFicha(`Bloco excluído: "${bloco.titulo}"`)
  }

  const openEditCampo = (campo: FichaCampo) => {
    setEditingCampo(campo)
    setCampoDialog(true)
  }

  const openNewCampo = () => {
    setEditingCampo(null)
    setCampoDialog(true)
  }

  const handleDeleteCampo = (campo: FichaCampo) => {
    if (!window.confirm(`Excluir campo "${campo.rotulo}"?`)) return
    deleteCampo.mutate({ id: campo.id, tenantId, blocoId: bloco.id })
    logFicha(`Campo excluído: "${campo.rotulo}" (bloco "${bloco.titulo}")`)
  }

  const handleSaveCampo = (data: {
    rotulo: string
    tipo: FichaCampoTipo
    valor: string
    sensivel: boolean
  }) => {
    if (editingCampo) {
      updateCampo.mutate({
        id: editingCampo.id,
        data: { rotulo: data.rotulo, tipo: data.tipo, valor: data.valor, sensivel: data.sensivel },
      })
      logFicha(`Campo editado: "${data.rotulo}" (bloco "${bloco.titulo}")`)
    } else {
      const novoCampo: FichaCampo = {
        id: uuidv4(),
        tenant_id: tenantId,
        bloco_id: bloco.id,
        rotulo: data.rotulo,
        tipo: data.tipo,
        valor: data.valor,
        sensivel: data.sensivel,
        ordem: campos.length,
      }
      createCampo.mutate(novoCampo)
      logFicha(`Campo adicionado: "${data.rotulo}" (bloco "${bloco.titulo}")`)
    }
  }

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center gap-2">
          {editingTitle ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                className="h-7 text-sm font-semibold"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveTitle()
                  if (e.key === 'Escape') {
                    setTitleDraft(bloco.titulo)
                    setEditingTitle(false)
                  }
                }}
                autoFocus
              />
              <Button size="sm" className="h-7 px-3" onClick={saveTitle}>
                Salvar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-3"
                onClick={() => {
                  setTitleDraft(bloco.titulo)
                  setEditingTitle(false)
                }}
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <>
              <CardTitle className="text-sm flex-1">{bloco.titulo}</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => {
                  setTitleDraft(bloco.titulo)
                  setEditingTitle(true)
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                onClick={handleDeleteBloco}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        {campos.length > 0 && (
          <div className="space-y-0">
            {campos.map((campo, i) => (
              <div key={campo.id}>
                {i > 0 && <Separator className="my-0.5" />}
                <CampoRow campo={campo} onEdit={openEditCampo} onDelete={handleDeleteCampo} />
              </div>
            ))}
            <Separator className="my-2" />
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
          onClick={openNewCampo}
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar Campo
        </Button>
      </CardContent>

      {/* key forces remount so dialog state resets when switching between add/edit */}
      <CampoDialog
        key={editingCampo?.id ?? 'new'}
        open={campoDialog}
        onOpenChange={setCampoDialog}
        initial={editingCampo ?? undefined}
        onSave={handleSaveCampo}
      />
    </Card>
  )
}

// ---- CampoReadOnly ----

interface CampoReadOnlyProps {
  rotulo: string
  valor: string
  tipo?: FichaCampoTipo
}

function CampoReadOnly({ rotulo, valor, tipo = 'texto' }: CampoReadOnlyProps) {
  const isDuplo = FICHA_CAMPO_TIPOS_DUPLOS.includes(tipo)
  const formatted = formatFichaCampoValor(valor, tipo)

  return (
    <div className="flex items-start gap-2 py-1.5 text-sm min-w-0">
      <span className="text-muted-foreground w-40 shrink-0 truncate text-xs mt-0.5">{rotulo}</span>
      <div className="min-w-0 flex-1">
        <span className="font-mono text-xs wrap-break-word">{formatted}</span>
        {' '}
        {isDuplo ? (
          <>
            <CopyButton value={formatted} title="Copiar formatado" />
            {' '}
            <CopyButton value={digitsOnly(valor)} title="Copiar só dígitos" />
          </>
        ) : (
          <CopyButton value={valor} />
        )}
      </div>
    </div>
  )
}

const TIPO_ENDERECO_LABEL_CURTO: Record<string, string> = {
  fiscal: 'Fiscal',
  correspondencia: 'Correspondência',
  entrega: 'Entrega',
  cobranca: 'Cobrança',
  outro: 'Outro',
}

const PAPEL_LABELS: Record<string, string> = {
  socio: 'Sócio',
  administrador: 'Administrador',
  procurador: 'Procurador',
  contato_financeiro: 'Contato Financeiro',
  contato_principal: 'Contato Principal',
}

// ---- SocioDataBlock ----

interface SocioDataBlockProps {
  tenantId: string
  socio: PFComVinculo
}

function SocioDataBlock({ tenantId, socio }: SocioDataBlockProps) {
  const { data: enderecos = [] } = useClienteEnderecos(tenantId, socio.clientePF.id)
  const { data: contatos = [] } = useClienteContatos(tenantId, socio.clientePF.id)

  const pf = socio.clientePF
  const papel = PAPEL_LABELS[socio.papel] ?? socio.papel

  type Item = { rotulo: string; valor: string; tipo?: FichaCampoTipo }
  const items: Item[] = []

  items.push({ rotulo: papel, valor: pf.razao_social })
  if (pf.cpf) items.push({ rotulo: 'CPF', valor: pf.cpf, tipo: 'cpf' })
  if (pf.rg) items.push({ rotulo: 'RG', valor: pf.rg })
  if (pf.rg_orgao_expedidor) items.push({ rotulo: 'Órgão Expedidor', valor: pf.rg_orgao_expedidor })
  if (pf.data_nascimento) items.push({ rotulo: 'Nascimento', valor: formatDate(pf.data_nascimento) })
  if (pf.titulo_eleitor) items.push({ rotulo: 'Título de Eleitor', valor: pf.titulo_eleitor, tipo: 'titulo_eleitor' })
  if (pf.doc_profissional_tipo && pf.doc_profissional_numero)
    items.push({ rotulo: pf.doc_profissional_tipo, valor: pf.doc_profissional_numero })
  if (pf.email) items.push({ rotulo: 'Email', valor: pf.email, tipo: 'email' })
  if (pf.telefone) items.push({ rotulo: 'Telefone', valor: pf.telefone, tipo: 'telefone' })

  for (const end of enderecos) {
    const tipoLabel = TIPO_ENDERECO_LABEL_CURTO[end.tipo] ?? end.descricao ?? 'Outro'
    const partes = [
      `${end.logradouro}${end.numero ? `, ${end.numero}` : ''}`,
      end.complemento,
      end.bairro,
      `${end.cidade}/${end.estado}`,
      end.cep ? `CEP ${end.cep}` : '',
    ].filter(Boolean)
    items.push({ rotulo: `Endereço ${tipoLabel}`, valor: partes.join(' – ') })
  }

  for (const ct of contatos) {
    const info = [ct.telefone, ct.email].filter(Boolean).join(' · ')
    if (info) items.push({ rotulo: `Contato: ${ct.nome}`, valor: info })
  }

  return (
    <div>
      {items.map((item, i) => (
        <div key={i}>
          {i > 0 && <Separator className="my-0.5" />}
          <CampoReadOnly rotulo={item.rotulo} valor={item.valor} tipo={item.tipo} />
        </div>
      ))}
    </div>
  )
}

// ---- BlocoVirtualCadastro ----

interface BlocoVirtualCadastroProps {
  tenantId: string
  client: Client
  enderecos: ClienteEndereco[]
  contatos: ClienteContato[]
  socios?: PFComVinculo[]
}

function BlocoVirtualCadastro({ tenantId, client, enderecos, contatos, socios = [] }: BlocoVirtualCadastroProps) {
  const isPJ = client.tipo === 'juridica' || !client.tipo

  type Item = { rotulo: string; valor: string; tipo?: FichaCampoTipo }
  const items: Item[] = []

  if (isPJ) {
    items.push({ rotulo: 'Razão Social', valor: client.razao_social })
    if (client.cnpj) items.push({ rotulo: 'CNPJ', valor: client.cnpj, tipo: 'cnpj' })
    if (client.fantasia) items.push({ rotulo: 'Nome Fantasia', valor: client.fantasia })
    if (client.inscricao_estadual) items.push({ rotulo: 'Insc. Estadual', valor: client.inscricao_estadual })
    if (client.inscricao_municipal) items.push({ rotulo: 'Insc. Municipal', valor: client.inscricao_municipal })
  } else {
    items.push({ rotulo: 'Nome', valor: client.razao_social })
    if (client.cpf) items.push({ rotulo: 'CPF', valor: client.cpf, tipo: 'cpf' })
    if (client.rg) items.push({ rotulo: 'RG', valor: client.rg })
    if (client.rg_orgao_expedidor) items.push({ rotulo: 'Órgão Expedidor', valor: client.rg_orgao_expedidor })
    if (client.data_nascimento) items.push({ rotulo: 'Nascimento', valor: formatDate(client.data_nascimento) })
    if (client.titulo_eleitor) items.push({ rotulo: 'Título de Eleitor', valor: client.titulo_eleitor, tipo: 'titulo_eleitor' })
    if (client.doc_profissional_tipo && client.doc_profissional_numero)
      items.push({ rotulo: client.doc_profissional_tipo, valor: client.doc_profissional_numero })
  }

  if (client.email) items.push({ rotulo: 'Email', valor: client.email, tipo: 'email' })
  if (client.telefone) items.push({ rotulo: 'Telefone', valor: client.telefone, tipo: 'telefone' })
  items.push({ rotulo: 'Regime', valor: client.regime })

  for (const end of enderecos) {
    const tipoLabel = TIPO_ENDERECO_LABEL_CURTO[end.tipo] ?? end.descricao ?? 'Outro'
    const partes = [
      `${end.logradouro}${end.numero ? `, ${end.numero}` : ''}`,
      end.complemento,
      end.bairro,
      `${end.cidade}/${end.estado}`,
      end.cep ? `CEP ${end.cep}` : '',
    ].filter(Boolean)
    items.push({ rotulo: `Endereço ${tipoLabel}`, valor: partes.join(' – ') })
  }

  for (const ct of contatos) {
    const info = [ct.telefone, ct.email].filter(Boolean).join(' · ')
    if (info) items.push({ rotulo: `Contato: ${ct.nome}`, valor: info })
  }

  return (
    <Card className="border-border/60 bg-muted/20">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center gap-2">
          <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <CardTitle className="text-sm text-muted-foreground flex-1">Dados Cadastrais</CardTitle>
          <Badge variant="outline" className="text-xs font-normal text-muted-foreground">automático</Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <div className="space-y-0">
          {items.map((item, i) => (
            <div key={i}>
              {i > 0 && <Separator className="my-0.5" />}
              <CampoReadOnly rotulo={item.rotulo} valor={item.valor} tipo={item.tipo} />
            </div>
          ))}
        </div>

        {socios.length > 0 && (
          <>
            <div className="flex items-center gap-2 mt-3 mb-1">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground shrink-0">Sócios / Administradores</span>
              <Separator className="flex-1" />
            </div>
            {socios.map((socio, gi) => (
              <div key={socio.id}>
                {gi > 0 && <Separator className="my-2" />}
                <SocioDataBlock tenantId={tenantId} socio={socio} />
              </div>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ---- ImportPreviewContent ----

function ImportPreviewContent({ preview }: { preview: BlocoImportado[] }) {
  return (
    <div className="space-y-3 py-2 max-h-80 overflow-y-auto">
      <p className="text-sm text-muted-foreground">
        Serão adicionados <strong>{preview.length}</strong> bloco(s) à ficha:
      </p>
      {preview.map((bloco, i) => (
        <div key={i} className="rounded-md border px-3 py-2 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">{bloco.titulo}</span>
            <Badge variant="secondary" className="text-xs">{bloco.campos.length} campo(s)</Badge>
          </div>
          <div className="space-y-0.5">
            {bloco.campos.map((c, j) => (
              <p key={j} className="text-xs text-muted-foreground truncate">
                <span className="font-medium text-foreground">{c.rotulo}:</span> {c.sensivel ? '••••••••' : c.valor}
              </p>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ---- FichaRapidaTab ----

interface FichaRapidaTabProps {
  tenantId: string
  clientId: string
  client: Client
  enderecos: ClienteEndereco[]
  contatos: ClienteContato[]
  socios?: PFComVinculo[]
}

export function FichaRapidaTab({ tenantId, clientId, client, enderecos, contatos, socios = [] }: FichaRapidaTabProps) {
  const { data: blocos = [], isLoading } = useFichaBlocos(tenantId, clientId)
  const { currentUser } = useAuth()
  const createBloco = useCreateFichaBloco()
  const createCampo = useCreateFichaCampo()
  const registrarLog = useRegistrarLogAtividade()
  const { toast } = useToast()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importDialog, setImportDialog] = useState(false)
  const [importPreview, setImportPreview] = useState<BlocoImportado[]>([])
  const [importando, setImportando] = useState(false)

  const logFicha = (descricao: string) =>
    registrarLog.mutate({
      tenantId,
      clientId,
      acao: 'ficha_rapida_alterada',
      descricao,
      usuarioId: currentUser?.id ?? 'desconhecido',
      usuarioNome: currentUser?.nome ?? 'Sistema',
    })

  const addBloco = () => {
    const novoBloco: FichaBloco = {
      id: uuidv4(),
      tenant_id: tenantId,
      client_id: clientId,
      titulo: 'Novo Bloco',
      ordem: blocos.length,
    }
    createBloco.mutate(novoBloco)
    logFicha('Novo bloco adicionado à ficha rápida')
  }

  const exportarFicha = async () => {
    const isPJ = client.tipo === 'juridica' || !client.tipo
    const dados: BlocoParaTxt[] = []

    // --- Seção automática: dados cadastrais do cliente ---
    const camposCadastro: BlocoParaTxt['campos'] = []
    if (isPJ) {
      camposCadastro.push({ rotulo: 'Razão Social', valor: client.razao_social })
      if (client.cnpj) camposCadastro.push({ rotulo: 'CNPJ', valor: client.cnpj })
      if (client.fantasia) camposCadastro.push({ rotulo: 'Nome Fantasia', valor: client.fantasia })
      if (client.inscricao_estadual) camposCadastro.push({ rotulo: 'Insc. Estadual', valor: client.inscricao_estadual })
      if (client.inscricao_municipal) camposCadastro.push({ rotulo: 'Insc. Municipal', valor: client.inscricao_municipal })
    } else {
      camposCadastro.push({ rotulo: 'Nome', valor: client.razao_social })
      if (client.cpf) camposCadastro.push({ rotulo: 'CPF', valor: client.cpf })
      if (client.rg) camposCadastro.push({ rotulo: 'RG', valor: client.rg })
      if (client.rg_orgao_expedidor) camposCadastro.push({ rotulo: 'Órgão Expedidor', valor: client.rg_orgao_expedidor })
      if (client.data_nascimento) camposCadastro.push({ rotulo: 'Nascimento', valor: formatDate(client.data_nascimento) })
      if (client.titulo_eleitor) camposCadastro.push({ rotulo: 'Título de Eleitor', valor: client.titulo_eleitor })
      if (client.doc_profissional_tipo && client.doc_profissional_numero)
        camposCadastro.push({ rotulo: client.doc_profissional_tipo, valor: client.doc_profissional_numero })
    }
    if (client.email) camposCadastro.push({ rotulo: 'Email', valor: client.email })
    if (client.telefone) camposCadastro.push({ rotulo: 'Telefone', valor: client.telefone })
    camposCadastro.push({ rotulo: 'Regime', valor: client.regime })

    for (const end of enderecos) {
      const tipoLabel = TIPO_ENDERECO_LABEL_CURTO[end.tipo] ?? end.descricao ?? 'Outro'
      const partes = [
        `${end.logradouro}${end.numero ? `, ${end.numero}` : ''}`,
        end.complemento, end.bairro,
        `${end.cidade}/${end.estado}`,
        end.cep ? `CEP ${end.cep}` : '',
      ].filter(Boolean)
      camposCadastro.push({ rotulo: `Endereço ${tipoLabel}`, valor: partes.join(' – ') })
    }
    for (const ct of contatos) {
      const info = [ct.telefone, ct.email].filter(Boolean).join(' · ')
      if (info) camposCadastro.push({ rotulo: `Contato: ${ct.nome}`, valor: info })
    }

    if (camposCadastro.length > 0)
      dados.push({ titulo: 'Dados Cadastrais', auto: true, campos: camposCadastro })

    // --- Seções automáticas: sócios vinculados ---
    for (const socio of socios) {
      const pf = socio.clientePF
      const papel = PAPEL_LABELS[socio.papel] ?? socio.papel
      const camposSocio: BlocoParaTxt['campos'] = []
      camposSocio.push({ rotulo: 'Papel', valor: papel })
      camposSocio.push({ rotulo: 'Nome', valor: pf.razao_social })
      if (pf.cpf) camposSocio.push({ rotulo: 'CPF', valor: pf.cpf })
      if (pf.rg) camposSocio.push({ rotulo: 'RG', valor: pf.rg })
      if (pf.rg_orgao_expedidor) camposSocio.push({ rotulo: 'Órgão Expedidor', valor: pf.rg_orgao_expedidor })
      if (pf.data_nascimento) camposSocio.push({ rotulo: 'Nascimento', valor: formatDate(pf.data_nascimento) })
      if (pf.titulo_eleitor) camposSocio.push({ rotulo: 'Título de Eleitor', valor: pf.titulo_eleitor })
      if (pf.doc_profissional_tipo && pf.doc_profissional_numero)
        camposSocio.push({ rotulo: pf.doc_profissional_tipo, valor: pf.doc_profissional_numero })
      if (pf.email) camposSocio.push({ rotulo: 'Email', valor: pf.email })
      if (pf.telefone) camposSocio.push({ rotulo: 'Telefone', valor: pf.telefone })

      const socioEnderecos = await clienteEnderecoRepo.findByCliente(tenantId, pf.id)
      for (const end of socioEnderecos) {
        const tipoLabel = TIPO_ENDERECO_LABEL_CURTO[end.tipo] ?? end.descricao ?? 'Outro'
        const partes = [
          `${end.logradouro}${end.numero ? `, ${end.numero}` : ''}`,
          end.complemento, end.bairro,
          `${end.cidade}/${end.estado}`,
          end.cep ? `CEP ${end.cep}` : '',
        ].filter(Boolean)
        camposSocio.push({ rotulo: `Endereço ${tipoLabel}`, valor: partes.join(' – ') })
      }
      const socioContatos = await clienteContatoRepo.findByCliente(tenantId, pf.id)
      for (const ct of socioContatos) {
        const info = [ct.telefone, ct.email].filter(Boolean).join(' · ')
        if (info) camposSocio.push({ rotulo: `Contato: ${ct.nome}`, valor: info })
      }

      dados.push({ titulo: `Sócio: ${pf.razao_social}`, auto: true, campos: camposSocio })
    }

    // --- Seções editáveis: blocos customizados ---
    const blocoRepo = new LocalFichaBlocoRepository()
    const campoRepo = new LocalFichaCampoRepository()
    const allBlocos = await blocoRepo.findByClient(tenantId, clientId)
    for (const bloco of allBlocos) {
      const campos = await campoRepo.findByBloco(tenantId, bloco.id)
      if (campos.length > 0)
        dados.push({ titulo: bloco.titulo, campos: campos.map((c) => ({ rotulo: c.rotulo, valor: c.valor })) })
    }

    if (dados.length === 0) {
      toast({ title: 'Nenhum dado para exportar', variant: 'destructive' })
      return
    }

    const txt = gerarTxt(dados)
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ficha_rapida.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const reader = new FileReader()
    reader.onload = (ev) => {
      const texto = ev.target?.result as string
      const parsed = parsearTxt(texto)
      if (parsed.length === 0) {
        toast({ title: 'Nenhuma seção encontrada no arquivo', variant: 'destructive' })
        return
      }
      setImportPreview(parsed)
      setImportDialog(true)
    }
    reader.readAsText(file, 'utf-8')
  }

  const confirmarImport = async () => {
    setImportando(true)
    try {
      let totalCampos = 0
      for (let i = 0; i < importPreview.length; i++) {
        const b = importPreview[i]
        const blocoId = uuidv4()
        await createBloco.mutateAsync({
          id: blocoId,
          tenant_id: tenantId,
          client_id: clientId,
          titulo: b.titulo,
          ordem: blocos.length + i,
        })
        for (let j = 0; j < b.campos.length; j++) {
          const c = b.campos[j]
          await createCampo.mutateAsync({
            id: uuidv4(),
            tenant_id: tenantId,
            bloco_id: blocoId,
            rotulo: c.rotulo,
            valor: c.valor,
            tipo: c.tipo,
            sensivel: c.sensivel,
            ordem: j,
          })
          totalCampos++
        }
      }
      logFicha(`Ficha importada: ${importPreview.length} bloco(s), ${totalCampos} campo(s)`)
      toast({ title: `Importação concluída: ${importPreview.length} bloco(s) adicionado(s)` })
      setImportDialog(false)
    } catch {
      toast({ title: 'Erro ao importar', variant: 'destructive' })
    } finally {
      setImportando(false)
    }
  }

  if (isLoading) return null

  const toolbarButtons = (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1">
        <Upload className="h-4 w-4" />
        Importar
      </Button>
      <Button variant="outline" size="sm" onClick={exportarFicha} className="gap-1">
        <Download className="h-4 w-4" />
        Exportar
      </Button>
      <Button variant="outline" size="sm" onClick={addBloco} className="gap-1">
        <Plus className="h-4 w-4" />
        Novo Bloco
      </Button>
      <input ref={fileInputRef} type="file" accept=".txt" className="hidden" onChange={handleFileChange} />
    </div>
  )

  const importDialogEl = (
    <Dialog open={importDialog} onOpenChange={setImportDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar Importação</DialogTitle>
        </DialogHeader>
        <ImportPreviewContent preview={importPreview} />
        <DialogFooter>
          <Button variant="outline" onClick={() => setImportDialog(false)}>Cancelar</Button>
          <Button onClick={confirmarImport} disabled={importando}>
            {importando ? 'Importando...' : 'Importar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  if (blocos.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">{toolbarButtons}</div>
        <BlocoVirtualCadastro tenantId={tenantId} client={client} enderecos={enderecos} contatos={contatos} socios={socios} />
        <EmptyState
          title="Nenhum bloco customizado"
          description="Adicione blocos para organizar senhas, códigos e dados de acesso deste cliente."
          action={
            <Button onClick={addBloco}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Bloco
            </Button>
          }
        />
        {importDialogEl}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">{toolbarButtons}</div>
      <div className="space-y-3">
        <BlocoVirtualCadastro tenantId={tenantId} client={client} enderecos={enderecos} contatos={contatos} socios={socios} />
        {blocos.map((bloco) => (
          <BlocoCard key={bloco.id} bloco={bloco} tenantId={tenantId} />
        ))}
      </div>
      {importDialogEl}
    </div>
  )
}
