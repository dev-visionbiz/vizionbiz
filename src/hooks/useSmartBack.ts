import { useNavigate } from 'react-router-dom'

export function useSmartBack(fallback: string) {
  const navigate = useNavigate()
  return () => {
    if (window.history.length > 2) navigate(-1)
    else navigate(fallback)
  }
}
