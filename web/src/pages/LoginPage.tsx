import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { session, loading } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  if (!loading && session) return <Navigate to="/" replace />

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) { setError('Preencha email e senha.'); return }
    setBusy(true)
    setError('')
    setInfo('')
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setInfo('Conta criada! Verifique seu email para confirmar o cadastro.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setBusy(false)
    }
  }

  async function handleGoogle() {
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/crushdex/app/auth/callback`,
      },
    })
    if (error) setError(error.message)
  }

  return (
    <div className="min-h-screen bg-crush-bg flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-4xl font-bold text-white text-center mb-2">CrushDex</h1>
        <p className="text-crush-muted text-sm text-center mb-8">Entre para cadastrar seus crushes</p>

        {error && (
          <div className="bg-red-900/40 border border-red-500/50 text-red-300 text-sm rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}
        {info && (
          <div className="bg-green-900/40 border border-green-500/50 text-green-300 text-sm rounded-lg px-4 py-3 mb-4">
            {info}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            className="bg-[#2C3137] text-white rounded-lg px-4 py-3 text-sm border border-crush-border focus:border-crush-pink transition-colors placeholder:text-crush-muted"
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className="bg-[#2C3137] text-white rounded-lg px-4 py-3 text-sm border border-crush-border focus:border-crush-pink transition-colors placeholder:text-crush-muted"
          />

          <button
            type="submit"
            disabled={busy}
            className="bg-crush-pink text-white font-semibold rounded-lg py-3 text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {busy ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <button
          onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(''); setInfo('') }}
          className="w-full text-crush-muted text-sm mt-3 hover:text-white transition-colors py-1"
        >
          {mode === 'login' ? 'Não tem conta? Criar agora' : 'Já tem conta? Entrar'}
        </button>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-crush-border" />
          <span className="text-crush-muted text-xs">ou</span>
          <div className="flex-1 h-px bg-crush-border" />
        </div>

        <button
          onClick={handleGoogle}
          className="w-full bg-[#4285F4] text-white font-semibold rounded-lg py-3 text-sm hover:opacity-90 transition-opacity"
        >
          Entrar com Google
        </button>
      </div>
    </div>
  )
}
