import { useState, useRef } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import {
  Building2,
  CreditCard,
  Palette,
  FileText,
  Users,
  Briefcase,
  LayoutList,
  HardDrive,
} from 'lucide-react'
import DadosEscritorio from './DadosEscritorio'
import PoliticaCobranca from './PoliticaCobranca'
import Branding from './Branding'
import TiposDocumento from './TiposDocumento'
import Usuarios from './Usuarios'
import Servicos from './Servicos'
import Planos from './Planos'
import Armazenamento from './Armazenamento'

const sections = [
  {
    value: 'escritorio',
    icon: Building2,
    title: 'Escritório',
    description: 'Identificação, contato, endereço e contador responsável',
    content: <DadosEscritorio />,
  },
  {
    value: 'politica',
    icon: CreditCard,
    title: 'Cobrança',
    description: 'Encargos por atraso, renegociação e controle de acesso',
    content: <PoliticaCobranca />,
  },
  {
    value: 'branding',
    icon: Palette,
    title: 'Branding',
    description: 'Logo, cor primária e identidade visual do portal',
    content: <Branding />,
  },
  {
    value: 'tipos',
    icon: FileText,
    title: 'Tipos de Documento',
    description: 'Categorias e configurações dos documentos aceitos',
    content: <TiposDocumento />,
  },
  {
    value: 'usuarios',
    icon: Users,
    title: 'Usuários',
    description: 'Colaboradores e acessos ao sistema',
    content: <Usuarios />,
  },
  {
    value: 'servicos',
    icon: Briefcase,
    title: 'Serviços',
    description: 'Catálogo de serviços oferecidos pelo escritório',
    content: <Servicos />,
  },
  {
    value: 'planos',
    icon: LayoutList,
    title: 'Planos',
    description: 'Pacotes de serviços para contratos',
    content: <Planos />,
  },
  {
    value: 'armazenamento',
    icon: HardDrive,
    title: 'Armazenamento',
    description: 'Provedor de arquivos: VizionBiz Padrão, Google Drive e outros',
    content: <Armazenamento />,
  },
]

export default function Configuracoes() {
  const { currentUser, isLoading } = useAuth()

  const [openValue, setOpenValue] = useState<string>('')
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({})

  if (isLoading) return <PageLoader />

  if (currentUser?.papel !== 'escritorio_admin') {
    return <Navigate to="/escritorio/dashboard" replace />
  }

  const handleValueChange = (value: string) => {
    setOpenValue(value)
    if (value && itemRefs.current[value]) {
      setTimeout(() => {
        itemRefs.current[value]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 50)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground text-sm">Gerencie as configurações do escritório.</p>
      </div>

      <Accordion type="single" collapsible value={openValue} onValueChange={handleValueChange} className="space-y-3">
        {sections.map(({ value, icon: Icon, title, description, content }) => (
          <div key={value} ref={(el) => { itemRefs.current[value] = el }}>
            <AccordionItem value={value} className="border rounded-lg bg-card">
              <AccordionTrigger className="rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                    <Icon className="size-4" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm">{title}</p>
                    <p className="text-xs text-muted-foreground font-normal">{description}</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>{content}</AccordionContent>
            </AccordionItem>
          </div>
        ))}
      </Accordion>
    </div>
  )
}
