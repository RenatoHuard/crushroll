import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Stars from '../components/Stars'

interface TimelineEntry {
  id: string
  date: string | null
  created_at: string
  location: string | null
  date_rating: number
  had_chat: boolean; had_kiss: boolean; had_pirulito: boolean
  had_donut: boolean; had_fire: boolean; had_sweat: boolean
  had_chat_rating: number; had_kiss_rating: number; had_pirulito_rating: number
  had_donut_rating: number; had_fire_rating: number; had_sweat_rating: number
  review: string | null
  photos: string[] | null
  crushes: { name: string; photo_url: string | null } | { name: string; photo_url: string | null }[] | null
}

type ActivityKey = 'had_chat' | 'had_kiss' | 'had_pirulito' | 'had_donut' | 'had_fire' | 'had_sweat'
type RatingKey   = 'had_chat_rating' | 'had_kiss_rating' | 'had_pirulito_rating' | 'had_donut_rating' | 'had_fire_rating' | 'had_sweat_rating'
type SelectedAct = ActivityKey | 'all'
interface Bar { ym: string; label: string; count: number }
interface Period { year: number; half: 1 | 2 }

const MONTH_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const ACTS: { key: ActivityKey; ratingKey: RatingKey; emoji: string; label: string }[] = [
  { key: 'had_chat',     ratingKey: 'had_chat_rating',     emoji: '💬', label: 'Conversa' },
  { key: 'had_kiss',     ratingKey: 'had_kiss_rating',     emoji: '💋', label: 'Beijo'    },
  { key: 'had_pirulito', ratingKey: 'had_pirulito_rating', emoji: '🍭', label: 'Pirulito' },
  { key: 'had_donut',    ratingKey: 'had_donut_rating',    emoji: '🍩', label: 'Donut'    },
  { key: 'had_fire',     ratingKey: 'had_fire_rating',     emoji: '🔥', label: 'Fogo'     },
  { key: 'had_sweat',    ratingKey: 'had_sweat_rating',    emoji: '💦', label: 'Suor'     },
]
const CHART_ACTS = ACTS.filter(a => a.key !== 'had_chat')

function periodMonths(p: Period): number[] {
  return p.half === 1 ? [1,2,3,4,5,6] : [7,8,9,10,11,12]
}
function periodLabel(p: Period): string {
  return p.half === 1 ? `Jan — Jun ${p.year}` : `Jul — Dez ${p.year}`
}
function prevPeriod(p: Period): Period {
  return p.half === 2 ? { year: p.year, half: 1 } : { year: p.year - 1, half: 2 }
}
function nextPeriod(p: Period): Period {
  return p.half === 1 ? { year: p.year, half: 2 } : { year: p.year + 1, half: 1 }
}
function currentPeriod(): Period {
  const now = new Date()
  return { year: now.getFullYear(), half: now.getMonth() < 6 ? 1 : 2 }
}
function dateInPeriod(date: string, p: Period): boolean {
  const year  = parseInt(date.slice(0, 4))
  const month = parseInt(date.slice(5, 7))
  return year === p.year && periodMonths(p).includes(month)
}
function periodGt(a: Period, b: Period): boolean {
  return a.year > b.year || (a.year === b.year && a.half > b.half)
}
function buildBars(entries: TimelineEntry[], act: SelectedAct, p: Period): Bar[] {
  const map = new Map<string, number>()
  for (const e of entries) {
    if (!e.date || !dateInPeriod(e.date, p)) continue
    if (act !== 'all' && !e[act]) continue
    const ym = e.date.slice(0, 7)
    map.set(ym, (map.get(ym) ?? 0) + 1)
  }
  return periodMonths(p).map(m => {
    const ym = `${p.year}-${String(m).padStart(2, '0')}`
    return { ym, label: MONTH_PT[m - 1], count: map.get(ym) ?? 0 }
  })
}
function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

const CHART_H = 120

