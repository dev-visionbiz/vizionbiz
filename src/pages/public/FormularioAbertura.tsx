import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { processoAberturaRepo, processoAlteracaoRepo } from '@/data/repositories/localStorage'
import { LocalClientRepository } from '@/data/repositories/localStorage'
import { LocalPessoaRepository, LocalEmpresaPessoaRepository } from '@/data/repositories/localStorage'
import { LocalClienteEnderecoRepository } from '@/data/repositories/localStorage'
import { LocalTenantRepository } from '@/data/repositories/localStorage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { CheckCircle2, Loader2, Save, Send } from 'lucide-react'
import type {
  Client, Pessoa, ClienteEndereco, Tenant,
} from '@/domain/types'
import {
  CAMPOS_CONFIG, SECAO_LABELS, camposPorSecao,
  preencherFormulario, extrairDeltas, calcularProgresso,
  type SecaoFormulario,
} from '@/lib/formularioAbertura'
import { v4 as uuidv4 } from 'uuid'

const clientRepo = new LocalClientRepository()
const pessoaRepo = new LocalPessoaRepository()
const empPessoaRepo = new LocalEmpresaPessoaRepository()
const enderecoRepo = new LocalClienteEnderecoRepository()
const tenantRepo = new LocalTenantRepository()

type Estado = 'carregando' | 'nao_encontrado' | 'ja_transmitido' | 'formulario' | 'sucesso'
type TipoProcesso = 'abertura' | 'alteracao'

