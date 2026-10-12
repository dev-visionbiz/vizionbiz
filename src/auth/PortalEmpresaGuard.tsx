import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider'

export function PortalEmpresaGuard() {
  const { needsEmpresaSelection } = useAuth()
  const location = useLocation()

  if (needsEmpresaSelection && location.pathname !== '/portal/selecionar-empresa') {
    return <Navigate to="/portal/selecionar-empresa" replace />
  }

  return <Outlet />
}
