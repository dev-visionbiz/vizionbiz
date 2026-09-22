import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import { podeAcessarModulo } from './roles'
import type { ModuloEscritorio } from '@/domain/types'

interface Props {
  modulo: ModuloEscritorio
  children: ReactNode
}

export function EscritorioRoute({ modulo, children }: Props) {
  const { currentUser } = useAuth()
  if (!currentUser || !podeAcessarModulo(currentUser, modulo)) {
    return <Navigate to="/escritorio/dashboard" replace />
  }
  return <>{children}</>
}
