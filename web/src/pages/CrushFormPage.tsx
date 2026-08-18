import { useCallback, useEffect, useRef, useState } from 'react'
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

  const [loading, setLoading]               = useState(isEditing)
  const [saving, setSaving]                 = useState(false)
  const [deleting, setDeleting]             = useState(false)
  const [name, setName]                     = useState('')
  const [social, setSocial]                 = useState<SocialFields>(EMPTY_SOCIAL)
  const [photoFile, setPhotoFile]           = useState<File | null>(null)
  const [photoPreview, setPhotoPreview]     = useState<string | null>(null)
  const [interestRating, setInterestRating] = useState(0)
  const [isTop, setIsTop]                   = useState(false)
  const [review, setReview]                 = useState('')
  const [error, setError]                   = useState('')

  // Opção A — paste / drag
  const [dragging, setDragging]     = useState(false)
  const [pasteOk, setPasteOk]       = useState(false)

  // Opção B — busca por @username (a implementar)
  const [igHandle, setIgHandle]     = useState('')

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

  // ── Opção A: aplica arquivo de imagem (paste ou drop) ────────────────
  const applyImage = useCallback((file: File) => {
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setPasteOk(true)
    setTimeout(() => setPasteOk(false), 2500)
  }, [])

  // Ctrl+V em qualquer lugar da página enquanto o form está aberto
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) { applyImage(file); break }
        }
      }
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [applyImage])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'))
    if (file) applyImage(file)
  }

  // ── Upload / save ─────────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    applyImage(file)
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
      const userId   = session.user.id
      const targetId = id ?? crypto.randomUUID()
      let photo_url: string | null = photoPreview

      if (photoFile) photo_url = await uploadPhoto(photoFile, userId, targetId)

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

        {/* ── Card de importação ─────────────────────────────────────── */}
        <div className="bg-crush-card border border-crush-border rounded-2xl p-4 mb-6 flex flex-col gap-4">
          <p className="text-white text-sm font-bold">Importar perfil</p>

          {/* Opção A — paste / drag */}
          <div>
            <p className="text-crush-muted text-[10px] font-bold uppercase tracking-wider mb-2">
              A · Foto via Ctrl+V ou arraste
            </p>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`rounded-xl border-2 border-dashed py-5 flex flex-col items-center gap-1.5 transition-colors cursor-default select-none ${
                dragging
                  ? 'border-crush-pink bg-crush-pink/10'
                  : pasteOk
                  ? 'border-crush-green bg-crush-green/10'
                  : 'border-crush-border'
              }`}
            >
              <span className="text-2xl">{pasteOk ? '✅' : dragging ? '📥' : '📋'}</span>
              <p className="text-white text-xs font-semibold">
                {pasteOk ? 'Foto colada com sucesso!' : dragging ? 'Solte para usar esta foto' : 'Ctrl+V em qualquer lugar desta página'}
              </p>
              <p className="text-crush-muted text-[10px]">
                {pasteOk ? 'Ajuste abaixo se quiser' : 'No Instagram: segure a foto → Copiar imagem'}
              </p>
            </div>
          </div>

          {/* Opção B — busca automática (em breve) */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-crush-muted text-[10px] font-bold uppercase tracking-wider">
                B · Buscar pelo @username
              </p>
              <span className="bg-crush-border text-crush-muted text-[9px] font-bold px-1.5 py-0.5 rounded">EM BREVE</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={igHandle}
                onChange={e => {
                  const val = e.target.value
                  setIgHandle(val)
                  // Já pre-preenche o campo @instagram enquanto digita
                  const clean = val.replace(/^@/, '').trim()
                  if (clean) setSocial(prev => ({ ...prev, instagram: `@${clean}` }))
                }}
                placeholder="@username"
                className="flex-1 bg-crush-bg border border-crush-border rounded-lg px-3 py-2 text-white text-sm placeholder:text-crush-muted focus:border-crush-pink transition-colors"
              />
              <button
                type="button"
                disabled
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-crush-border text-crush-muted cursor-not-allowed opacity-50 shrink-0"
              >
                Buscar
              </button>
            </div>
            <p className="text-crush-muted text-[10px] mt-1.5">Preenche nome + foto automaticamente para perfis públicos.</p>
          </div>

          {/* Opção C — upload manual */}
          <div>
            <p className="text-crush-muted text-[10px] font-bold uppercase tracking-wider mb-2">
              C · Upload manual
            </p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full bg-crush-bg border border-crush-border rounded-xl py-2.5 text-white text-xs font-semibold hover:bg-crush-border transition-colors"
            >
              📁 Escolher arquivo
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>
        </div>

        {/* ── Foto preview ──────────────────────────────────────────── */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
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
                <span className="text-crush-muted text-[10px]">Sem foto</span>
              </div>
            )}
            {isTop && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-crush-gold text-black text-[10px] font-black px-2 py-0.5 rounded-lg">
                TOP
              </span>
            )}
          </div>
        </div>

        {/* Nome */}
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

        {/* Redes Sociais */}
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

        {/* Interesse */}
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

        {/* Notas */}
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
