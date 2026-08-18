import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Crush, CrushDate } from '../lib/types'
import StarRating from '../components/StarRating'

const ACTIVITIES: {
  key: keyof ActivityFlags
  ratingKey: keyof ActivityRatings
  emoji: string
  label: string
}[] = [
  { key: 'had_chat',     ratingKey: 'had_chat_rating',     emoji: '💬', label: 'Conversa' },
  { key: 'had_kiss',     ratingKey: 'had_kiss_rating',     emoji: '💋', label: 'Beijo'    },
  { key: 'had_pirulito', ratingKey: 'had_pirulito_rating', emoji: '🍭', label: 'Pirulito' },
  { key: 'had_donut',    ratingKey: 'had_donut_rating',    emoji: '🍩', label: 'Donut'    },
  { key: 'had_fire',     ratingKey: 'had_fire_rating',     emoji: '🔥', label: 'Fogo'     },
  { key: 'had_sweat',    ratingKey: 'had_sweat_rating',    emoji: '💦', label: 'Suor'     },
]

interface ActivityFlags {
  had_chat: boolean; had_kiss: boolean; had_pirulito: boolean
  had_donut: boolean; had_fire: boolean; had_sweat: boolean
}
interface ActivityRatings {
  had_chat_rating: number; had_kiss_rating: number; had_pirulito_rating: number
  had_donut_rating: number; had_fire_rating: number; had_sweat_rating: number
}

type PhotoItem = File | string

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

