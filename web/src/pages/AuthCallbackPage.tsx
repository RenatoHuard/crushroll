import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const { session, loading } = useAuth()

  useEffect(() => {
    if (!loading) {
      navigate(session ? '/' : '/login', { replace: true })
    }
  }, [session, loading, navigate])

  return (
    <div className="min-h-screen bg-crush-bg flex items-center justify-center">
      <p className="text-crush-muted text-sm">Autenticando...</p>
    </div>
  )
}
