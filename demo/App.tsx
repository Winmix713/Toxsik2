import { useState, useEffect, useRef, useCallback } from 'react'

/* ── Utilities ─────────────────────────────────────────────────── */
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

function useTheme(): ['light' | 'dark', () => void] {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const stored = localStorage.getItem('theme')
      if (stored === 'light' || stored === 'dark') return stored
    } catch { /* */ }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('theme', theme) } catch { /* */ }
  }, [theme])

  const toggle = useCallback(() => setTheme(t => t === 'dark' ? 'light' : 'dark'), [])
  return [theme, toggle]
}

/* ── RangeControl ──────────────────────────────────────────────── */
interface RangeControlProps {
  label: string
  min: number
  max: number
  step: number
  defaultValue: number
  value: number
  unit: string
  decimals: number
  ticks: number
  onChange: (v: number) => void
}

function RangeControl({
  label, min, max, step, defaultValue, value, unit, decimals, ticks, onChange
}: RangeControlProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const editRef = useRef<HTMLInputElement>(null)
  const fillRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const numRef = useRef<HTMLSpanElement>(null)

  const [isDrag, setIsDrag] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [isHover, setIsHover] = useState(false)

  const dragState = useRef({ startX: 0, startVal: 0, fine: false })
  const elW = useRef(260)

  const fmt = useCallback((v: number) => v.toFixed(decimals), [decimals])
  const isModified = Math.abs(value - defaultValue) > 1e-9

  /* Imperative paint — zero-jank during drag */
  const paint = useCallback((v: number) => {
    const track = trackRef.current
    if (!track) return
    const w = elW.current
    const thumbW = 22
    const p = (v - min) / (max - min)
    const thumbX = thumbW / 2 + p * (w - thumbW)
    if (fillRef.current) fillRef.current.style.width = `${p * 100}%`
    if (thumbRef.current) thumbRef.current.style.left = `${thumbX}px`
    if (glowRef.current) glowRef.current.style.left = `${thumbX}px`
    if (numRef.current) numRef.current.textContent = fmt(v)
    if (editRef.current) editRef.current.value = fmt(v)
    if (inputRef.current) {
      inputRef.current.setAttribute('aria-valuenow', String(v))
      inputRef.current.setAttribute('aria-valuetext', `${fmt(v)}${unit}`)
    }
  }, [min, max, fmt, unit])

  useEffect(() => {
    if (trackRef.current) elW.current = trackRef.current.clientWidth || 260
    paint(value)
  }, [value, paint])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const ro = new ResizeObserver(() => {
      elW.current = track.clientWidth || 260
      paint(value)
    })
    ro.observe(track)
    return () => ro.disconnect()
  }, [value, paint])

  const snapValue = useCallback((v: number) => {
    const snapped = Math.round(v / step) * step
    return clamp(+snapped.toFixed(8), min, max)
  }, [step, min, max])

  const setValue = useCallback((v: number) => {
    const sv = snapValue(v)
    paint(sv)
    onChange(sv)
    return sv
  }, [snapValue, paint, onChange])

  const handleInput = () => {
    if (!inputRef.current) return
    const v = +inputRef.current.value
    paint(v)
    onChange(v)
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDrag(true)
    elW.current = trackRef.current?.clientWidth || 260
    dragState.current = { startX: e.clientX, startVal: value, fine: e.shiftKey || e.altKey }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrag || !dragState.current.fine) return
    const range = max - min
    const dx = e.clientX - dragState.current.startX
    const trackLen = Math.max(1, elW.current - 22)
    const mult = e.shiftKey ? 0.10 : e.altKey ? 0.35 : 1
    const next = clamp(dragState.current.startVal + (dx / trackLen) * range * mult, min, max)
    if (inputRef.current) inputRef.current.value = String(next)
    paint(next)
    onChange(next)
  }

  const handlePointerUp = () => setIsDrag(false)

  const openEdit = () => {
    setIsEdit(true)
    requestAnimationFrame(() => {
      editRef.current?.focus()
      editRef.current?.select()
    })
  }

  const commitEdit = (cancel: boolean) => {
    if (!cancel && editRef.current) {
      const v = parseFloat(editRef.current.value.replace(',', '.'))
      if (Number.isFinite(v)) setValue(v)
    }
    setIsEdit(false)
    paint(value)
  }

  const handleWheel = (e: React.WheelEvent) => {
    if (document.activeElement !== inputRef.current) return
    e.preventDefault()
    const range = max - min
    const u = range / (e.shiftKey ? 400 : 80)
    setValue(value - Math.sign(e.deltaY) * u)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isEdit) return
    const range = max - min
    switch (e.key) {
      case 'PageUp':   setValue(value + range / 10); e.preventDefault(); break
      case 'PageDown': setValue(value - range / 10); e.preventDefault(); break
      case 'Home':     setValue(min); e.preventDefault(); break
      case 'End':      setValue(max); e.preventDefault(); break
      case 'Enter':    openEdit(); e.preventDefault(); break
    }
  }

  const tickArr = Array.from({ length: ticks })

  /* Class strings */
  const rowCls = [
    'rc-track-row',
    isDrag  ? 'is-drag'  : '',
    isHover ? 'is-hover' : '',
    isEdit  ? 'is-edit'  : '',
  ].filter(Boolean).join(' ')

  const trackCls = ['rc', isDrag ? 'is-drag' : '', isEdit ? 'is-edit' : '']
    .filter(Boolean).join(' ')

  return (
    <div className={`rc-field${isModified ? ' is-mod' : ''}`}>
      {/* Label row */}
      <div className="rc-head">
        <span className="rc-toplabel">{label}</span>
        <span className="rc-mark" aria-hidden="true" />
        <button
          className="rc-reset"
          type="button"
          tabIndex={-1}
          aria-label={`Reset ${label}`}
          onClick={(e) => { e.stopPropagation(); setValue(defaultValue) }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 12a8 8 0 1 0 2.5-5.8M4 4v4h4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Track + badge row */}
      <div className={rowCls}>
        {/* Slider track */}
        <div
          ref={trackRef}
          className={trackCls}
          onMouseEnter={() => setIsHover(true)}
          onMouseLeave={() => setIsHover(false)}
          onDoubleClick={(e) => {
            if ((e.target as HTMLElement).closest('.rc-reset')) return
            openEdit()
          }}
          onWheel={handleWheel}
        >
          <div ref={fillRef} className="rc-fill" />
          <div className="rc-ticks" aria-hidden="true">
            {tickArr.map((_, i) => <i key={i} />)}
          </div>
          <div ref={glowRef} className="rc-glow" aria-hidden="true" />
          <div ref={thumbRef} className="rc-thumb" aria-hidden="true" />

          <input
            ref={inputRef}
            className="rc-input"
            type="range"
            min={min}
            max={max}
            step={step}
            defaultValue={value}
            aria-label={label}
            aria-valuemin={min}
            aria-valuemax={max}
            onInput={handleInput}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onKeyDown={handleKeyDown}
          />
          <div className="rc-focus-ring" aria-hidden="true" />
        </div>

        {/* Standalone value badge */}
        <div
          className="rc-badge-ctrl"
          onDoubleClick={openEdit}
          title="Double-click to edit"
        >
          <span className="rc-val" aria-hidden="true">
            <span ref={numRef} className="rc-num">{fmt(value)}</span>
            {unit && <em>{unit}</em>}
          </span>

          <input
            ref={editRef}
            className="rc-edit"
            inputMode="decimal"
            spellCheck={false}
            aria-label={`${label} edit`}
            defaultValue={fmt(value)}
            onBlur={() => commitEdit(false)}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === 'Enter') commitEdit(false)
              if (e.key === 'Escape') commitEdit(true)
            }}
          />
        </div>
      </div>
    </div>
  )
}

