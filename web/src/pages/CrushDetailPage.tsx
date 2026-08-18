import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Crush, CrushDate } from '../lib/types'
import Stars from '../components/Stars'
import Collapsible from '../components/Collapsible'

const ACTIVITIES: {
  key: keyof Pick<CrushDate, 'had_chat' | 'had_kiss' | 'had_pirulito' | 'had_donut' | 'had_fire' | 'had_sweat'>
  ratingKey: keyof Pick<CrushDate, 'had_chat_rating' | 'had_kiss_rating' | 'had_pirulito_rating' | 'had_donut_rating' | 'had_fire_rating' | 'had_sweat_rating'>
  emoji: string
}[] = [
  { key: 'had_chat',     ratingKey: 'had_chat_rating',     emoji: '💬' },
  { key: 'had_kiss',     ratingKey: 'had_kiss_rating',     emoji: '💋' },
  { key: 'had_pirulito', ratingKey: 'had_pirulito_rating', emoji: '🍭' },
  { key: 'had_donut',    ratingKey: 'had_donut_rating',    emoji: '🍩' },
  { key: 'had_fire',     ratingKey: 'had_fire_rating',     emoji: '🔥' },
  { key: 'had_sweat',    ratingKey: 'had_sweat_rating',    emoji: '💦' },
]

