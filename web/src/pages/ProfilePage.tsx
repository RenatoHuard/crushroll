import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Profile, SocialFields } from '../lib/types'

const SOCIAL_FIELDS: { key: keyof SocialFields; label: string; placeholder: string }[] = [
  { key: 'instagram', label: 'Instagram', placeholder: '@usuario' },
  { key: 'twitter_x', label: 'Twitter/X',  placeholder: '@usuario' },
  { key: 'tiktok',    label: 'TikTok',     placeholder: '@usuario' },
  { key: 'facebook',  label: 'Facebook',   placeholder: 'usuario' },
]

export default function ProfilePage() {
  const { session, signOut } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [name, setName]                 = useState('')
  const [social, setSocial]             = useState<SocialFields>({ instagram: '', twitter_x: '', tiktok: '', facebook: '' })
  const [photoFile, setPhotoFile]       = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [saved, setSaved]               = useState(false)
  const [error, setError]               = useState('')

  useEffect(() => {
    if (!session?.user.id) { setLoading(false); return }
    supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle<Profile>().then(({ data }) => {
      if (data) {
        setName(data.name ?? '')
        setPhotoPreview(data.photo_url)
        setSocial({ instagram: data.instagram ?? '', twitter_x: data.twitter_x ?? '', tiktok: data.tiktok ?? '', facebook: data.facebook ?? '' })
      }
      setLoading(false)
    })
  }, [session?.user.id])

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function uploadPhoto(file: File, userId: string): Promise<string> {
    const path = `${userId}/profile.jpg`
    const { error } = await supabase.storage.from('crush-photos').upload(path, file, { contentType: 'image/jpeg', upsert: true })
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from('crush-photos').getPublicUrl(path)
    return `${publicUrl}?t=${Date.now()}`
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!session?.user.id) return
    if (!name.trim()) { setError('Nome obrigatório.'); return }
    setSaving(true)
    setError('')
    try {
      const userId = session.user.id
      let photo_url = photoPreview
      if (photoFile) photo_url = await uploadPhoto(photoFile, userId)
      const { error } = await supabase.from('profiles').upsert({ id: userId, name: name.trim(), photo_url, ...social })
      if (error) throw error
      setPhotoFile(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  if (loading) return (
    <div className="min-h-screen bg-crush-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-crush-pink border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-crush-bg">
      <div className="sticky top-0 bg-crush-bg/95 backdrop-blur z-30 border-b border-crush-border px-4 py-3">
        <h2 className="text-white font-bold text-lg">Meu Perfil</h2>
      </div>

      <form onSubmit={handleSave} className="p-4 max-w-lg mx-auto pb-10">
        {error && (
          <div className="bg-red-900/40 border border-red-500/50 text-red-300 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
        )}
        {saved && (
          <div className="bg-green-900/40 border border-green-500/50 text-green-300 text-sm rounded-lg px-4 py-3 mb-4">Perfil atualizado!</div>
        )}

        {/* Avatar */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative shrink-0">
            <button type="button" onClick={() => fileRef.current?.click()} className="block">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="avatar"
                  width={96}
                  height={96}
                  className="rounded-full object-cover border-2 border-crush-pink"
                  style={{ width: 96, height: 96, minWidth: 96, maxWidth: 96 }}
                />
              ) : (
                <div
                  className="rounded-full bg-crush-card border-2 border-dashed border-crush-border flex flex-col items-center justify-center gap-1"
                  style={{ width: 96, height: 96 }}
                >
                  <span className="text-3xl">👤</span>
                  <span className="text-crush-muted text-[10px]">Adicionar foto</span>
                </div>
              )}
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-0 right-0 w-7 h-7 bg-crush-pink rounded-full flex items-center justify-center border-2 border-crush-bg hover:opacity-80 transition-opacity"
            >
              <span className="text-xs">✏️</span>
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          {session?.user.email && (
            <p className="text-crush-muted text-xs mt-3">{session.user.email}</p>
          )}
        </div>

        {/* Name */}
        <div className="mb-4">
          <label className="text-crush-muted text-xs mb-1 block">Nome</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Seu nome"
            className="w-full bg-crush-bg border border-crush-border rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-crush-muted focus:border-crush-pink transition-colors"
          />
        </div>

        {/* Socials */}
        <div className="mb-6">
          <p className="text-crush-muted text-xs font-semibold mb-3">Redes Sociais</p>
          <div className="flex flex-col gap-3">
            {SOCIAL_FIELDS.map(f => (
              <div key={f.key}>
                <label className="text-crush-muted text-xs mb-1 block">{f.label}</label>
                <input
                  type="text"
                  value={social[f.key]}
                  onChange={e => setSocial(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full bg-crush-bg border border-crush-border rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-crush-muted focus:border-crush-pink transition-colors"
                />
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-crush-pink text-white font-semibold rounded-xl py-3.5 text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </button>

        <button
          type="button"
          onClick={handleSignOut}
          className="w-full bg-crush-border text-white font-semibold rounded-xl py-3.5 text-sm hover:opacity-90 transition-opacity mt-3"
        >
          Sair
        </button>
      </form>
    </div>
  )
}