/* ── Icons ─────────────────────────────────────────────────────── */
const SunIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"
    style={{ position: 'absolute', transition: 'opacity 0.22s, scale 0.28s, rotate 0.28s' }}>
    <circle cx="12" cy="12" r="4.5" fill="currentColor" />
    <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M12 2v2.2M12 19.8V22M4.2 4.2l1.55 1.55M18.25 18.25l1.55 1.55M2 12h2.2M19.8 12H22M4.2 19.8l1.55-1.55M18.25 5.75l1.55-1.55" />
    </g>
  </svg>
)

const MoonIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"
    style={{ position: 'absolute', transition: 'opacity 0.22s, scale 0.28s, rotate 0.28s' }}>
    <path d="M20.5 14.2A8.5 8.5 0 1 1 9.8 3.5a7 7 0 0 0 10.7 10.7Z" fill="currentColor" />
  </svg>
)

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M7 1.5v11M1.5 7h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)

/* ── App ───────────────────────────────────────────────────────── */
export default function App() {
  const [theme, toggleTheme] = useTheme()

  const [duration, setDuration] = useState(300)
  const [delay, setDelay] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [scale, setScale] = useState(1)
  const [frequency, setFrequency] = useState(7.2)

  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: '100dvh',
        width: '100%',
        padding: '56px 16px',
        gap: '16px',
        background: 'radial-gradient(ellipse 130% 60% at 50% 0%, var(--page-bg-2), var(--page-bg)) var(--page-bg)',
        transition: 'background-color 0.4s cubic-bezier(0.32,0.72,0,1)',
        color: 'var(--text)',
      }}
    >
      {/* Theme Toggle */}
      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Toggle theme"
        aria-pressed={theme === 'dark'}
        title="Toggle Theme"
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          width: '52px',
          height: '30px',
          border: 'none',
          borderRadius: '999px',
          background: 'var(--card-bg)',
          boxShadow: '0 0 0 1px var(--card-ring), 0 2px 8px rgba(0,0,0,0.12)',
          cursor: 'pointer',
          zIndex: 100,
          transition: 'box-shadow 0.2s cubic-bezier(0.16,1,0.3,1), background-color 0.3s cubic-bezier(0.32,0.72,0,1)',
        }}
        onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 0 1px var(--accent-border), 0 4px 16px rgba(0,0,0,0.16)')}
        onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 0 1px var(--card-ring), 0 2px 8px rgba(0,0,0,0.12)')}
      >
        <span
          style={{
            position: 'absolute',
            top: '4px',
            left: '4px',
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            background: 'var(--accent)',
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
            transform: theme === 'dark' ? 'translateX(22px)' : 'translateX(0)',
            transition: 'transform 0.36s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        >
          <SunIcon />
          <MoonIcon />
        </span>
      </button>

      {/* Card */}
      <section className="rc-card" aria-labelledby="animation-title">
        <header className="rc-card-head">
          <div>
            <h2 className="rc-card-title" id="animation-title">Animation</h2>
            <span className="rc-card-hint">Drag · Shift = Fine · Double Click = Edit</span>
          </div>
        </header>

        {/* Motion */}
        <section aria-label="Motion Controls" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--row-gap)' }}>
          <div className="rc-row">
            <RangeControl
              label="Duration"
              min={0} max={5000} step={10}
              defaultValue={300} value={duration}
              unit="ms" decimals={0} ticks={21}
              onChange={setDuration}
            />
            <button
              className="rc-step"
              type="button"
              aria-label="Increase Duration by 50 milliseconds"
              title="Increase Duration"
              onClick={() => setDuration(d => Math.min(5000, d + 50))}
            >
              <PlusIcon />
            </button>
          </div>

          <RangeControl
            label="Delay"
            min={0} max={2000} step={10}
            defaultValue={0} value={delay}
            unit="ms" decimals={0} ticks={21}
            onChange={setDelay}
          />
        </section>

        <div className="rc-divider" role="separator" aria-hidden="true" />

        {/* Dynamics */}
        <section aria-label="Dynamics Controls" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--row-gap)' }}>
          <RangeControl
            label="Speed"
            min={0} max={3} step={0.001}
            defaultValue={1} value={speed}
            unit="×" decimals={3} ticks={11}
            onChange={setSpeed}
          />
          <RangeControl
            label="Scale"
            min={0.25} max={2.5} step={0.001}
            defaultValue={1} value={scale}
            unit="×" decimals={3} ticks={11}
            onChange={setScale}
          />
          <RangeControl
            label="Frequency"
            min={0.5} max={10} step={0.001}
            defaultValue={3.5} value={frequency}
            unit="Hz" decimals={3} ticks={11}
            onChange={setFrequency}
          />
        </section>
      </section>
    </main>
  )
}
