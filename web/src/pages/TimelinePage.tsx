import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface TimelineEntry {
  id: string
  date: string | null
  created_at: string
  location: string | null
  had_chat: boolean; had_kiss: boolean; had_pirulito: boolean
  had_donut: boolean; had_fire: boolean; had_sweat: boolean
  crushes: { name: string; photo_url: string | null } | { name: string; photo_url: string | null }[] | null
}

type ActivityKey = 'had_chat' | 'had_kiss' | 'had_pirulito' | 'had_donut' | 'had_fire' | 'had_sweat'
interface Bar { ym: string; label: string; count: number }
interface Period { year: number; half: 1 | 2 }

const MONTH_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const ACTS: { key: ActivityKey; emoji: string; label: string }[] = [
  { key: 'had_chat',     emoji: '💬', label: 'Conversa' },
  { key: 'had_kiss',     emoji: '💋', label: 'Beijo'    },
  { key: 'had_pirulito', emoji: '🍭', label: 'Pirulito' },
  { key: 'had_donut',    emoji: '🍩', label: 'Donut'    },
  { key: 'had_fire',     emoji: '🔥', label: 'Fogo'     },
  { key: 'had_sweat',    emoji: '💦', label: 'Suor'     },
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
  const year = parseInt(date.slice(0, 4))
  const month = parseInt(date.slice(5, 7))
  return year === p.year && periodMonths(p).includes(month)
}
function periodHasData(entries: TimelineEntry[], p: Period): boolean {
  return entries.some(e => e.date != null && dateInPeriod(e.date, p))
}
function periodGt(a: Period, b: Period): boolean {
  return a.year > b.year || (a.year === b.year && a.half > b.half)
}
function buildBars(entries: TimelineEntry[], key: ActivityKey, p: Period): Bar[] {
  const map = new Map<string, number>()
  for (const e of entries) {
    if (!e.date || !e[key]) continue
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

const CHART_H = 120 // px — altura fixa da área de barras

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
            {/* Coluna de altura fixa — barra cresce de baixo para cima */}
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

export default function TimelinePage() {
  const [entries, setEntries]         = useState<TimelineEntry[]>([])
  const [loading, setLoading]         = useState(true)
  const [selectedAct, setSelectedAct] = useState<ActivityKey>('had_kiss')
  const [period, setPeriod]           = useState<Period>(currentPeriod())

  useEffect(() => {
    setLoading(true)
    supabase
      .from('crush_dates')
      .select(`id, date, created_at, location, had_chat, had_kiss, had_pirulito, had_donut, had_fire, had_sweat, crushes (name, photo_url)`)
      .order('date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) {
          const list = data as unknown as TimelineEntry[]
          setEntries(list)
          // Abre no último período com dados (não necessariamente o atual)
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
  // Navigate freely: back to 2020, forward up to current period
  const hasPrev = prev.year >= 2020
  const hasNext = !periodGt(next, cp)
  const bars = buildBars(entries, selectedAct, period)
  const periodEntries = entries.filter(e => e.date != null && dateInPeriod(e.date!, period))

  if (loading) return (
    <div className="min-h-screen bg-crush-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-crush-pink border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-crush-bg">
      <div className="sticky top-0 bg-crush-bg/95 backdrop-blur z-30 border-b border-crush-border px-4 py-3">
        <h2 className="text-white font-bold text-lg">Timeline</h2>
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        {/* Dashboard */}
        <h3 className="text-white font-black text-lg mb-3">Dashboard</h3>

        {/* Activity selector */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
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
              const isLast = idx === periodEntries.length - 1
              const activeActs = ACTS.filter(a => entry[a.key])
              const crush = Array.isArray(entry.crushes) ? entry.crushes[0] : entry.crushes

              return (
                <div key={entry.id} className="flex">
                  {/* Timeline line */}
                  <div className="flex flex-col items-center w-11">
                    <div className="mt-3 w-4 h-4 rounded-full border-2 border-crush-pink bg-[#3D1A26] flex items-center justify-center z-10 shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-crush-pink" />
                    </div>
                    {!isLast && <div className="w-0.5 flex-1 bg-crush-border mt-1 mb-1" />}
                  </div>

                  {/* Card */}
                  <div className={`flex-1 bg-crush-card border border-crush-border rounded-xl p-3 ml-2 ${isLast ? '' : 'mb-3'}`}>
                    <p className="text-crush-pink text-[10px] font-bold uppercase tracking-wider mb-2">
                      {entry.date ? fmtDate(entry.date) : 'Sem data'}
                    </p>
                    <div className="flex items-center gap-3">
                      {crush?.photo_url ? (
                        <img src={crush.photo_url} className="w-12 h-12 rounded-full object-cover border-2 border-crush-border shrink-0" alt="" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-crush-border flex items-center justify-center text-xl shrink-0">💘</div>
                      )}
                      <div className="min-w-0">
                        <p className="text-white font-bold text-sm truncate">{crush?.name ?? '?'}</p>
                        {entry.location && <p className="text-crush-muted text-xs truncate mt-0.5">📍 {entry.location}</p>}
                        {activeActs.length > 0 && <p className="text-lg mt-1">{activeActs.map(a => a.emoji).join(' ')}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
