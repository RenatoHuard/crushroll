import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Crush, SocialFields } from '../lib/types'
import StarRating from '../components/StarRating'
import Collapsible from '../components/Collapsible'

const EMPTY_SOCIAL: SocialFields = { instagram: '', twitter_x: '', tiktok: '', facebook: '' }

const SOCIAL_FIELDS: { key: keyof SocialFields; label: string; placeholder: string }[] = [
  { key: 'instagram', label: 'Instagram', placeholder: '@usuario' },
  { key: 'twitter_x', label: 'Twitter/X',  placeholder: '@usuario' },
  { key: 'tiktok',    label: 'TikTok',     placeholder: '@usuario' },
  { key: 'facebook',  label: 'Facebook',   placeholder: 'usuario' },
]

export default function CrushFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { session } = useAuth()
  const isEditing = Boolean(id)
  const fileRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading]             = useState(isEditing)
  const [saving, setSaving]               = useState(false)
  const [deleting, setDeleting]           = useState(false)
  const [name, setName]                   = useState('')
  const [social, setSocial]               = useState<SocialFields>(EMPTY_SOCIAL)
  const [photoFile, setPhotoFile]         = useState<File | null>(null)
  const [photoPreview, setPhotoPreview]   = useState<string | null>(null)
  const [interestRating, setInterestRating] = useState(0)
  const [isTop, setIsTop]                 = useState(false)
  const [review, setReview]               = useState('')
  const [error, setError]                 = useState('')
  // Instagram import
  const [igHandle, setIgHandle]           = useState('')
  const [igSearching, setIgSearching]     = useState(false)
  const [igError, setIgError]             = useState('')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    supabase.from('crushes').select('*').eq('id', id).single<Crush>().then(({ data }) => {
      if (data) {
        setName(data.name)
        setSocial({ instagram: data.instagram ?? '', twitter_x: data.twitter_x ?? '', tiktok: data.tiktok ?? '', facebook: data.facebook ?? '' })
        setPhotoPreview(data.photo_url)
        setInterestRating(data.interest_rating)
        setIsTop(data.is_top)
        setReview(data.review ?? '')
      }
      setLoading(false)
    })
  }, [id])

  async function handleIgImport() {
    const handle = igHandle.replace(/^@/, '').trim()
    if (!handle) return
    setIgSearching(true)
    setIgError('')
    try {
      // Busca direto do browser (IP residencial — não bloqueado pelo Instagram).
      // corsproxy.io adiciona os headers CORS necessários sem passar pelo servidor.
      const proxyBase = 'https://corsproxy.io/?url='
      const igApi = `https://i.instagram.com/api/v1/users/web_profile_info/?username=${handle}`
      const res = await fetch(proxyBase + encodeURIComponent(igApi), {
        headers: {
          'X-IG-App-ID': '936619743392459',
        },
      })

      if (!res.ok) {
        setIgError('Perfil não encontrado ou privado.')
        return
      }

      const json = await res.json()
      const user = json?.data?.user
      if (!user) {
        setIgError('Perfil não encontrado ou privado.')
        return
      }

      if (user.full_name) setName(user.full_name)
      setSocial(prev => ({ ...prev, instagram: `@${handle}` }))

      const photoUrl = user.profile_pic_url_hd ?? user.profile_pic_url
      if (photoUrl) {
        // Baixa a foto via proxy para evitar CORS do CDN do Instagram
        const imgRes  = await fetch(proxyBase + encodeURIComponent(photoUrl))
        const blob    = await imgRes.blob()
        const file    = new File([blob], `${handle}.jpg`, { type: 'image/jpeg' })
        setPhotoFile(file)
        setPhotoPreview(URL.createObjectURL(file))
      }
    } catch {
      setIgError('Não foi possível buscar. Verifique se o perfil é público.')
    } finally {
      setIgSearching(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function uploadPhoto(file: File, userId: string, crushId: string): Promise<string> {
    const path = `${userId}/${crushId}.jpg`
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
      const targetId = id ?? crypto.randomUUID()
      let photo_url: string | null = photoPreview

      if (photoFile) {
        photo_url = await uploadPhoto(photoFile, userId, targetId)
      }

      const payload = {
        name: name.trim(),
        user_id: userId,
        ...social,
        photo_url,
        interest_rating: interestRating,
        is_top: interestRating === 5 ? isTop : false,
        review: review.trim() || null,
      }

      const { error } = id
        ? await supabase.from('crushes').update(payload).eq('id', id)
        : await supabase.from('crushes').insert({ id: targetId, ...payload })

      if (error) throw error
      navigate(id ? `/crushes/${id}` : `/crushes/${targetId}`, { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!id || !window.confirm('Tem certeza que deseja excluir este crush?')) return
    setDeleting(true)
    await supabase.from('crushes').delete().eq('id', id)
    navigate('/', { replace: true })
  }

  if (loading) return (
    <div className="min-h-screen bg-crush-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-crush-pink border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-crush-bg">
      <div className="sticky top-0 bg-crush-bg/95 backdrop-blur z-30 border-b border-crush-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-crush-muted hover:text-white text-xl">←</button>
        <h2 className="text-white font-bold">{isEditing ? 'Editar crush' : 'Novo crush'}</h2>
      </div>

      <form onSubmit={handleSave} className="p-4 max-w-lg mx-auto pb-10">
        {error && (
          <div className="bg-red-900/40 border border-red-500/50 text-red-300 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
        )}

        {/* Instagram import */}
        <div className="bg-crush-card border border-crush-border rounded-xl p-4 mb-6">
          <p className="text-white text-xs font-bold mb-2">
            <span className="mr-1.5">📸</span>Importar do Instagram
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={igHandle}
              onChange={e => { setIgHandle(e.target.value); setIgError('') }}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleIgImport())}
              placeholder="@username"
              className="flex-1 bg-crush-bg border border-crush-border rounded-lg px-3 py-2 text-white text-sm placeholder:text-crush-muted focus:border-crush-pink transition-colors"
            />
            <button
              type="button"
              onClick={handleIgImport}
              disabled={!igHandle.trim() || igSearching}
              className="px-4 py-2 bg-crush-pink text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 shrink-0 flex items-center gap-1.5"
            >
              {igSearching
                ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
                : 'Importar'}
            </button>
          </div>
          {igError && <p className="text-red-400 text-[11px] mt-2">{igError}</p>}
          <p className="text-crush-muted text-[10px] mt-2">Preenche nome e foto para perfis públicos.</p>
        </div>

        {/* Photo */}
        <div className="flex flex-col items-center mb-6">
          <button type="button" onClick={() => fileRef.current?.click()} className="relative group">
            {photoPreview ? (
              <img
                src={photoPreview}
                className="w-28 h-28 rounded-full object-cover"
                style={isTop ? { border: '3px solid #FFD700' } : {}}
                alt="foto"
              />
            ) : (
              <div
                className="w-28 h-28 rounded-full bg-crush-card border-2 border-dashed border-crush-border flex flex-col items-center justify-center gap-1"
                style={isTop ? { borderColor: '#FFD700', borderStyle: 'solid' } : {}}
              >
                <span className="text-3xl">📷</span>
                <span className="text-crush-muted text-[10px]">Adicionar foto</span>
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/20 transition-colors" />
            {isTop && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-crush-gold text-black text-[10px] font-black px-2 py-0.5 rounded-lg">TOP</span>}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>

        {/* Name */}
        <div className="mb-4">
          <label className="text-crush-muted text-xs mb-1 block">Nome</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nome do crush"
            className="w-full bg-crush-bg border border-crush-border rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-crush-muted focus:border-crush-pink transition-colors"
          />
        </div>

        {/* Social */}
        <Collapsible title="Redes Sociais">
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
        </Collapsible>

        {/* Interest */}
        <div className="mb-5">
          <p className="text-crush-muted text-xs font-semibold mb-3">Interesse em sair</p>
          <StarRating
            value={interestRating}
            onChange={v => { setInterestRating(v); if (v < 5) setIsTop(false) }}
          />
          {interestRating === 5 && (
            <label className="flex items-center gap-2 mt-3 cursor-pointer w-fit">
              <div
                onClick={() => setIsTop(p => !p)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isTop ? 'bg-crush-gold border-crush-gold' : 'border-crush-gold bg-transparent'}`}
              >
                {isTop && <span className="text-black text-xs font-black">✓</span>}
              </div>
              <span className="text-crush-gold font-bold text-sm tracking-widest">TOP</span>
            </label>
          )}
        </div>

        {/* Notes */}
        <div className="mb-6">
          <p className="text-crush-muted text-xs font-semibold mb-2">Notas</p>
          <textarea
            value={review}
            onChange={e => setReview(e.target.value)}
            placeholder="Anotações gerais sobre o crush..."
            rows={4}
            className="w-full bg-crush-bg border border-crush-border rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-crush-muted focus:border-crush-pink transition-colors resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-crush-pink text-white font-semibold rounded-xl py-3.5 text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </button>

        {isEditing && (
          <button
            type="button"
            onClick={() => navigate(`/dates/new?crushId=${id}`)}
            className="w-full bg-crush-green text-white font-semibold rounded-xl py-3.5 text-sm hover:opacity-90 transition-opacity mt-3"
          >
            Registrar Date
          </button>
        )}

        {isEditing && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="w-full bg-[#8B2E3F] text-white font-semibold rounded-xl py-3.5 text-sm hover:opacity-90 transition-opacity disabled:opacity-60 mt-3"
          >
            {deleting ? 'Excluindo...' : 'Excluir'}
          </button>
        )}
      </form>
    </div>
  )
}
