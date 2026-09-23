import { useSearchParams } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CadastroObrigacoes } from './CadastroObrigacoes'
import { VinculoClienteObrigacao } from './VinculoClienteObrigacao'
import { GeracaoCompetencia } from './GeracaoCompetencia'
import { PainelEtapa } from './PainelEtapa'
import { PainelObrigacao } from './PainelObrigacao'
import { PainelConsulta } from './PainelConsulta'

const TABS = [
  { value: 'painel-etapa', label: 'Painel por Etapa' },
  { value: 'consulta',     label: 'Consulta' },
  { value: 'visao-geral',  label: 'Visão Geral' },
  { value: 'competencias', label: 'Competências' },
  { value: 'vinculos',     label: 'Vínculos' },
  { value: 'cadastro',     label: 'Obrigações' },
]

export default function ObrigacoesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') ?? 'painel-etapa'

  function handleTabChange(newTab: string) {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev)
      p.set('tab', newTab)
      return p
    })
  }

  const tabLabel = TABS.find((t) => t.value === tab)?.label ?? 'Painel por Etapa'

  return (
    <div className="flex flex-col h-full">
      <Tabs value={tab} onValueChange={handleTabChange} className="flex flex-col h-full">

        {/* ── Cabeçalho com nav ── */}
        <div className="shrink-0 border-b">

          {/* Mobile: título-dropdown compacto (app bar já mostra "Obrigações") */}
          <div className="md:hidden flex items-center px-4 py-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 text-lg font-bold focus:outline-none">
                  {tabLabel}
                  <ChevronDown className="h-4 w-4 text-muted-foreground mt-0.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[180px]">
                {TABS.map((t) => (
                  <DropdownMenuItem
                    key={t.value}
                    onClick={() => handleTabChange(t.value)}
                    className={tab === t.value ? 'font-semibold' : ''}
                  >
                    {t.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Desktop: título + abas */}
          <div className="hidden md:block px-6 pt-5">
            <h1 className="text-xl font-bold mb-3">Obrigações</h1>
            <div className="overflow-x-auto -mx-6">
              <TabsList className="h-auto rounded-none bg-transparent p-0 space-x-0 w-max px-6">
                {TABS.map((t) => (
                  <TabsTrigger
                    key={t.value}
                    value={t.value}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm whitespace-nowrap shrink-0"
                  >
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </div>
        </div>

        {/* ── Conteúdo ── */}
        <div className="flex-1 overflow-auto">
          <TabsContent value="painel-etapa" className="mt-0 pt-4">
            <PainelEtapa />
          </TabsContent>
          <TabsContent value="consulta" className="mt-0">
            <PainelConsulta />
          </TabsContent>
          <TabsContent value="visao-geral" className="mt-0 pt-4">
            <PainelObrigacao />
          </TabsContent>
          <TabsContent value="competencias" className="mt-0 pt-4">
            <GeracaoCompetencia />
          </TabsContent>
          <TabsContent value="vinculos" className="mt-0 pt-4">
            <VinculoClienteObrigacao />
          </TabsContent>
          <TabsContent value="cadastro" className="mt-0 pt-4">
            <CadastroObrigacoes />
          </TabsContent>
        </div>

      </Tabs>
    </div>
  )
}
