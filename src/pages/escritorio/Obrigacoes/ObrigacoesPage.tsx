import { useSearchParams } from 'react-router-dom'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { CadastroObrigacoes } from './CadastroObrigacoes'
import { VinculoClienteObrigacao } from './VinculoClienteObrigacao'
import { GeracaoCompetencia } from './GeracaoCompetencia'
import { PainelEtapa } from './PainelEtapa'
import { PainelObrigacao } from './PainelObrigacao'
import { PainelConsulta } from './PainelConsulta'

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

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 sm:px-6 pt-5 pb-0 border-b">
        <h1 className="text-xl font-bold mb-4">Obrigações</h1>
        <Tabs value={tab} onValueChange={handleTabChange}>
          <div className="overflow-x-auto -mx-4 sm:-mx-6">
            <TabsList className="h-auto rounded-none bg-transparent p-0 space-x-0 w-max px-4 sm:px-6">
              {[
                { value: 'painel-etapa', label: 'Painel por Etapa' },
                { value: 'consulta',     label: 'Consulta' },
                { value: 'visao-geral',  label: 'Visão Geral' },
                { value: 'competencias', label: 'Competências' },
                { value: 'vinculos',     label: 'Vínculos' },
                { value: 'cadastro',     label: 'Obrigações' },
              ].map((t) => (
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

          <TabsContent value="cadastro" className="mt-0 pt-5">
            <CadastroObrigacoes />
          </TabsContent>
          <TabsContent value="vinculos" className="mt-0 pt-5">
            <VinculoClienteObrigacao />
          </TabsContent>
          <TabsContent value="competencias" className="mt-0 pt-5">
            <GeracaoCompetencia />
          </TabsContent>
          <TabsContent value="painel-etapa" className="mt-0 pt-5">
            <PainelEtapa />
          </TabsContent>
          <TabsContent value="consulta" className="mt-0 pt-5">
            <PainelConsulta />
          </TabsContent>
          <TabsContent value="visao-geral" className="mt-0 pt-5">
            <PainelObrigacao />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
