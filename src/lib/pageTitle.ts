type Rule = { test: (p: string) => boolean; title: string }

const RULES: Rule[] = [
  { test: p => /^\/escritorio\/clientes\/.+/.test(p),    title: 'Ficha do Cliente' },
  { test: p => p.startsWith('/escritorio/clientes'),      title: 'Clientes' },
  { test: p => p.startsWith('/escritorio/dashboard'),     title: 'Dashboard' },
  { test: p => p.startsWith('/escritorio/documentos'),    title: 'Documentos' },
  { test: p => p.startsWith('/escritorio/financeiro'),    title: 'Financeiro' },
  { test: p => /^\/escritorio\/grupos\/.+/.test(p),       title: 'Ficha do Grupo' },
  { test: p => p.startsWith('/escritorio/grupos'),        title: 'Grupos' },
  { test: p => p.startsWith('/escritorio/obrigacoes'),    title: 'Obrigações' },
  { test: p => p.startsWith('/escritorio/tarefas'),       title: 'Tarefas' },
  { test: p => p.startsWith('/escritorio/ocorrencias'),   title: 'Ocorrências' },
  { test: p => p.startsWith('/escritorio/rotinas'),       title: 'Rotinas' },
  { test: p => p.startsWith('/escritorio/fluxos'),        title: 'Modelo de Fluxos' },
  { test: p => p.startsWith('/escritorio/pesquisas'),     title: 'Formulários Livres' },
  { test: p => p.startsWith('/escritorio/guias'),         title: 'Guias' },
  { test: p => p.startsWith('/escritorio/demandas'),      title: 'Demandas' },
  { test: p => p.startsWith('/escritorio/apps'),          title: 'Conexões' },
  { test: p => p.startsWith('/escritorio/configuracoes'), title: 'Configurações' },
  { test: p => p.startsWith('/portal/inicio'),            title: 'Início' },
  { test: p => p.startsWith('/portal/cadastro'),          title: 'Dados Cadastrais' },
  { test: p => p.startsWith('/portal/documentos'),        title: 'Documentos' },
  { test: p => p.startsWith('/portal/financeiro'),        title: 'Financeiro' },
  { test: p => p.startsWith('/portal/equipe'),            title: 'Equipe' },
  { test: p => p.startsWith('/portal/apps'),              title: 'Conexões' },
  { test: p => p.startsWith('/portal/certificados'),      title: 'Certificados Digitais' },
]

export function getPageTitle(pathname: string): string {
  return RULES.find(r => r.test(pathname))?.title ?? 'VisionBiz'
}
