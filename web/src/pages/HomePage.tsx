import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/supabase'
import Stars from '../components/Stars'

// Custom pink marker icon — avoids Vite/Leaflet asset path issues
const pinkMarker = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;background:#E1306C;border-radius:50%;border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,.5)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  popupAnchor: [0, -12],
})

// Module-level geocode cache — survives component re-mounts
const geocodeCache = new Map<string, [number, number] | null>()

async function geocodeOne(loc: string): Promise<[number, number] | null> {
  if (geocodeCache.has(loc)) return geocodeCache.get(loc)!
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(loc)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'CrushDex-web/1.0' } }
    )
    const data = await res.json()
    const pt: [number, number] | null =
      data.length > 0 ? [parseFloat(data[0].lat), parseFloat(data[0].lon)] : null
    geocodeCache.set(loc, pt)
    return pt
  } catch {
    geocodeCache.set(loc, null)
    return null
  }
}

type GeoPin = { loc: string; pos: [number, number] }

// Fits map to all pins (must be child of MapContainer)
function MapFitter({ pins }: { pins: GeoPin[] }) {
  const map = useMap()
  useEffect(() => {
    if (pins.length === 0) return
    if (pins.length === 1) { map.setView(pins[0].pos, 13); return }
    const bounds = L.latLngBounds(pins.map(p => p.pos))
    map.fitBounds(bounds, { padding: [40, 40] })
  }, [map, pins])
  return null
}

type CrushRow = {
  id: string
  name: string
  photo_url: string | null
  crush_number: number | null
  interest_rating: number
  is_top: boolean
  crush_dates: { id: string; date_rating: number }[]
}

function avgRating(c: CrushRow): number {
  const ratings = c.crush_dates.map(d => d.date_rating).filter(r => r > 0)
  if (ratings.length === 0) return c.interest_rating
  return Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length)
}

