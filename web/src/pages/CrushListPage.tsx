import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Crush } from '../lib/types'
import Stars from '../components/Stars'

type SortMode = 'recentes' | 'classificacao'
type SortDir  = 'asc' | 'desc'
type FilterMode = 'todos' | 'com_date' | 'sem_date'
type ViewMode = 'grid' | 'list'

type DateScore = {
  id: string
  date_rating: number
  had_chat_rating: number
  had_kiss_rating: number
  had_pirulito_rating: number
  had_donut_rating: number
  had_fire_rating: number
  had_sweat_rating: number
}

type CrushListItem = Crush & { crush_dates: DateScore[] }

function totalScore(item: CrushListItem): number {
  let s = item.interest_rating
  for (const d of item.crush_dates ?? []) {
    s += d.date_rating + d.had_chat_rating + d.had_kiss_rating
       + d.had_pirulito_rating + d.had_donut_rating + d.had_fire_rating + d.had_sweat_rating
  }
  return s
}

function cardBg(rating: number): string {
  if (rating <= 2) return '#262B31'
  if (rating <= 4) return '#2D1B22'
  return '#2D2400'
}

function pokedexNum(n: number | null, fallback: number): string {
  return `#${String(n ?? fallback + 1).padStart(3, '0')}`
}

export default function CrushListPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [allCrushes, setAllCrushes] = useState<CrushListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('recentes')
  const [sortDirs, setSortDirs] = useState<Record<SortMode, SortDir>>({ recentes: 'desc', classificacao: 'desc' })
  const [filterMode, setFilterMode] = useState<FilterMode>('todos')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [fabOpen, setFabOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [crushRes, profileRes] = await Promise.all([
      supabase.from('crushes').select(
        '*, crush_dates(id, date_rating, had_chat_rating, had_kiss_rating, had_pirulito_rating, had_donut_rating, had_fire_rating, had_sweat_rating)'
      ).order('crush_number', { ascending: true }),
      session?.user.id
        ? supabase.from('profiles').select('photo_url').eq('id', session.user.id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ])
    if (!crushRes.error && crushRes.data) setAllCrushes(crushRes.data as CrushListItem[])
    if (!profileRes.error && profileRes.data) setProfilePhoto((profileRes.data as { photo_url: string | null }).photo_url)
    setLoading(false)
  }, [session?.user.id])

  useEffect(() => { load() }, [load])

  function handleSort(mode: SortMode) {
    if (mode === sortMode) {
      setSortDirs(prev => ({ ...prev, [mode]: prev[mode] === 'desc' ? 'asc' : 'desc' }))
    } else {
      setSortMode(mode)
    }
  }

  const sorted = [...allCrushes].sort((a, b) => {
    const dir = sortDirs[sortMode] === 'asc' ? 1 : -1
    if (sortMode === 'recentes') return ((a.crush_number ?? 0) - (b.crush_number ?? 0)) * dir
    if (a.is_top !== b.is_top) return a.is_top ? dir : -dir
    return (totalScore(a) - totalScore(b)) * dir
  })

  const displayed = sorted.filter(c => {
    const has = (c.crush_dates?.length ?? 0) > 0
    if (filterMode === 'com_date') return has
    if (filterMode === 'sem_date') return !has
    return true
  })

  return (
    <div className="min-h-screen bg-crush-bg">
      {/* Header */}
      <div className="sticky top-0 bg-crush-bg/95 backdrop-blur z-30 border-b border-crush-border px-4 py-3 flex items-center justify-between">
        <h2 className="text-white font-bold text-lg">Meus Crushes</h2>
        <button onClick={() => navigate('/profile')} className="focus:outline-none">
          {profilePhoto ? (
            <img src={profilePhoto} className="w-9 h-9 rounded-full object-cover border-2 border-crush-pink" alt="perfil" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-crush-card border-2 border-crush-border flex items-center justify-center text-lg">👤</div>
          )}
        </button>
      </div>

      <div className="p-4 max-w-4xl mx-auto">
        {/* Filter + view toggle row */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {(['todos', 'com_date', 'sem_date'] as FilterMode[]).map(f => (
            <button
              key={f}
              onClick={() => setFilterMode(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                ${filterMode === f
                  ? 'bg-crush-pink border-crush-pink text-white'
                  : 'bg-crush-card border-crush-border text-crush-muted hover:text-white'
                }`}
            >
              {f === 'todos' ? 'Todos' : f === 'com_date' ? 'Com Date' : 'Sem Date'}
            </button>
          ))}
          <div className="ml-auto flex gap-1">
            {(['grid', 'list'] as ViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={`w-8 h-8 rounded-lg border text-sm flex items-center justify-center transition-colors
                  ${viewMode === v
                    ? 'bg-crush-border border-crush-muted text-white'
                    : 'bg-crush-card border-crush-border text-crush-muted hover:text-white'
                  }`}
              >
                {v === 'grid' ? '⊞' : '≡'}
              </button>
            ))}
          </div>
        </div>

        {/* Sort row */}
        <div className="flex gap-2 mb-4">
          {(['recentes', 'classificacao'] as SortMode[]).map(s => (
            <button
              key={s}
              onClick={() => handleSort(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors
                ${sortMode === s
                  ? 'bg-crush-pink border-crush-pink text-white'
                  : 'bg-crush-card border-crush-border text-crush-muted hover:text-white'
                }`}
            >
              {s === 'recentes' ? 'Recentes' : 'Classificação'}
              {sortDirs[s] === 'desc' ? ' ↓' : ' ↑'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-crush-pink border-t-transparent rounded-full animate-spin" />
          </div>
        ) : displayed.length === 0 ? (
          <p className="text-crush-muted text-center py-16 text-sm">Nenhum crush cadastrado ainda.</p>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {displayed.map((item, idx) => {
              const hasDate = (item.crush_dates?.length ?? 0) > 0
              return (
                <Link
                  key={item.id}
                  to={`/crushes/${item.id}`}
                  className="rounded-xl p-3 flex flex-col items-center relative transition-transform hover:scale-[1.02] active:scale-95"
                  style={{
                    backgroundColor: cardBg(item.interest_rating),
                    border: item.is_top ? '2px solid #FFD700' : '2px solid transparent',
                  }}
                >
                  <span className="absolute top-2 left-2 text-crush-muted text-[10px] font-bold">
                    {pokedexNum(item.crush_number, idx)}
                  </span>
                  <div className="self-end flex gap-1 mb-2 min-h-[20px]">
                    {item.is_top && <span className="bg-crush-gold text-black text-[9px] font-black px-1.5 py-0.5 rounded">TOP</span>}
                    {hasDate && <span className="bg-crush-green text-white text-[9px] font-bold px-1.5 py-0.5 rounded">Date</span>}
                  </div>
                  <div className="mb-2">
                    {item.photo_url ? (
                      <img
                        src={item.photo_url}
                        className="w-16 h-16 rounded-full object-cover"
                        style={item.is_top ? { border: '2px solid #FFD700' } : {}}
                        alt={item.name}
                      />
                    ) : (
                      <div
                        className="w-16 h-16 rounded-full bg-crush-border flex items-center justify-center text-2xl"
                        style={item.is_top ? { border: '2px solid #FFD700' } : {}}
                      >
                        💘
                      </div>
                    )}
                  </div>
                  <p className="text-white text-sm font-bold text-center truncate w-full mb-1">{item.name}</p>
                  <Stars value={item.interest_rating} size="sm" />
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {displayed.map((item, idx) => {
              const hasDate = (item.crush_dates?.length ?? 0) > 0
              return (
                <Link
                  key={item.id}
                  to={`/crushes/${item.id}`}
                  className="flex items-center gap-3 bg-crush-card rounded-xl px-3 py-3 hover:bg-crush-border transition-colors"
                >
                  <span className="text-crush-muted text-[10px] font-bold w-8 shrink-0">
                    {pokedexNum(item.crush_number, idx)}
                  </span>
                  {item.photo_url ? (
                    <img
                      src={item.photo_url}
                      className="w-11 h-11 rounded-full object-cover shrink-0"
                      style={item.is_top ? { border: '2px solid #FFD700' } : {}}
                      alt={item.name}
                    />
                  ) : (
                    <div
                      className="w-11 h-11 rounded-full bg-crush-border flex items-center justify-center text-lg shrink-0"
                      style={item.is_top ? { border: '2px solid #FFD700' } : {}}
                    >
                      💘
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{item.name}</p>
                    <div className="flex gap-1 mt-1">
                      {item.is_top && <span className="bg-crush-gold text-black text-[9px] font-black px-1.5 py-0.5 rounded">TOP</span>}
                      {hasDate && <span className="bg-crush-green text-white text-[9px] font-bold px-1.5 py-0.5 rounded">Date</span>}
                    </div>
                  </div>
                  <Stars value={item.interest_rating} size="md" />
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* FAB overlay */}
      {fabOpen && (
        <div
          className="fixed inset-0 bg-black/45 z-40"
          onClick={() => setFabOpen(false)}
        />
      )}

      {/* Speed-dial FAB */}
      <div className="fixed bottom-24 md:bottom-6 right-5 flex flex-col items-end gap-3 z-50">
        {fabOpen && (
          <>
            <div className="flex items-center gap-3">
              <span className="bg-black/70 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">Registrar Date</span>
              <button
                onClick={() => { setFabOpen(false); navigate('/dates/new') }}
                className="w-12 h-12 rounded-full bg-crush-green flex items-center justify-center text-xl shadow-lg hover:opacity-90 transition-opacity"
              >
                📅
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="bg-black/70 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">Novo Crush</span>
              <button
                onClick={() => { setFabOpen(false); navigate('/crushes/new') }}
                className="w-12 h-12 rounded-full bg-crush-pink flex items-center justify-center text-xl shadow-lg hover:opacity-90 transition-opacity"
              >
                💘
              </button>
            </div>
          </>
        )}
        <button
          onClick={() => setFabOpen(p => !p)}
          className="w-14 h-14 rounded-full bg-crush-pink flex items-center justify-center text-white text-3xl shadow-xl hover:opacity-90 transition-opacity"
        >
          {fabOpen ? '×' : '+'}
        </button>
      </div>
    </div>
  )
}
