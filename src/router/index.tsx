import React, { Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/shared/AppLayout'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { ProtectedRoute } from '@/auth/ProtectedRoute'
import { EscritorioRoute } from '@/auth/EscritorioRoute'

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
const PortalCadastro = React.lazy(() => import('@/pages/cliente/PortalCadastro'))

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
    path: '/share/:token',
    element: <Lazy><ShareDocumentoPage /></Lazy>,
  },
  {
    path: '/formulario/:token',
    element: <Lazy><FormularioAbertura /></Lazy>,
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
            path: 'guias',
            element: <EscritorioRoute modulo="financeiro"><Lazy><GuiasPage /></Lazy></EscritorioRoute>,
          },
          { path: 'obrigacoes', element: <Navigate to="/escritorio/rotinas" replace /> },
          { path: 'demandas', element: <Navigate to="/escritorio/ocorrencias" replace /> },
          { path: 'configuracoes', element: <Lazy><Configuracoes /></Lazy> },
          { path: 'configuracoes/*', element: <Lazy><Configuracoes /></Lazy> },
        ],
      },
    ],
  },
  {
    path: '/portal',
    element: <ProtectedRoute roles={['cliente']} />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="inicio" replace /> },
          { path: 'inicio', element: <Lazy><PortalInicio /></Lazy> },
          { path: 'cadastro', element: <Lazy><PortalCadastro /></Lazy> },
          { path: 'documentos', element: <Lazy><PortalDocumentos /></Lazy> },
          { path: 'financeiro', element: <Lazy><PortalFinanceiro /></Lazy> },
          { path: 'equipe', element: <Lazy><PortalEquipe /></Lazy> },
          { path: 'guias', element: <Lazy><PortalGuias /></Lazy> },
        ],
      },
    ],
  },
])
