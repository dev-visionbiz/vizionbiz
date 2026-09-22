import type { ReactNode } from 'react'
import { useAuth } from './AuthProvider'
import { can } from './roles'

type Permission = keyof typeof can

interface Props {
  permission: Permission
  fallback?: ReactNode
  children: ReactNode
}

export function PermissionGuard({ permission, fallback = null, children }: Props) {
  const { currentUser } = useAuth()
  if (!currentUser || !can[permission](currentUser.papel)) return <>{fallback}</>
  return <>{children}</>
}
