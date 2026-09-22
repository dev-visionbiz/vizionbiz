import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import type { UserRole } from '@/domain/types'
import { PageLoader } from '@/components/shared/LoadingSpinner'

interface Props {
  roles: UserRole[]
}

function homeFor(role: UserRole): string {
  return role === 'cliente' ? '/portal/inicio' : '/escritorio/dashboard'
}

export function ProtectedRoute({ roles }: Props) {
  const { currentUser, isLoading } = useAuth()

  if (isLoading) return <PageLoader />
  if (!currentUser) return <Navigate to="/login" replace />
  if (!roles.includes(currentUser.papel)) return <Navigate to={homeFor(currentUser.papel)} replace />

  return <Outlet />
}
