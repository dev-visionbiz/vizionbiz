import { useNavigate } from 'react-router-dom'
import { Layers, ExternalLink, X, ChevronUp, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useTarefaAtiva } from '@/context/TarefaAtivaContext'

export function TarefaAtivaFloat() {
  const { tarefaAtiva, visivel, desativar, minimizar, reabrir } = useTarefaAtiva()
  const [expandido, setExpandido] = useState(true)
  const navigate = useNavigate()

  if (!tarefaAtiva) return null

  function irParaOcorrencia() {
    navigate(`/escritorio/ocorrencias?id=${tarefaAtiva!.ocorrenciaId}`)
  }

  // Minimized: small pill in corner
  if (!visivel) {
    return (
      <button
        onClick={reabrir}
        title={`Em andamento: ${tarefaAtiva.titulo}`}
        className="fixed bottom-20 left-4 lg:bottom-4 z-50 flex items-center gap-1.5 bg-primary text-primary-foreground rounded-full px-3 py-1.5 text-xs font-medium shadow-lg hover:bg-primary/90 transition-colors"
      >
        <Layers className="h-3.5 w-3.5 shrink-0" />
        <span className="max-w-32 truncate">{tarefaAtiva.titulo}</span>
      </button>
    )
  }

  return (
    <div className="fixed bottom-20 left-4 lg:bottom-4 z-50 w-64 bg-card border rounded-xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-primary/10 border-b">
        <div className="flex items-center gap-1.5 min-w-0">
          <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-xs font-semibold text-primary">Em andamento</span>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => setExpandido(e => !e)}
            className="p-1 rounded hover:bg-primary/20 text-primary transition-colors"
            title={expandido ? 'Recolher' : 'Expandir'}
          >
            {expandido ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={minimizar}
            className="p-1 rounded hover:bg-primary/20 text-primary transition-colors"
            title="Minimizar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {expandido && (
        <div className="px-3 py-2.5 space-y-2">
          <div className="min-w-0">
            <p className="text-sm font-medium leading-tight line-clamp-2">{tarefaAtiva.titulo}</p>
            {tarefaAtiva.clienteNome && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{tarefaAtiva.clienteNome}</p>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={irParaOcorrencia}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5',
                'bg-primary text-primary-foreground text-xs font-medium',
                'hover:bg-primary/90 transition-colors',
              )}
            >
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              Voltar à ocorrência
            </button>
            <button
              onClick={desativar}
              className="px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              title="Encerrar acompanhamento"
            >
              Encerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
