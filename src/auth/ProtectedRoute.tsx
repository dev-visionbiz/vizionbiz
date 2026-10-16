import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import type { UserRole } from '@/domain/types'
import { PageLoader } from '@/components/shared/LoadingSpinner'

interface Props {
  roles: UserRole[]
}

function homeFor(role: UserRole): string {
  if (role === 'cliente') return '/portal/inicio'
  if (role === 'visionbiz_admin') return '/admin/tenants'
  return '/escritorio/dashboard'
}

export function ProtectedRoute({ roles }: Props) {
  const { currentUser, isLoading } = useAuth()

  if (isLoading) return <PageLoader />
  if (!currentUser) return <Navigate to="/login" replace />
  if (!roles.includes(currentUser.papel)) return <Navigate to={homeFor(currentUser.papel)} replace />

  return <Outlet />
}