function CrushCard({ crush, sub }: { crush: CrushRow; sub: string }) {
  return (
    <Link
      to={`/crushes/${crush.id}`}
      className="flex items-center gap-3 bg-crush-bg rounded-xl px-3 py-2.5 hover:bg-crush-border transition-colors"
    >
      {crush.photo_url ? (
        <img
          src={crush.photo_url}
          className="w-11 h-11 rounded-full object-cover shrink-0"
          style={crush.is_top ? { border: '2px solid #FFD700' } : {}}
          alt={crush.name}
        />
      ) : (
        <div
          className="w-11 h-11 rounded-full bg-crush-border flex items-center justify-center text-lg shrink-0"
          style={crush.is_top ? { border: '2px solid #FFD700' } : {}}
        >
          💘
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm truncate">{crush.name}</p>
        <p className="text-crush-muted text-[11px] mt-0.5">{sub}</p>
      </div>
      <Stars value={avgRating(crush)} size="sm" />
    </Link>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const [totalCrushes, setTotalCrushes] = useState<number | null>(null)
  const [totalDates,   setTotalDates]   = useState<number | null>(null)
  const [withDate,    setWithDate]    = useState<CrushRow[]>([])
  const [withoutDate, setWithoutDate] = useState<CrushRow[]>([])
  const [pins,        setPins]        = useState<GeoPin[]>([])
  const [geocoding,   setGeocoding]   = useState(false)
  const [fabOpen,     setFabOpen]     = useState(false)
  const cancelRef = useRef(false)

  const load = useCallback(async () => {
    const [crushRes, dateCountRes, locationRes] = await Promise.all([
      supabase
        .from('crushes')
        .select('id, name, photo_url, crush_number, interest_rating, is_top, crush_dates(id, date_rating)')
        .order('crush_number', { ascending: true }),
      supabase.from('crush_dates').select('id', { count: 'exact', head: true }),
      supabase.from('crush_dates').select('location').not('location', 'is', null).neq('location', ''),
    ])

    if (crushRes.data) {
      const rows = crushRes.data as unknown as CrushRow[]
      setTotalCrushes(rows.length)
      const withD    = rows.filter(c => c.crush_dates.length > 0)
        .sort((a, b) => avgRating(b) - avgRating(a))
        .slice(0, 3)
      const withoutD = rows.filter(c => c.crush_dates.length === 0)
        .sort((a, b) => b.interest_rating - a.interest_rating)
        .slice(0, 3)
      setWithDate(withD)
      setWithoutDate(withoutD)
    }
    if (dateCountRes.count != null) setTotalDates(dateCountRes.count)

    if (locationRes.data) {
      const uniqueLocs = [
        ...new Set(
          (locationRes.data as { location: string }[])
            .map(r => r.location)
            .filter(Boolean)
        ),
      ]
      if (uniqueLocs.length > 0) {
        setGeocoding(true)
        cancelRef.current = false

        const run = async () => {
          for (let i = 0; i < uniqueLocs.length; i++) {
            if (cancelRef.current) break
            const pt = await geocodeOne(uniqueLocs[i])
            if (pt) {
              setPins(prev => {
                // avoid duplicates if already cached
                if (prev.some(p => p.loc === uniqueLocs[i])) return prev
                return [...prev, { loc: uniqueLocs[i], pos: pt }]
              })
            }
            // Nominatim rate limit: 1 req/sec
            if (i < uniqueLocs.length - 1 && !cancelRef.current) {
              await new Promise(r => setTimeout(r, 1100))
            }
          }
          setGeocoding(false)
        }
        run()
      }
    }
  }, [])

  useEffect(() => {
    load()
    return () => { cancelRef.current = true }
  }, [load])

  const mapCenter: [number, number] = pins.length > 0 ? pins[0].pos : [-15.78, -47.93]

  return (
    <div className="min-h-screen bg-crush-bg">
      <div className="sticky top-0 bg-crush-bg/95 backdrop-blur z-30 border-b border-crush-border px-4 py-3">
        <h2 className="text-white font-bold text-lg">Início</h2>
      </div>

      <div className="p-4 max-w-2xl mx-auto pb-32">

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-crush-card border border-crush-border rounded-2xl p-4 flex flex-col gap-1">
            <p className="text-crush-muted text-xs font-semibold uppercase tracking-wider">Crushes</p>
            <p className="text-white text-4xl font-black leading-none">
              {totalCrushes ?? '—'}
            </p>
            <p className="text-crush-muted text-[11px]">cadastrados</p>
          </div>
          <div className="bg-crush-card border border-crush-border rounded-2xl p-4 flex flex-col gap-1">
            <p className="text-crush-muted text-xs font-semibold uppercase tracking-wider">Dates</p>
            <p className="text-white text-4xl font-black leading-none">
              {totalDates ?? '—'}
            </p>
            <p className="text-crush-muted text-[11px]">registrados</p>
          </div>
        </div>

        {/* Map */}
        <h3 className="text-white font-black text-base mb-3">Mapa de Dates</h3>
        <div className="bg-crush-card border border-crush-border rounded-2xl overflow-hidden mb-6" style={{ height: 280 }}>
          {pins.length === 0 && !geocoding ? (
            <div className="h-full flex flex-col items-center justify-center gap-2">
              <span className="text-3xl">🗺️</span>
              <p className="text-crush-muted text-sm">Nenhum local registrado ainda.</p>
            </div>
          ) : (
            <div style={{ position: 'relative', height: '100%' }}>
              <MapContainer
                center={mapCenter}
                zoom={pins.length === 1 ? 13 : 5}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
                attributionControl={false}
              >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                {pins.map(pin => (
                  <Marker key={pin.loc} position={pin.pos} icon={pinkMarker}>
                    <Popup>
                      <span style={{ color: '#111', fontSize: 13, fontWeight: 600 }}>{pin.loc}</span>
                    </Popup>
                  </Marker>
                ))}
                <MapFitter pins={pins} />
              </MapContainer>
              {geocoding && (
                <div
                  style={{ position: 'absolute', bottom: 8, right: 8, zIndex: 500 }}
                  className="bg-crush-card/90 text-crush-muted text-[10px] px-2 py-1 rounded-lg flex items-center gap-1.5"
                >
                  <div className="w-3 h-3 border border-crush-pink border-t-transparent rounded-full animate-spin" />
                  Carregando locais…
                </div>
              )}
            </div>
          )}
        </div>

        {/* Top 3 com date */}
        {withDate.length > 0 && (
          <div className="mb-6">
            <h3 className="text-white font-black text-base mb-3">
              🏆 Top com Date
            </h3>
            <div className="bg-crush-card border border-crush-border rounded-2xl overflow-hidden divide-y divide-crush-border">
              {withDate.map((c, i) => (
                <div key={c.id} className="flex items-center">
                  <span className="text-crush-muted text-xs font-black w-8 text-center shrink-0">
                    #{i + 1}
                  </span>
                  <div className="flex-1 pr-2 py-1">
                    <CrushCard
                      crush={c}
                      sub={`${c.crush_dates.length} date${c.crush_dates.length !== 1 ? 's' : ''}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top 3 sem date */}
        {withoutDate.length > 0 && (
          <div className="mb-6">
            <h3 className="text-white font-black text-base mb-3">
              💘 Sem Date Ainda
            </h3>
            <div className="bg-crush-card border border-crush-border rounded-2xl overflow-hidden divide-y divide-crush-border">
              {withoutDate.map((c, i) => (
                <div key={c.id} className="flex items-center">
                  <span className="text-crush-muted text-xs font-black w-8 text-center shrink-0">
                    #{i + 1}
                  </span>
                  <div className="flex-1 pr-2 py-1">
                    <CrushCard crush={c} sub="Interesse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* FAB overlay */}
      {fabOpen && (
        <div className="fixed inset-0 bg-black/45 z-40" onClick={() => setFabOpen(false)} />
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
