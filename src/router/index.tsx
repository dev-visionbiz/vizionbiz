import React, { Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/shared/AppLayout'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { ProtectedRoute } from '@/auth/ProtectedRoute'
import { EscritorioRoute } from '@/auth/EscritorioRoute'
import { PortalEmpresaGuard } from '@/auth/PortalEmpresaGuard'
import { AdminLayout } from '@/pages/admin/AdminLayout'

// Lazy-loaded pages
const Login = React.lazy(() => import('@/pages/Login'))
const Dashboard = React.lazy(() => import('@/pages/escritorio/Dashboard'))
const Configuracoes = React.lazy(() => import('@/pages/escritorio/Configuracoes'))
const ClientesLista = React.lazy(() => import('@/pages/escritorio/Clientes/ClientesLista'))
const ClienteFicha = React.lazy(() => import('@/pages/escritorio/Clientes/ClienteFicha'))
const FinanceiroPage = React.lazy(() => import('@/pages/escritorio/Financeiro/FinanceiroPage'))
const DocumentosPage = React.lazy(() => import('@/pages/escritorio/Documentos/DocumentosPage'))
const GrupoFicha = React.lazy(() => import('@/pages/escritorio/Grupos/GrupoFicha'))
const TarefasPage = React.lazy(() => import('@/pages/escritorio/Tarefas/TarefasPage'))
const OcorrenciasPage = React.lazy(() => import('@/pages/escritorio/Ocorrencias/OcorrenciasPage'))
const RotinasPage = React.lazy(() => import('@/pages/escritorio/Rotinas/RotinasPage'))
const FluxosPage = React.lazy(() => import('@/pages/escritorio/Fluxos/FluxosPage'))
const GuiasPage = React.lazy(() => import('@/pages/escritorio/Guias/GuiasPage'))
const PortalInicio = React.lazy(() => import('@/pages/cliente/PortalInicio'))
const PortalDocumentos = React.lazy(() => import('@/pages/cliente/PortalDocumentos'))
const PortalFinanceiro = React.lazy(() => import('@/pages/cliente/PortalFinanceiro'))
const PortalEquipe = React.lazy(() => import('@/pages/cliente/PortalEquipe'))
const PortalGuias = React.lazy(() => import('@/pages/cliente/PortalGuias'))
const ShareDocumentoPage = React.lazy(() => import('@/pages/share/ShareDocumentoPage'))
const FormularioAbertura = React.lazy(() => import('@/pages/public/FormularioAbertura'))
const FormularioDinamico = React.lazy(() => import('@/pages/public/FormularioDinamico'))
const PesquisaPublica    = React.lazy(() => import('@/pages/public/PesquisaPublica'))
const PesquisasPage      = React.lazy(() => import('@/pages/escritorio/Pesquisas/PesquisasPage'))
const PortalCadastro = React.lazy(() => import('@/pages/cliente/PortalCadastro'))
const PortalSolicitacoes = React.lazy(() => import('@/pages/cliente/PortalSolicitacoes'))
const PortalNegociacao = React.lazy(() => import('@/pages/cliente/PortalNegociacao'))
const PortalPesquisas = React.lazy(() => import('@/pages/cliente/PortalPesquisas'))
const PortalApps = React.lazy(() => import('@/pages/cliente/PortalApps'))
const PortalCertificados = React.lazy(() => import('@/pages/cliente/PortalCertificados'))
const SelecionarEmpresa = React.lazy(() => import('@/pages/cliente/SelecionarEmpresa'))
const AdminTenantsList = React.lazy(() => import('@/pages/admin/Tenants/TenantsList'))
const AdminTenantDetail = React.lazy(() => import('@/pages/admin/Tenants/TenantDetail'))
const AdminComissoes = React.lazy(() =>
  import('@/pages/admin/Comissoes/ComissoesPage').then((m) => ({ default: m.ComissoesPage }))
)
const AdminCatalogo = React.lazy(() =>
  import('@/pages/admin/Catalogo/CatalogoPage').then((m) => ({ default: m.CatalogoPage }))
)
const AdminExtensor = React.lazy(() =>
  import('@/pages/admin/Catalogo/ExtensorPage').then((m) => ({ default: m.ExtensorPage }))
)
const AppStorePage = React.lazy(() =>
  import('@/pages/escritorio/AppStore/AppStorePage').then((m) => ({ default: m.AppStorePage }))
)
const AppStoreLoja = React.lazy(() =>
  import('@/pages/loja/AppStoreLoja').then((m) => ({ default: m.AppStoreLoja }))
)
const AppLandingPage = React.lazy(() =>
  import('@/pages/loja/AppLandingPage').then((m) => ({ default: m.AppLandingPage }))
)
const DocsPage = React.lazy(() =>
  import('@/pages/docs/DocsPage').then((m) => ({ default: m.DocsPage }))
)

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: <Lazy><Login /></Lazy>,
  },
  {
    path: '/docs',
    element: <Lazy><DocsPage /></Lazy>,
  },
  {
    path: '/loja',
    element: <Lazy><AppStoreLoja /></Lazy>,
  },
  {
    path: '/loja/:slug',
    element: <Lazy><AppLandingPage /></Lazy>,
  },
  {
    path: '/share/:token',
    element: <Lazy><ShareDocumentoPage /></Lazy>,
  },
  {
    path: '/formulario/:token',
    element: <Lazy><FormularioAbertura /></Lazy>,
  },
  {
    path: '/formulario-dados/:token',
    element: <Lazy><FormularioDinamico /></Lazy>,
  },
  {
    path: '/pesquisa/:id',
    element: <Lazy><PesquisaPublica /></Lazy>,
  },
  {
    path: '/escritorio',
    element: <ProtectedRoute roles={['escritorio_admin', 'escritorio_colaborador']} />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard', element: <Lazy><Dashboard /></Lazy> },
          {
            path: 'clientes',
            element: <EscritorioRoute modulo="clientes"><Lazy><ClientesLista /></Lazy></EscritorioRoute>,
          },
          {
            path: 'clientes/:id',
            element: <EscritorioRoute modulo="clientes"><Lazy><ClienteFicha /></Lazy></EscritorioRoute>,
          },
          {
            path: 'documentos',
            element: <EscritorioRoute modulo="documentos"><Lazy><DocumentosPage /></Lazy></EscritorioRoute>,
          },
          {
            path: 'financeiro',
            element: <EscritorioRoute modulo="financeiro"><Lazy><FinanceiroPage /></Lazy></EscritorioRoute>,
          },
          {
            path: 'grupos/:id',
            element: <EscritorioRoute modulo="grupos"><Lazy><GrupoFicha /></Lazy></EscritorioRoute>,
          },
          {
            path: 'tarefas',
            element: <EscritorioRoute modulo="tarefas"><Lazy><TarefasPage /></Lazy></EscritorioRoute>,
          },
          {
            path: 'ocorrencias',
            element: <EscritorioRoute modulo="tarefas"><Lazy><OcorrenciasPage /></Lazy></EscritorioRoute>,
          },
          {
            path: 'rotinas',
            element: <EscritorioRoute modulo="tarefas"><Lazy><RotinasPage /></Lazy></EscritorioRoute>,
          },
          {
            path: 'fluxos',
            element: <EscritorioRoute modulo="tarefas"><Lazy><FluxosPage /></Lazy></EscritorioRoute>,
          },
          {
            path: 'pesquisas',
            element: <EscritorioRoute modulo="tarefas"><Lazy><PesquisasPage /></Lazy></EscritorioRoute>,
          },
          {
            path: 'guias',
            element: <EscritorioRoute modulo="financeiro"><Lazy><GuiasPage /></Lazy></EscritorioRoute>,
          },
          { path: 'obrigacoes', element: <Navigate to="/escritorio/rotinas" replace /> },
          { path: 'demandas', element: <Navigate to="/escritorio/ocorrencias" replace /> },
          { path: 'apps', element: <Lazy><AppStorePage /></Lazy> },
          { path: 'configuracoes', element: <Lazy><Configuracoes /></Lazy> },
          { path: 'configuracoes/*', element: <Lazy><Configuracoes /></Lazy> },
        ],
      },
    ],
  },
  {
    path: '/admin',
    element: <ProtectedRoute roles={['visionbiz_admin']} />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <Navigate to="tenants" replace /> },
          { path: 'tenants', element: <Lazy><AdminTenantsList /></Lazy> },
          { path: 'tenants/:id', element: <Lazy><AdminTenantDetail /></Lazy> },
          { path: 'comissoes', element: <Lazy><AdminComissoes /></Lazy> },
          { path: 'catalogo', element: <Lazy><AdminCatalogo /></Lazy> },
          { path: 'catalogo/novo', element: <Lazy><AdminExtensor /></Lazy> },
          { path: 'catalogo/:id', element: <Lazy><AdminExtensor /></Lazy> },
        ],
      },
    ],
  },
  {
    path: '/portal',
    element: <ProtectedRoute roles={['cliente']} />,
    children: [
      {
        element: <PortalEmpresaGuard />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { index: true, element: <Navigate to="inicio" replace /> },
              { path: 'selecionar-empresa', element: <Lazy><SelecionarEmpresa /></Lazy> },
              { path: 'inicio', element: <Lazy><PortalInicio /></Lazy> },
              { path: 'cadastro', element: <Lazy><PortalCadastro /></Lazy> },
              { path: 'documentos', element: <Lazy><PortalDocumentos /></Lazy> },
              { path: 'financeiro', element: <Lazy><PortalFinanceiro /></Lazy> },
              { path: 'negociacao', element: <Lazy><PortalNegociacao /></Lazy> },
              { path: 'equipe', element: <Lazy><PortalEquipe /></Lazy> },
              { path: 'guias', element: <Lazy><PortalGuias /></Lazy> },
              { path: 'solicitacoes', element: <Lazy><PortalSolicitacoes /></Lazy> },
              { path: 'pesquisas', element: <Lazy><PortalPesquisas /></Lazy> },
              { path: 'apps', element: <Lazy><PortalApps /></Lazy> },
              { path: 'certificados', element: <Lazy><PortalCertificados /></Lazy> },
            ],
          },
        ],
      },
    ],
  },
])