export default function FormularioAbertura() {
  const { token } = useParams<{ token: string }>()

  const [estado, setEstado] = useState<Estado>('carregando')
  const [tipoProcesso, setTipoProcesso] = useState<TipoProcesso>('abertura')
  const [processoId, setProcessoId] = useState<string>('')
  const [campos, setCampos] = useState<string[]>([])
  const [client, setClient] = useState<Client | null>(null)
  const [socio, setSocio] = useState<Pessoa | null>(null)
  const [endereco, setEndereco] = useState<ClienteEndereco | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [valores, setValores] = useState<Record<string, string>>({})
  const [salvandoParcial, setSalvandoParcial] = useState(false)
  const [transmitindo, setTransmitindo] = useState(false)
  const [salvoParcialEm, setSalvoParcialEm] = useState<string | null>(null)

  useEffect(() => {
    if (!token) { setEstado('nao_encontrado'); return }

    async function carregar() {
      // Check abertura first, then alteracao
      let proc = await processoAberturaRepo.findByToken(token!)
      let tipo: TipoProcesso = 'abertura'

      if (!proc) {
        const altProc = await processoAlteracaoRepo.findByToken(token!)
        if (altProc) {
          proc = altProc as unknown as typeof proc
          tipo = 'alteracao'
        }
      }

      if (!proc) { setEstado('nao_encontrado'); return }
      if (proc.formulario_status === 'preenchido') { setEstado('ja_transmitido'); return }

      const cl = await clientRepo.findById(proc.client_id)
      if (!cl) { setEstado('nao_encontrado'); return }

      const camposlista = proc.formulario_campos ?? []

      let pessoaPrincipal: Pessoa | null = null
      if (camposlista.some((k) => k.startsWith('socio.'))) {
        const vinculos = await empPessoaRepo.findByEmpresa(cl.tenant_id, cl.id)
        const principal = vinculos.find((v) => v.principal) ?? vinculos[0]
        if (principal) {
          pessoaPrincipal = await pessoaRepo.findById(principal.pessoa_id)
        }
      }

      let enderecoPrincipal: ClienteEndereco | null = null
      if (camposlista.some((k) => k.startsWith('endereco.'))) {
        const enderecos = await enderecoRepo.findByCliente(cl.tenant_id, cl.id)
        enderecoPrincipal = enderecos.find((e) => e.tipo === 'fiscal' && e.principal)
          ?? enderecos.find((e) => e.tipo === 'fiscal')
          ?? enderecos[0]
          ?? null
      }

      const t = await tenantRepo.findById(cl.tenant_id)
      const preenchidos = preencherFormulario(camposlista, cl, pessoaPrincipal, enderecoPrincipal)

      setTipoProcesso(tipo)
      setProcessoId(proc.id)
      setCampos(camposlista)
      setClient(cl)
      setSocio(pessoaPrincipal)
      setEndereco(enderecoPrincipal)
      setTenant(t)
      setValores(preenchidos)
      setEstado('formulario')
    }

    carregar()
  }, [token])

  const porSecao = camposPorSecao(campos)
  const { preenchidos, total } = calcularProgresso(valores, campos)
  const pct = total > 0 ? Math.round((preenchidos / total) * 100) : 0

  const set = (key: string, value: string) => {
    setValores((v) => ({ ...v, [key]: value }))
    setSalvoParcialEm(null)
  }

  async function persistirDados() {
    if (!processoId || !client) return {}
    const { clientDelta, socioDelta, enderecoDelta } = extrairDeltas(valores, campos)
    let novaSocio: Pessoa | undefined
    let novoEndereco: ClienteEndereco | undefined

    if (Object.keys(clientDelta).length > 0) {
      await clientRepo.update(client.id, clientDelta)
    }

    const temCamposSocio = campos.some((k) => k.startsWith('socio.'))
    if (temCamposSocio && Object.keys(socioDelta).length > 0) {
      if (socio) {
        await pessoaRepo.update(socio.id, socioDelta)
      } else {
        novaSocio = {
          id: uuidv4(), tenant_id: client.tenant_id, tipo: 'fisica',
          nome: socioDelta.nome ?? 'Sócio', ...socioDelta,
        }
        await pessoaRepo.create(novaSocio)
        await empPessoaRepo.create({
          id: uuidv4(), tenant_id: client.tenant_id, empresa_id: client.id,
          pessoa_id: novaSocio.id, papel: 'socio', principal: true,
        })
      }
    }

    const temCamposEndereco = campos.some((k) => k.startsWith('endereco.'))
    if (temCamposEndereco && Object.keys(enderecoDelta).length > 0) {
      if (endereco) {
        await enderecoRepo.update(endereco.id, enderecoDelta)
      } else {
        novoEndereco = {
          id: uuidv4(), tenant_id: client.tenant_id, cliente_id: client.id,
          tipo: 'fiscal', principal: true,
          cep: enderecoDelta.cep ?? '', logradouro: enderecoDelta.logradouro ?? '',
          numero: enderecoDelta.numero ?? '', complemento: enderecoDelta.complemento,
          bairro: enderecoDelta.bairro ?? '', cidade: enderecoDelta.cidade ?? '',
          estado: enderecoDelta.estado ?? '', ...enderecoDelta,
        }
        await enderecoRepo.create(novoEndereco)
      }
    }

    return { novaSocio, novoEndereco }
  }

  async function marcarStatus(status: 'enviado' | 'preenchido', extra?: Record<string, unknown>) {
    const delta = {
      formulario_status: status,
      atualizado_em: new Date().toISOString(),
      ...(status === 'preenchido' ? { formulario_preenchido_em: new Date().toISOString() } : {}),
      ...extra,
    }
    if (tipoProcesso === 'abertura') {
      await processoAberturaRepo.update(processoId, delta)
    } else {
      await processoAlteracaoRepo.update(processoId, delta)
    }
  }

  const handleSalvar = async () => {
    if (!processoId || !client) return
    setSalvandoParcial(true)
    try {
      const { novaSocio, novoEndereco } = await persistirDados()
      if (novaSocio) setSocio(novaSocio)
      if (novoEndereco) setEndereco(novoEndereco)
      await marcarStatus('enviado')
      setSalvoParcialEm(
        new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      )
    } catch (err) {
      console.error(err)
    } finally {
      setSalvandoParcial(false)
    }
  }

  const handleTransmitir = async () => {
    if (!processoId || !client) return
    setTransmitindo(true)
    try {
      const { novaSocio, novoEndereco } = await persistirDados()
      if (novaSocio) setSocio(novaSocio)
      if (novoEndereco) setEndereco(novoEndereco)
      await marcarStatus('preenchido')
      setEstado('sucesso')
    } catch (err) {
      console.error(err)
    } finally {
      setTransmitindo(false)
    }
  }

  // ── Renders ────────────────────────────────────────────────────────────────

  if (estado === 'carregando') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (estado === 'nao_encontrado') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold">Link inválido ou expirado</p>
          <p className="text-sm text-muted-foreground">Entre em contato com o escritório contábil.</p>
        </div>
      </div>
    )
  }

  if (estado === 'ja_transmitido') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
          <p className="text-lg font-semibold">Formulário já transmitido</p>
          <p className="text-sm text-muted-foreground">
            Suas informações já foram enviadas ao escritório. Obrigado!
          </p>
          <p className="text-xs text-muted-foreground">
            Se precisar fazer alguma correção, entre em contato diretamente com o escritório.
          </p>
        </div>
      </div>
    )
  }

  if (estado === 'sucesso') {
    const titulo = tipoProcesso === 'abertura' ? 'Informações transmitidas!' : 'Atualização enviada!'
    const mensagem = tipoProcesso === 'abertura'
      ? 'dará continuidade ao processo de abertura'
      : 'irá processar a atualização do seu cadastro'
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto" />
          <h1 className="text-xl font-bold">{titulo}</h1>
          <p className="text-sm text-muted-foreground">
            {tenant ? (
              <>O escritório <strong>{tenant.nome}</strong> recebeu seus dados e {mensagem}.</>
            ) : (
              `Seus dados foram recebidos. O escritório ${mensagem}.`
            )}
          </p>
        </div>
      </div>
    )
  }

  const tituloForm = tipoProcesso === 'abertura'
    ? 'Cadastro para Abertura de Empresa'
    : 'Atualização de Cadastro'
  const subtituloForm = tipoProcesso === 'abertura'
    ? 'Preencha os campos abaixo para darmos andamento ao seu processo.'
    : 'Confirme e complete as informações que precisam ser atualizadas.'

  const secoes = (['empresa', 'socio', 'endereco'] as SecaoFormulario[]).filter(
    (s) => porSecao[s].length > 0
  )
  const ocupado = salvandoParcial || transmitindo

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-background border-b px-4 py-4">
        <div className="max-w-xl mx-auto">
          {tenant && (
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{tenant.nome}</p>
          )}
          <h1 className="text-lg font-bold">{tituloForm}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {client?.razao_social && (
              <span>Empresa: <strong>{client.razao_social}</strong> · </span>
            )}
            {subtituloForm}
          </p>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="bg-background border-b px-4 py-2">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>{preenchidos} de {total} campo(s) preenchido(s)</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Formulário */}
      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        {secoes.map((secao) => (
          <div key={secao} className="bg-background rounded-xl border p-5 space-y-4">
            <h2 className="font-semibold text-base">{SECAO_LABELS[secao]}</h2>
            {porSecao[secao].map((campo) => {
              const val = valores[campo.key] ?? ''
              const jaPreenchido = val !== ''
              return (
                <div key={campo.key} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={campo.key} className="text-sm">
                      {campo.label}
                      {campo.obrigatorio && <span className="text-destructive ml-0.5">*</span>}
                    </Label>
                    {jaPreenchido && (
                      <Badge className="bg-green-100 text-green-700 border-transparent text-xs py-0 h-4">
                        preenchido
                      </Badge>
                    )}
                  </div>

                  {campo.tipo === 'select' ? (
                    <Select value={val || '__none__'} onValueChange={(v) => set(campo.key, v === '__none__' ? '' : v)}>
                      <SelectTrigger id={campo.key}>
                        <SelectValue placeholder="Selecionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Selecionar...</SelectItem>
                        {campo.opcoes?.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={campo.key}
                      type={campo.tipo === 'date' ? 'date' : campo.tipo === 'email' ? 'email' : 'text'}
                      value={val}
                      onChange={(e) => set(campo.key, e.target.value)}
                      placeholder={
                        campo.tipo === 'cpf' ? '000.000.000-00' :
                        campo.tipo === 'cep' ? '00000-000' :
                        campo.tipo === 'tel' ? '(11) 99999-0000' :
                        undefined
                      }
                      className={jaPreenchido ? 'bg-green-50/50' : ''}
                    />
                  )}
                </div>
              )
            })}
          </div>
        ))}

        {/* Botões */}
        <div className="pb-8 space-y-3">
          {salvoParcialEm && (
            <p className="text-xs text-center text-green-600 font-medium">
              Rascunho salvo às {salvoParcialEm} — você pode continuar editando ou transmitir quando estiver pronto.
            </p>
          )}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" size="lg" onClick={handleSalvar} disabled={ocupado}>
              {salvandoParcial
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</>
                : <><Save className="h-4 w-4 mr-2" /> Salvar</>
              }
            </Button>
            <Button className="flex-1" size="lg" onClick={handleTransmitir} disabled={ocupado}>
              {transmitindo
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</>
                : <><Send className="h-4 w-4 mr-2" /> Transmitir</>
              }
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            <strong>Salvar</strong> guarda o rascunho — você pode voltar depois para completar.
            <strong> Transmitir</strong> envia definitivamente ao escritório.
          </p>
        </div>
      </div>
    </div>
  )
}