export default function DateFormPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const isEditing = Boolean(id)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const [crushes, setCrushes]                       = useState<Crush[]>([])
  const [selectedCrushId, setSelectedCrushId]       = useState<string | null>(searchParams.get('crushId'))
  const [selectedCrush, setSelectedCrush]           = useState<Crush | null>(null)
  const [showPicker, setShowPicker]                 = useState(false)
  const [search, setSearch]                         = useState('')
  const [loadingCrushes, setLoadingCrushes]         = useState(true)

  const [dateISO, setDateISO]                       = useState(todayISO())
  const [location, setLocation]                     = useState('')
  const [dateRating, setDateRating]                 = useState(0)
  const [activities, setActivities]                 = useState<ActivityFlags>({
    had_chat: false, had_kiss: false, had_pirulito: false, had_donut: false, had_fire: false, had_sweat: false,
  })
  const [activityRatings, setActivityRatings]       = useState<ActivityRatings>({
    had_chat_rating: 0, had_kiss_rating: 0, had_pirulito_rating: 0,
    had_donut_rating: 0, had_fire_rating: 0, had_sweat_rating: 0,
  })
  const [photos, setPhotos]                         = useState<PhotoItem[]>([])
  const [review, setReview]                         = useState('')
  const [saving, setSaving]                         = useState(false)
  const [error, setError]                           = useState('')

  useEffect(() => {
    supabase.from('crushes').select('*').order('crush_number', { ascending: true }).then(({ data }) => {
      if (data) {
        const list = data as Crush[]
        setCrushes(list)
        const paramId = searchParams.get('crushId')
        if (paramId) {
          const found = list.find(c => c.id === paramId)
          if (found) setSelectedCrush(found)
        }
      }
      setLoadingCrushes(false)
    })
  }, [])

  useEffect(() => {
    if (!id) return
    supabase.from('crush_dates').select('*').eq('id', id).single<CrushDate>().then(async ({ data }) => {
      if (!data) return
      setSelectedCrushId(data.crush_id)
      if (data.date) setDateISO(data.date)
      setLocation(data.location ?? '')
      setDateRating(data.date_rating)
      setActivities({ had_chat: data.had_chat, had_kiss: data.had_kiss, had_pirulito: data.had_pirulito, had_donut: data.had_donut, had_fire: data.had_fire, had_sweat: data.had_sweat })
      setActivityRatings({ had_chat_rating: data.had_chat_rating, had_kiss_rating: data.had_kiss_rating, had_pirulito_rating: data.had_pirulito_rating, had_donut_rating: data.had_donut_rating, had_fire_rating: data.had_fire_rating, had_sweat_rating: data.had_sweat_rating })
      setReview(data.review ?? '')
      setPhotos(data.photos ?? [])

      const { data: crushData } = await supabase.from('crushes').select('*').eq('id', data.crush_id).single<Crush>()
      if (crushData) { setSelectedCrush(crushData); setSelectedCrushId(crushData.id) }
    })
  }, [id])

  function handlePhotoFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const remaining = 5 - photos.length
    setPhotos(prev => [...prev, ...files.slice(0, remaining)])
    e.target.value = ''
  }

  function removePhoto(idx: number) {
    setPhotos(prev => prev.filter((_, i) => i !== idx))
  }

  function previewUrl(p: PhotoItem): string {
    return p instanceof File ? URL.createObjectURL(p) : p
  }

  async function uploadDatePhoto(file: File, userId: string, dateId: string, idx: number): Promise<string> {
    const path = `${userId}/dates/${dateId}-${idx}.jpg`
    const { error } = await supabase.storage.from('crush-photos').upload(path, file, { contentType: 'image/jpeg', upsert: true })
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from('crush-photos').getPublicUrl(path)
    return `${publicUrl}?t=${Date.now()}`
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!session?.user.id) return
    if (!selectedCrushId) { setError('Selecione um crush.'); return }
    setSaving(true)
    setError('')
    try {
      const userId = session.user.id
      const targetId = id ?? crypto.randomUUID()

      const uploadedPhotos: string[] = []
      for (let i = 0; i < photos.length; i++) {
        const p = photos[i]
        if (p instanceof File) {
          uploadedPhotos.push(await uploadDatePhoto(p, userId, targetId, i))
        } else {
          uploadedPhotos.push(p)
        }
      }

      const payload = {
        crush_id: selectedCrushId,
        user_id: userId,
        date: dateISO || null,
        location: location.trim() || null,
        date_rating: dateRating,
        ...activities,
        ...activityRatings,
        review: review.trim() || null,
        photos: uploadedPhotos,
      }

      const { error } = id
        ? await supabase.from('crush_dates').update(payload).eq('id', id)
        : await supabase.from('crush_dates').insert({ id: targetId, ...payload })

      if (error) throw error
      navigate(-1)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!id || !window.confirm('Excluir este date?')) return
    await supabase.from('crush_dates').delete().eq('id', id)
    navigate(-1)
  }

  const filtered = crushes.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="min-h-screen bg-crush-bg">
      <div className="sticky top-0 bg-crush-bg/95 backdrop-blur z-30 border-b border-crush-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-crush-muted hover:text-white text-xl">←</button>
        <h2 className="text-white font-bold">{isEditing ? 'Editar Date' : 'Registrar Date'}</h2>
      </div>

      <form onSubmit={handleSave} className="p-4 max-w-lg mx-auto pb-10">
        {error && (
          <div className="bg-red-900/40 border border-red-500/50 text-red-300 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
        )}

        {/* Crush picker */}
        {!isEditing ? (
          <div className="mb-5">
            <p className="text-crush-muted text-xs font-semibold mb-2">Quem foi?</p>
            {selectedCrush ? (
              <button
                type="button"
                onClick={() => setShowPicker(p => !p)}
                className="w-full flex items-center gap-3 bg-crush-card rounded-xl px-3 py-3 hover:bg-crush-border transition-colors"
              >
                {selectedCrush.photo_url ? (
                  <img src={selectedCrush.photo_url} className="w-10 h-10 rounded-full object-cover" alt="" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-crush-border flex items-center justify-center">💘</div>
                )}
                <span className="flex-1 text-white font-semibold text-sm text-left">{selectedCrush.name}</span>
                <span className="text-crush-pink text-xs">Trocar</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowPicker(p => !p)}
                className="w-full bg-crush-card border border-dashed border-crush-border rounded-xl py-4 text-crush-pink font-semibold text-sm hover:opacity-80 transition-opacity"
              >
                Selecionar crush
              </button>
            )}

            {showPicker && (
              <div className="mt-2 bg-crush-card border border-crush-border rounded-xl p-3">
                <input
                  type="text"
                  placeholder="Buscar crush..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-crush-bg border border-crush-border rounded-lg px-3 py-2 text-white text-sm placeholder:text-crush-muted mb-2 focus:border-crush-pink transition-colors"
                />
                {loadingCrushes ? (
                  <div className="flex justify-center py-4">
                    <div className="w-5 h-5 border-2 border-crush-pink border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto">
                    {filtered.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setSelectedCrush(c); setSelectedCrushId(c.id); setShowPicker(false); setSearch('') }}
                        className="w-full flex items-center gap-3 py-2.5 border-b border-crush-border last:border-0 hover:bg-crush-border rounded-lg px-1 transition-colors"
                      >
                        {c.photo_url ? (
                          <img src={c.photo_url} className="w-9 h-9 rounded-full object-cover" alt="" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-crush-border flex items-center justify-center text-sm">💘</div>
                        )}
                        <span className="text-white text-sm">{c.name}</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => navigate('/crushes/new')}
                      className="w-full bg-crush-pink text-white text-sm font-bold rounded-lg py-2.5 mt-2 hover:opacity-90 transition-opacity"
                    >
                      + Novo Crush
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : selectedCrush && (
          <div className="mb-5">
            <p className="text-crush-muted text-xs font-semibold mb-2">Crush</p>
            <div className="flex items-center gap-3 bg-crush-card rounded-xl px-3 py-3">
              {selectedCrush.photo_url ? (
                <img src={selectedCrush.photo_url} className="w-10 h-10 rounded-full object-cover" alt="" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-crush-border flex items-center justify-center">💘</div>
              )}
              <span className="text-white font-semibold text-sm">{selectedCrush.name}</span>
            </div>
          </div>
        )}

        {/* Date */}
        <div className="mb-4">
          <label className="text-crush-muted text-xs mb-1 block">Data</label>
          <input
            type="date"
            value={dateISO}
            onChange={e => setDateISO(e.target.value)}
            className="w-full bg-crush-bg border border-crush-border rounded-lg px-3 py-2.5 text-white text-sm focus:border-crush-pink transition-colors [color-scheme:dark]"
          />
        </div>

        {/* Location */}
        <div className="mb-5">
          <label className="text-crush-muted text-xs mb-1 block">Localização</label>
          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="Onde foi?"
            className="w-full bg-crush-bg border border-crush-border rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-crush-muted focus:border-crush-pink transition-colors"
          />
        </div>

        {/* Date rating */}
        <div className="mb-6">
          <p className="text-crush-muted text-xs font-semibold mb-3">Classificação do Date</p>
          <StarRating value={dateRating} onChange={setDateRating} />
        </div>

        {/* Activities */}
        <div className="mb-6">
          <p className="text-crush-muted text-xs font-semibold mb-3">O que rolou?</p>
          <div className="grid grid-cols-3 gap-2">
            {ACTIVITIES.map(({ key, ratingKey, emoji, label }) => {
              const active = activities[key]
              return (
                <div key={key} className="flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActivities(prev => ({ ...prev, [key]: !prev[key] }))}
                    className={`w-full py-3 rounded-xl border flex flex-col items-center gap-1 transition-colors
                      ${active
                        ? 'bg-[#3D1A26] border-crush-pink'
                        : 'bg-crush-card border-crush-border hover:bg-crush-border'
                      }`}
                  >
                    <span className="text-2xl leading-none">{emoji}</span>
                    <span className={`text-[10px] font-medium ${active ? 'text-crush-pink' : 'text-crush-muted'}`}>{label}</span>
                  </button>
                  {active && (
                    <StarRating
                      value={activityRatings[ratingKey]}
                      onChange={v => setActivityRatings(prev => ({ ...prev, [ratingKey]: v }))}
                      size="sm"
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Photos */}
        <div className="mb-5">
          <label className="text-crush-muted text-xs font-semibold mb-2 block">Fotos do Date ({photos.length}/5)</label>
          <div className="flex flex-wrap gap-2">
            {photos.map((p, i) => (
              <div key={i} className="relative w-20 h-20">
                <img src={previewUrl(p)} className="w-20 h-20 rounded-xl object-cover" alt="" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-crush-pink rounded-full flex items-center justify-center text-white text-sm font-bold hover:opacity-80"
                >
                  ×
                </button>
              </div>
            ))}
            {photos.length < 5 && (
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="w-20 h-20 bg-crush-card border border-dashed border-crush-border rounded-xl flex items-center justify-center text-3xl text-crush-muted hover:bg-crush-border transition-colors"
              >
                +
              </button>
            )}
          </div>
          <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoFiles} />
        </div>

        {/* Notes */}
        <div className="mb-6">
          <label className="text-crush-muted text-xs font-semibold mb-2 block">Anotações do Date</label>
          <textarea
            value={review}
            onChange={e => setReview(e.target.value)}
            placeholder="Como foi? O que aconteceu..."
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
            onClick={handleDelete}
            className="w-full bg-[#8B2E3F] text-white font-semibold rounded-xl py-3.5 text-sm hover:opacity-90 transition-opacity mt-3"
          >
            Excluir Date
          </button>
        )}
      </form>
    </div>
  )
}
