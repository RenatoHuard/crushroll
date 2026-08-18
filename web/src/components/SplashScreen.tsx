import { useEffect, useState } from 'react'

type Phase = 'enter' | 'visible' | 'leave'

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>('enter')

  useEffect(() => {
    // enter → visible after first paint
    const t0 = setTimeout(() => setPhase('visible'), 50)
    // start fade-out at 2s
    const t1 = setTimeout(() => setPhase('leave'), 2000)
    // unmount at 2.6s (after 600ms transition)
    const t2 = setTimeout(() => onDone(), 2600)
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2) }
  }, [onDone])

  const opacity  = phase === 'visible' ? 1 : 0
  const scale    = phase === 'visible' ? 1 : phase === 'enter' ? 0.88 : 0.96
  const duration = phase === 'enter' ? '0.45s' : '0.6s'

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-crush-bg"
      style={{ transition: `opacity ${duration} ease`, opacity }}
    >
      <div
        style={{
          transition: `transform ${duration} cubic-bezier(.34,1.56,.64,1)`,
          transform: `scale(${scale})`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0,
        }}
      >
        <img
          src="icon.png"
          alt="CrushDex"
          style={{ width: 140, height: 140, borderRadius: 32 }}
          draggable={false}
        />
        <h1
          className="text-white font-black tracking-tight"
          style={{ fontSize: 32, marginTop: 28, letterSpacing: '-0.5px' }}
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
