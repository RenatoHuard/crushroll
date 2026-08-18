import { useEffect, useRef } from 'react'

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const wrapRef  = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const wrap  = wrapRef.current
    const inner = innerRef.current
    if (!wrap || !inner) return

    // Double RAF garante que o browser pintou o estado inicial (opacity 0)
    // antes de aplicar o estado final — sem isso a transição não dispara
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        wrap.style.opacity  = '1'
        inner.style.opacity   = '1'
        inner.style.transform = 'scale(1)'
      })
    })

    const t1 = setTimeout(() => {
      wrap.style.opacity    = '0'
      inner.style.transform = 'scale(0.96)'
    }, 1900)

    const t2 = setTimeout(() => onDone(), 2500)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onDone])

  const iconUrl = `${import.meta.env.BASE_URL}icon.png`

  return (
    <div
      ref={wrapRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-crush-bg"
      style={{ opacity: 0, transition: 'opacity 0.55s ease' }}
    >
      <div
        ref={innerRef}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          opacity: 0,
          transform: 'scale(0.82)',
          transition: 'opacity 0.45s ease, transform 0.5s cubic-bezier(.34,1.4,.64,1)',
        }}
      >
        <img
          src={iconUrl}
          alt="CrushDex"
          draggable={false}
          style={{ width: 140, height: 140, borderRadius: 32 }}
        />
        <h1
          className="text-white font-black tracking-tight"
          style={{ fontSize: 30, marginTop: 26, letterSpacing: '-0.5px' }}
        >
          CrushDex
        </h1>
        <p className="text-crush-muted text-sm" style={{ marginTop: 6 }}>
          Seu pokédex de crushes
        </p>
      </div>
    </div>
  )
}
