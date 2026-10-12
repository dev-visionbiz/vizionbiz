import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { useClients } from '@/data/hooks/useClients'
import { Building2, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function SelecionarEmpresa() {
  const { currentUser, currentTenant, switchCliente } = useAuth()
  const navigate = useNavigate()
  const { data: allClients = [] } = useClients(currentTenant?.id ?? '')

  const empresas = allClients.filter(c =>
    currentUser?.clientes?.some(ac => ac.client_id === c.id)
  )

  function handleSelect(clientId: string) {
    switchCliente(clientId)
    navigate('/portal/inicio', { replace: true })
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold">Selecione a empresa</h1>
          <p className="text-sm text-muted-foreground">
            Seu acesso está vinculado a mais de uma empresa
          </p>
        </div>

        <div className="space-y-3">
          {empresas.map(empresa => (
            <Card
              key={empresa.id}
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => handleSelect(empresa.id)}
            >
              <CardContent className="flex items-center gap-4 py-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {empresa.fantasia ?? empresa.razao_social}
                  </p>
                  {empresa.fantasia && (
                    <p className="text-xs text-muted-foreground truncate">{empresa.razao_social}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">{empresa.regime}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-xs">
                    {empresa.tipo === 'juridica' ? 'PJ' : 'PF'}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
