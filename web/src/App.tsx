import { useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import SplashScreen from './components/SplashScreen'
import LoginPage        from './pages/LoginPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import CrushListPage    from './pages/CrushListPage'
import CrushDetailPage  from './pages/CrushDetailPage'
import CrushFormPage    from './pages/CrushFormPage'
import DateFormPage     from './pages/DateFormPage'
import ProfilePage      from './pages/ProfilePage'
import TimelinePage     from './pages/TimelinePage'

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return (
    <div className="min-h-screen bg-crush-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-crush-pink border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!session) return <Navigate to="/login" state={{ from: location }} replace />
  return <>{children}</>
}

export default function App() {
  const [splash, setSplash] = useState(
    () => !sessionStorage.getItem('splashShown')
  )

  function handleSplashDone() {
    sessionStorage.setItem('splashShown', '1')
    setSplash(false)
  }

  return (
    <>
      {splash && <SplashScreen onDone={handleSplashDone} />}
    <Routes>
      <Route path="/login"         element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />

      <Route path="/" element={
        <AuthGuard>
          <Layout>
            <CrushListPage />
          </Layout>
        </AuthGuard>
      } />

      <Route path="/crushes/new" element={
        <AuthGuard>
          <Layout>
            <CrushFormPage />
          </Layout>
        </AuthGuard>
      } />

      <Route path="/crushes/:id" element={
        <AuthGuard>
          <Layout>
            <CrushDetailPage />
          </Layout>
        </AuthGuard>
      } />

      <Route path="/crushes/:id/edit" element={
        <AuthGuard>
          <Layout>
            <CrushFormPage />
          </Layout>
        </AuthGuard>
      } />

      <Route path="/dates/new" element={
        <AuthGuard>
          <Layout>
            <DateFormPage />
          </Layout>
        </AuthGuard>
      } />

      <Route path="/dates/:id/edit" element={
        <AuthGuard>
          <Layout>
            <DateFormPage />
          </Layout>
        </AuthGuard>
      } />

      <Route path="/timeline" element={
        <AuthGuard>
          <Layout>
            <TimelinePage />
          </Layout>
        </AuthGuard>
      } />

      <Route path="/profile" element={
        <AuthGuard>
          <Layout>
            <ProfilePage />
          </Layout>
        </AuthGuard>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  )
}