function BarChart({ bars }: { bars: Bar[] }) {
  const maxCount = Math.max(...bars.map(b => b.count), 1)
  const allZero  = bars.every(b => b.count === 0)

  if (allZero) return (
    <div style={{ height: CHART_H + 48 }} className="flex items-center justify-center">
      <p className="text-[#5A5F65] text-sm">Sem registros neste período</p>
    </div>
  )

  return (
    <div className="flex gap-1 px-3 pb-3 pt-2">
      {bars.map(bar => {
        const barH = bar.count > 0 ? Math.max((bar.count / maxCount) * CHART_H, 8) : 2
        return (
          <div key={bar.ym} className="flex-1 flex flex-col items-center">
            <div style={{ height: CHART_H }} className="w-full flex flex-col justify-end items-center">
              {bar.count > 0 && (
                <span className="text-crush-pink text-[10px] font-bold mb-1 leading-none">{bar.count}</span>
              )}
              <div
                className="w-full rounded-t"
                style={{ height: barH, backgroundColor: bar.count > 0 ? '#E1306C' : '#2A2F35' }}
              />
            </div>
            <span className="text-crush-muted text-[9px] mt-1">{bar.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function DateModal({ entry, onClose }: { entry: TimelineEntry; onClose: () => void }) {
  const crush     = Array.isArray(entry.crushes) ? entry.crushes[0] : entry.crushes
  const activeActs = ACTS.filter(a => entry[a.key])

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-crush-card border border-crush-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-crush-border rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-crush-border">
          {crush?.photo_url ? (
            <img src={crush.photo_url} className="w-12 h-12 rounded-full object-cover border-2 border-crush-border shrink-0" alt="" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-crush-border flex items-center justify-center text-xl shrink-0">💘</div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm truncate">{crush?.name ?? '?'}</p>
            {entry.date && <p className="text-crush-pink text-xs font-semibold mt-0.5">{fmtDate(entry.date)}</p>}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Stars value={entry.date_rating} size="sm" />
            <button onClick={onClose} className="text-crush-muted hover:text-white text-xl leading-none">✕</button>
          </div>
        </div>

        <div className="px-4 py-4 flex flex-col gap-4">
          {/* Location */}
          {entry.location && (
            <div>
              <p className="text-white text-sm">📍 {entry.location}</p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(entry.location)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-block mt-1.5 bg-crush-bg border border-crush-border text-white text-xs rounded-lg px-3 py-1.5 hover:bg-crush-border transition-colors"
              >
                Ver no Mapa
              </a>
            </div>
          )}

          {/* Activities grid */}
          {activeActs.length > 0 && (
            <div>
              <p className="text-crush-muted text-xs font-semibold mb-2">O que rolou</p>
              <div className="grid grid-cols-3 gap-2">
                {activeActs.map(a => (
                  <div key={a.key} className="bg-crush-bg border border-crush-border rounded-xl py-3 flex flex-col items-center gap-1">
                    <span className="text-2xl">{a.emoji}</span>
                    <Stars value={entry[a.ratingKey]} size="sm" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Photos */}
          {entry.photos && entry.photos.length > 0 && (
            <div>
              <p className="text-crush-muted text-xs font-semibold mb-2">Fotos</p>
              <div className="flex gap-2 flex-wrap">
                {entry.photos.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer">
                    <img src={url} className="w-24 h-24 rounded-xl object-cover hover:opacity-80 transition-opacity" alt="" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Review */}
          {entry.review && (
            <div>
              <p className="text-crush-muted text-xs font-semibold mb-1">Anotações</p>
              <p className="text-white text-sm leading-relaxed">{entry.review}</p>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full bg-crush-border text-white font-semibold rounded-xl py-3 text-sm hover:opacity-80 transition-opacity"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TimelinePage() {
  const [entries, setEntries]         = useState<TimelineEntry[]>([])
  const [loading, setLoading]         = useState(true)
  const [selectedAct, setSelectedAct] = useState<SelectedAct>('all')
  const [period, setPeriod]           = useState<Period>(currentPeriod())
  const [modalEntry, setModalEntry]   = useState<TimelineEntry | null>(null)

  useEffect(() => {
    setLoading(true)
    supabase
      .from('crush_dates')
      .select(`id, date, created_at, location,
        date_rating,
        had_chat, had_kiss, had_pirulito, had_donut, had_fire, had_sweat,
        had_chat_rating, had_kiss_rating, had_pirulito_rating, had_donut_rating, had_fire_rating, had_sweat_rating,
        review, photos,
        crushes (name, photo_url)`)
      .order('date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) {
          const list = data as unknown as TimelineEntry[]
          setEntries(list)
          const mostRecent = list.find(e => e.date)?.date
          if (mostRecent) {
            const y = parseInt(mostRecent.slice(0, 4))
            const m = parseInt(mostRecent.slice(5, 7))
            setPeriod({ year: y, half: m <= 6 ? 1 : 2 })
          }
        }
        setLoading(false)
      })
  }, [])

  const cp   = currentPeriod()
  const prev = prevPeriod(period)
  const next = nextPeriod(period)
  const hasPrev = prev.year >= 2020
  const hasNext = !periodGt(next, cp)

  const bars = buildBars(entries, selectedAct, period)

  const periodEntries = entries.filter(e => {
    if (!e.date || !dateInPeriod(e.date, period)) return false
    if (selectedAct !== 'all' && !e[selectedAct]) return false
    return true
  })

  if (loading) return (
    <div className="min-h-screen bg-crush-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-crush-pink border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-crush-bg">
      {modalEntry && <DateModal entry={modalEntry} onClose={() => setModalEntry(null)} />}

      <div className="sticky top-0 bg-crush-bg/95 backdrop-blur z-30 border-b border-crush-border px-4 py-3">
        <h2 className="text-white font-bold text-lg">Timeline</h2>
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        {/* Dashboard */}
        <h3 className="text-white font-black text-lg mb-3">Dashboard</h3>

        {/* Activity selector */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {/* Todos pill */}
          <button
            onClick={() => setSelectedAct('all')}
            className={`flex flex-col items-center px-4 py-2 rounded-xl border transition-colors shrink-0
              ${selectedAct === 'all'
                ? 'border-crush-pink bg-[#3D1A26]'
                : 'border-crush-border bg-crush-card hover:bg-crush-border'
              }`}
          >
            <span className="text-xl">📅</span>
            <span className={`text-[10px] font-semibold mt-0.5 ${selectedAct === 'all' ? 'text-crush-pink' : 'text-crush-muted'}`}>Todos</span>
          </button>

          {CHART_ACTS.map(a => (
            <button
              key={a.key}
              onClick={() => setSelectedAct(a.key)}
              className={`flex flex-col items-center px-4 py-2 rounded-xl border transition-colors shrink-0
                ${selectedAct === a.key
                  ? 'border-crush-pink bg-[#3D1A26]'
                  : 'border-crush-border bg-crush-card hover:bg-crush-border'
                }`}
            >
              <span className="text-xl">{a.emoji}</span>
              <span className={`text-[10px] font-semibold mt-0.5 ${selectedAct === a.key ? 'text-crush-pink' : 'text-crush-muted'}`}>{a.label}</span>
            </button>
          ))}
        </div>

        {/* Chart card */}
        <div className="bg-crush-card border border-crush-border rounded-2xl mb-8 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-crush-border">
            <button
              onClick={() => hasPrev && setPeriod(prev)}
              disabled={!hasPrev}
              className={`text-2xl font-bold transition-colors ${hasPrev ? 'text-crush-pink hover:opacity-70' : 'text-crush-border cursor-not-allowed'}`}
            >
              ‹
            </button>
            <span className="text-white text-sm font-bold">{periodLabel(period)}</span>
            <button
              onClick={() => hasNext && setPeriod(next)}
              disabled={!hasNext}
              className={`text-2xl font-bold transition-colors ${hasNext ? 'text-crush-pink hover:opacity-70' : 'text-crush-border cursor-not-allowed'}`}
            >
              ›
            </button>
          </div>
          <BarChart bars={bars} />
        </div>

        {/* Timeline */}
        <h3 className="text-white font-black text-lg mb-1">Linha do Tempo</h3>
        <p className="text-crush-muted text-xs mb-5">{periodLabel(period)}</p>

        {periodEntries.length === 0 ? (
          <div className="flex flex-col items-center py-10 gap-2">
            <span className="text-4xl">📅</span>
            <p className="text-crush-muted text-sm">Sem dates neste período.</p>
          </div>
        ) : (
          <div>
            {periodEntries.map((entry, idx) => {
              const isLast    = idx === periodEntries.length - 1
              const activeActs = ACTS.filter(a => entry[a.key])
              const crush     = Array.isArray(entry.crushes) ? entry.crushes[0] : entry.crushes

              return (
                <div key={entry.id} className="flex">
                  {/* Timeline line */}
                  <div className="flex flex-col items-center w-11">
                    <div className="mt-3 w-4 h-4 rounded-full border-2 border-crush-pink bg-[#3D1A26] flex items-center justify-center z-10 shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-crush-pink" />
                    </div>
                    {!isLast && <div className="w-0.5 flex-1 bg-crush-border mt-1 mb-1" />}
                  </div>

                  {/* Card — clickable */}
                  <button
                    type="button"
                    onClick={() => setModalEntry(entry)}
                    className={`flex-1 bg-crush-card border border-crush-border rounded-xl p-3 ml-2 text-left hover:bg-crush-border/60 transition-colors ${isLast ? '' : 'mb-3'}`}
                  >
                    <p className="text-crush-pink text-[10px] font-bold uppercase tracking-wider mb-2">
                      {entry.date ? fmtDate(entry.date) : 'Sem data'}
                    </p>
                    <div className="flex items-center gap-3">
                      {crush?.photo_url ? (
                        <img src={crush.photo_url} className="w-12 h-12 rounded-full object-cover border-2 border-crush-border shrink-0" alt="" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-crush-border flex items-center justify-center text-xl shrink-0">💘</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-white font-bold text-sm truncate">{crush?.name ?? '?'}</p>
                        {entry.location && <p className="text-crush-muted text-xs truncate mt-0.5">📍 {entry.location}</p>}
                        {activeActs.length > 0 && <p className="text-lg mt-1">{activeActs.map(a => a.emoji).join(' ')}</p>}
                      </div>
                      <Stars value={entry.date_rating} size="sm" />
                    </div>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