const SOCIALS = [
  { key: 'instagram' as const, label: 'Instagram', prefix: 'https://instagram.com/' },
  { key: 'twitter_x' as const, label: 'Twitter/X',  prefix: 'https://twitter.com/' },
  { key: 'tiktok'    as const, label: 'TikTok',     prefix: 'https://tiktok.com/@' },
  { key: 'facebook'  as const, label: 'Facebook',   prefix: 'https://facebook.com/' },
]

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function DateCard({ d, num, onEdit }: { d: CrushDate; num: number; onEdit: () => void }) {
  const [open, setOpen] = useState(false)
  const active = ACTIVITIES.filter(a => d[a.key])

  return (
    <div className="bg-crush-bg rounded-xl mb-3 border border-crush-border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex justify-between items-center px-4 py-3 text-left hover:bg-white/5 transition-colors"
      >
        <div>
          <span className="text-white font-bold text-sm">Date #{num}</span>
          {d.date && <p className="text-crush-muted text-xs mt-0.5">{fmtDate(d.date)}</p>}
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <Stars value={d.date_rating} size="sm" />
          {d.location && <span className="text-crush-muted text-[10px]">📍 {d.location}</span>}
          <span className="text-crush-muted text-[10px]">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-crush-border">
          {d.location && (
            <div className="mt-3">
              <p className="text-white text-sm mb-2">📍 {d.location}</p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.location)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-block bg-crush-card border border-crush-border text-white text-xs rounded-lg px-3 py-2 hover:bg-crush-border transition-colors"
              >
                Ver no Mapa
              </a>
            </div>
          )}

          {active.length > 0 && (
            <div className="mt-3">
              <p className="text-crush-muted text-xs font-semibold mb-2">O que rolou</p>
              <div className="grid grid-cols-3 gap-2">
                {active.map(a => (
                  <div key={a.key} className="bg-crush-card border border-crush-border rounded-xl py-3 flex flex-col items-center gap-1">
                    <span className="text-2xl">{a.emoji}</span>
                    <Stars value={d[a.ratingKey]} size="sm" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {d.photos && d.photos.length > 0 && (
            <div className="mt-3">
              <p className="text-crush-muted text-xs font-semibold mb-2">Fotos</p>
              <div className="flex gap-2 flex-wrap">
                {d.photos.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer">
                    <img src={url} className="w-24 h-24 rounded-xl object-cover hover:opacity-80 transition-opacity" alt="" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {d.review && (
            <div className="mt-3">
              <p className="text-crush-muted text-xs font-semibold mb-1">Anotações</p>
              <p className="text-white text-sm leading-relaxed">{d.review}</p>
            </div>
          )}

          <button
            onClick={onEdit}
            className="mt-4 w-full bg-crush-indigo border border-crush-indigo-border text-crush-indigo-text font-semibold text-sm rounded-xl py-2.5 hover:opacity-90 transition-opacity"
          >
            Editar Date
          </button>
        </div>
      )}
    </div>
  )
}

export default function CrushDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [crush, setCrush] = useState<Crush | null>(null)
  const [dates, setDates] = useState<CrushDate[]>([])
  const [loading, setLoading] = useState(true)

  const loadDates = useCallback(async () => {
    if (!id) return
    const { data } = await supabase
      .from('crush_dates')
      .select('*')
      .eq('crush_id', id)
      .order('date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
    if (data) setDates(data as CrushDate[])
  }, [id])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    supabase.from('crushes').select('*').eq('id', id).single<Crush>().then(({ data }) => {
      if (data) setCrush(data)
      setLoading(false)
    })
    loadDates()
  }, [id, loadDates])

  if (loading) return (
    <div className="min-h-screen bg-crush-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-crush-pink border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!crush) return (
    <div className="min-h-screen bg-crush-bg flex items-center justify-center">
      <p className="text-white">Crush não encontrado.</p>
    </div>
  )

  const filledSocials = SOCIALS.filter(f => crush[f.key]?.trim())

  return (
    <div className="min-h-screen bg-crush-bg">
      {/* Header with back button */}
      <div className="sticky top-0 bg-crush-bg/95 backdrop-blur z-30 border-b border-crush-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-crush-muted hover:text-white transition-colors text-xl">←</button>
        <h2 className="text-white font-bold truncate flex-1">{crush.name}</h2>
      </div>

      {/* Photo header — avatar centralizado, tamanho fixo */}
      <div className="bg-crush-card border-b border-crush-border px-6 py-8 flex flex-col items-center gap-4">
        <div
          style={{
            width: 160, height: 160, borderRadius: '50%',
            overflow: 'hidden', flexShrink: 0,
            border: crush.is_top ? '4px solid #FFD700' : '3px solid #3A3F45',
          }}
        >
          {crush.photo_url ? (
            <img
              src={crush.photo_url}
              alt={crush.name}
              style={{ width: 160, height: 160, objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div
              className="bg-crush-border flex items-center justify-center text-6xl"
              style={{ width: 160, height: 160 }}
            >
              💘
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-1">
          <h1 className="text-white text-2xl font-bold text-center">{crush.name}</h1>
          <Stars value={crush.interest_rating} size="lg" />
          {crush.is_top && (
            <span className="text-crush-gold font-black text-sm tracking-widest mt-1">⭐ TOP</span>
          )}
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        <Collapsible title="Interesse" defaultOpen>
          <Stars value={crush.interest_rating} size="xl" />
        </Collapsible>

        <Collapsible title="Redes Sociais">
          {filledSocials.length === 0 ? (
            <p className="text-crush-muted text-sm">Nenhuma rede cadastrada</p>
          ) : (
            <div className="flex flex-col divide-y divide-crush-border">
              {filledSocials.map(f => {
                const val = crush[f.key] as string
                const handle = val.startsWith('@') ? val.slice(1) : val
                return (
                  <a
                    key={f.key}
                    href={`${f.prefix}${handle}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex justify-between items-center py-2.5 hover:opacity-80 transition-opacity"
                  >
                    <span className="text-crush-muted text-sm">{f.label}</span>
                    <span className="text-crush-pink text-sm font-semibold">{val}</span>
                  </a>
                )
              })}
            </div>
          )}
        </Collapsible>

        <Collapsible title="Notas">
          {crush.review ? (
            <p className="text-white text-sm leading-relaxed">{crush.review}</p>
          ) : (
            <p className="text-crush-muted text-sm">Sem anotações ainda.</p>
          )}
        </Collapsible>

        <Collapsible title={`Dates (${dates.length})`}>
          {dates.length === 0 ? (
            <p className="text-crush-muted text-sm mb-3">Nenhum date registrado.</p>
          ) : (
            dates.map((d, i) => (
              <DateCard
                key={d.id}
                d={d}
                num={dates.length - i}
                onEdit={() => navigate(`/dates/${d.id}/edit`)}
              />
            ))
          )}
          <button
            onClick={() => navigate(`/dates/new?crushId=${crush.id}`)}
            className="w-full bg-crush-green text-white font-semibold rounded-xl py-3 text-sm hover:opacity-90 transition-opacity mt-1"
          >
            Registrar Date
          </button>
        </Collapsible>

        <button
          onClick={() => navigate(`/crushes/${crush.id}/edit`)}
          className="w-full bg-crush-pink text-white font-semibold rounded-xl py-3.5 text-sm hover:opacity-90 transition-opacity mt-2"
        >
          Editar
        </button>
      </div>
    </div>
  )
}
