import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/auth/AuthProvider'
import { ThemeProvider } from '@/theme/ThemeProvider'
import { router } from '@/router'
import { runSeed } from '@/data/seed'
import { migrarDemandas } from '@/lib/migrations/migrarDemandas'
import { migrarObrigacoes } from '@/lib/migrations/migrarObrigacoes'
import { useEffect } from 'react'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

function AppInner() {
  useEffect(() => {
    runSeed()
    migrarDemandas()
    migrarObrigacoes()
  }, [])

  return <RouterProvider router={router} />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <AppInner />
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
