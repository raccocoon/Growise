import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * GrowBuddy Loading Screen
 * Drop into src/components/LoadingScreen.tsx
 * Usage: render this component after login/register,
 *        it auto-navigates to /dashboard after 60 seconds.
 *
 * Also add the @keyframes CSS below into your global CSS file (e.g. src/index.css)
 */

export default function LoadingScreen() {
  const navigate = useNavigate()
  const startTimeRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const curPhaseRef = useRef<number>(-1)

  useEffect(() => {
    const TOTAL = 60
    const NS = 'http://www.w3.org/2000/svg'

    const phases = [
      { id: 'ph0', start: 0,  end: 12, msg: 'Preparing the soil...' },
      { id: 'ph1', start: 12, end: 24, msg: 'Watering the seed...' },
      { id: 'ph2', start: 24, end: 36, msg: 'A sprout is emerging...' },
      { id: 'ph3', start: 36, end: 48, msg: 'Your plant is growing strong...' },
      { id: 'ph4', start: 48, end: 60, msg: 'Your farm is ready!' },
    ]

    const T = { ANT_END: 2, DIG_END: 6, SEED_END: 9, FILL_END: 12 }

    const antG    = document.getElementById('p0-ant')!
    const holeEl  = document.getElementById('p0-hole')!
    const shovelL = document.getElementById('p0-shovel-l')!
    const shovelR = document.getElementById('p0-shovel-r')!
    const soilG   = document.getElementById('p0-soil')!
    const seedG   = document.getElementById('p0-seed-g')!
    const seedEl  = document.getElementById('p0-seed')!
    const seedHi  = document.getElementById('p0-seed-hi')!
    const fillG   = document.getElementById('p0-fill')!
    const fillL   = document.getElementById('p0-fill-l')!
    const fillR   = document.getElementById('p0-fill-r')!
    const fillTop = document.getElementById('p0-fill-top')!
    const barEl   = document.getElementById('gb-bar')!
    const pctEl   = document.getElementById('gb-pct')!
    const tagEl   = document.getElementById('gb-tag')!

    const lerp    = (a: number, b: number, t: number) => a + (b - a) * Math.min(1, Math.max(0, t))
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
    const easeIn  = (t: number) => t * t * t
    const clamp   = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

    function drawAnt(cx: number, cy: number, legPhase: number, opacity: number) {
      antG.innerHTML = ''
      if (opacity <= 0) return
      const op = opacity.toFixed(2)
      const sz = 5

      const parts: { tag: string; attrs: Record<string, string | number> }[] = [
        { tag: 'ellipse', attrs: { cx: cx - sz * 1.2, cy, rx: sz * 1.1, ry: sz * 0.7, fill: '#2C2C2A', opacity: op } },
        { tag: 'ellipse', attrs: { cx, cy: cy - 1, rx: sz * 0.7, ry: sz * 0.6, fill: '#2C2C2A', opacity: op } },
        { tag: 'ellipse', attrs: { cx: cx + sz * 1.1, cy: cy - 1, rx: sz * 0.55, ry: sz * 0.55, fill: '#2C2C2A', opacity: op } },
        { tag: 'line',    attrs: { x1: cx + sz * 1.1, y1: cy - sz * 0.5, x2: cx + sz * 1.8, y2: cy - sz * 1.8, stroke: '#2C2C2A', 'stroke-width': 0.8, opacity: op } },
        { tag: 'line',    attrs: { x1: cx + sz * 1.1, y1: cy - sz * 0.5, x2: cx + sz * 2.0, y2: cy - sz * 1.2, stroke: '#2C2C2A', 'stroke-width': 0.8, opacity: op } },
      ]

      const legXBase = [cx - sz * 1.6, cx - sz * 0.8, cx + sz * 0.1]
      const legSwing = Math.sin(legPhase * Math.PI * 2) * 6
      legXBase.forEach((lx, i) => {
        const swing = i % 2 === 0 ? legSwing : -legSwing
        parts.push({ tag: 'line', attrs: { x1: lx, y1: cy, x2: lx - 3, y2: cy + sz * 0.8 + swing * 0.4, stroke: '#2C2C2A', 'stroke-width': 1, opacity: op } })
        parts.push({ tag: 'line', attrs: { x1: lx, y1: cy, x2: lx - 3, y2: cy - sz * 0.8 - swing * 0.4, stroke: '#2C2C2A', 'stroke-width': 1, opacity: op } })
      })

      parts.forEach(p => {
        const el = document.createElementNS(NS, p.tag)
        Object.entries(p.attrs).forEach(([k, v]) => el.setAttribute(k, String(v)))
        antG.appendChild(el)
      })
    }

    function drawSoil(digProgress: number) {
      soilG.innerHTML = ''
      if (digProgress <= 0) return
      const pulse  = (Math.sin(digProgress * Math.PI * 10) + 1) / 2
      const spread = easeOut(digProgress)
      const particles = [
        { dx: -30, dy: -24, rx: 5,   ry: 3,   fill: '#b07840' },
        { dx: -18, dy: -30, rx: 3,   ry: 2,   fill: '#c8a06a' },
        { dx: -38, dy: -14, rx: 4,   ry: 2.5, fill: '#a06830' },
        { dx:  30, dy: -24, rx: 5,   ry: 3,   fill: '#b07840' },
        { dx:  18, dy: -30, rx: 3,   ry: 2,   fill: '#c8a06a' },
        { dx:  38, dy: -14, rx: 4,   ry: 2.5, fill: '#a06830' },
      ]
      particles.forEach(p => {
        const el = document.createElementNS(NS, 'ellipse')
        el.setAttribute('cx',      (130 + p.dx * spread).toFixed(1))
        el.setAttribute('cy',      (193 + p.dy * spread).toFixed(1))
        el.setAttribute('rx',      String(p.rx))
        el.setAttribute('ry',      String(p.ry))
        el.setAttribute('fill',    p.fill)
        el.setAttribute('opacity', (pulse * 0.85 * clamp(digProgress * 4, 0, 1)).toFixed(2))
        soilG.appendChild(el)
      })
    }

    function drawPhase0(t: number) {
      // 0.0 – 2.0 : ANT WALKS
      if (t <= T.ANT_END) {
        const dt       = t / T.ANT_END
        const walkEnd  = 0.75
        const antX     = dt < walkEnd ? lerp(30, 130, easeOut(dt / walkEnd)) : 130
        const legPhase = dt * 4
        const antOp    = clamp(t * 4, 0, 1)
        drawAnt(antX, 189, legPhase, antOp)
        holeEl.setAttribute('rx', '0'); holeEl.setAttribute('ry', '0')
        shovelL.style.opacity = '0';    shovelR.style.opacity = '0'
        soilG.innerHTML = '';           seedG.style.opacity = '0'
        fillG.style.opacity = '0'
        return
      }

      antG.innerHTML = ''

      // 2.0 – 6.0 : DIGGING
      if (t <= T.DIG_END) {
        const dt  = (t - T.ANT_END) / (T.DIG_END - T.ANT_END)
        const hRx = lerp(0, 13, easeOut(Math.min(dt * 2.5, 1)))
        const hRy = lerp(0, 6,  easeOut(Math.min(dt * 2.5, 1)))
        holeEl.setAttribute('rx', hRx.toFixed(1))
        holeEl.setAttribute('ry', hRy.toFixed(1))
        shovelL.style.opacity = '1'; shovelR.style.opacity = '1'
        const angle = Math.sin(dt * Math.PI * 7) * 22
        shovelL.style.transform       = `rotate(${-angle}deg)`
        shovelL.style.transformOrigin = '116px 178px'
        shovelR.style.transform       = `rotate(${angle}deg)`
        shovelR.style.transformOrigin = '144px 178px'
        drawSoil(dt)
        seedG.style.opacity = '0'; fillG.style.opacity = '0'
        return
      }

      // 6.0 – 9.0 : SEED DROPS
      if (t <= T.SEED_END) {
        const dt = (t - T.DIG_END) / (T.SEED_END - T.DIG_END)
        shovelL.style.opacity = '0'; shovelR.style.opacity = '0'
        soilG.innerHTML = ''
        holeEl.setAttribute('rx', '13'); holeEl.setAttribute('ry', '6')
        fillG.style.opacity = '0'
        seedG.style.opacity = '1'
        const startY  = 72, endY = 192
        const rawY    = lerp(startY, endY, easeIn(dt))
        const bounceProg = clamp((dt - 0.82) / 0.18, 0, 1)
        const bounce  = Math.sin(bounceProg * Math.PI) * 7 * (1 - bounceProg)
        const seedY   = rawY - bounce
        const rot     = dt * 270
        seedEl.setAttribute('cy', seedY.toFixed(1))
        seedHi.setAttribute('cy', (seedY - 1).toFixed(1))
        seedEl.style.transform       = `rotate(${rot}deg)`
        seedEl.style.transformOrigin = `130px ${seedY.toFixed(1)}px`
        seedHi.style.transform       = `rotate(${rot}deg)`
        seedHi.style.transformOrigin = `130px ${seedY.toFixed(1)}px`
        return
      }

      // 9.0 – 12.0 : BACKFILL
      if (t <= T.FILL_END) {
        const dt = (t - T.SEED_END) / (T.FILL_END - T.SEED_END)
        shovelL.style.opacity = '0'; shovelR.style.opacity = '0'
        soilG.innerHTML = ''
        holeEl.setAttribute('rx', lerp(13, 0, easeOut(dt)).toFixed(1))
        holeEl.setAttribute('ry', lerp(6,  0, easeOut(dt)).toFixed(1))
        seedEl.setAttribute('cy', '193'); seedHi.setAttribute('cy', '192')
        seedEl.style.transform = 'none';  seedHi.style.transform = 'none'
        seedG.style.opacity = lerp(1, 0, easeOut(dt * 2)).toFixed(2)
        fillG.style.opacity = '1'
        const rx   = lerp(0, 16,  easeOut(dt)).toFixed(1)
        const ry   = lerp(0, 6,   easeOut(dt)).toFixed(1)
        const trx  = lerp(0, 10,  easeOut(dt)).toFixed(1)
        const try_ = lerp(0, 3.5, easeOut(dt)).toFixed(1)
        fillL.setAttribute('rx', rx);    fillL.setAttribute('ry', ry)
        fillR.setAttribute('rx', rx);    fillR.setAttribute('ry', ry)
        fillTop.setAttribute('rx', trx); fillTop.setAttribute('ry', try_)
        return
      }

      // hold final filled state
      shovelL.style.opacity = '0'; shovelR.style.opacity = '0'
      soilG.innerHTML = '';        antG.innerHTML = ''
      seedG.style.opacity = '0'
      holeEl.setAttribute('rx', '0'); holeEl.setAttribute('ry', '0')
      fillG.style.opacity = '1'
      fillL.setAttribute('rx', '16');  fillL.setAttribute('ry', '6')
      fillR.setAttribute('rx', '16');  fillR.setAttribute('ry', '6')
      fillTop.setAttribute('rx', '10'); fillTop.setAttribute('ry', '3.5')
    }

    function showPhase(idx: number) {
      if (idx === curPhaseRef.current) return
      curPhaseRef.current = idx
      phases.forEach((p, i) => {
        const el = document.getElementById(p.id)
        if (!el) return
        el.style.transition = 'opacity 0.85s ease'
        el.style.opacity    = i === idx ? '1' : '0'
      })
      tagEl.textContent = phases[idx].msg
    }

    function tick(ts: number) {
      if (!startTimeRef.current) startTimeRef.current = ts
      const elapsed = Math.min((ts - startTimeRef.current) / 1000, TOTAL)
      const prog    = elapsed / TOTAL

      barEl.style.width     = (prog * 100).toFixed(1) + '%'
      pctEl.textContent     = Math.round(prog * 100) + '%'

      const idx         = phases.findIndex(p => elapsed >= p.start && elapsed < p.end)
      const resolvedIdx = idx === -1 ? phases.length - 1 : idx
      showPhase(resolvedIdx)

      if (resolvedIdx === 0) drawPhase0(elapsed - phases[0].start)

      if (elapsed < TOTAL) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        barEl.style.width = '100%'
        pctEl.textContent = '100%'
        tagEl.textContent = 'Welcome to GrowBuddy!'
        setTimeout(() => navigate('/dashboard', { replace: true }), 600)
      }
    }

    showPhase(0)
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [navigate])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      fontFamily: 'var(--font-sans, system-ui, sans-serif)',
    }}>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '2rem' }}>
        <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
          <path d="M16 4C8 4 4 12 6 20C8 26 14 28 16 28C18 28 24 26 26 20C28 12 24 4 16 4Z" fill="#639922"/>
          <path d="M16 28C16 28 16 16 16 10" stroke="#27500A" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M16 18C13 15 10 14 8 15" stroke="#27500A" strokeWidth="1" strokeLinecap="round" fill="none"/>
          <path d="M16 22C19 19 22 18 24 19" stroke="#27500A" strokeWidth="1" strokeLinecap="round" fill="none"/>
        </svg>
        <div style={{ fontSize: 22, fontWeight: 500, color: '#27500A', letterSpacing: '-0.3px' }}>
          Grow<span style={{ color: '#639922' }}>Buddy</span>
        </div>
      </div>

      {/* Scene */}
      <div style={{ width: 260, height: 260, marginBottom: '1.5rem' }}>
        <svg width="260" height="260" viewBox="0 0 260 260" xmlns="http://www.w3.org/2000/svg">
          <circle cx="130" cy="130" r="118" fill="#f0f7e6" opacity="0.4"/>

          {/* Ground always visible */}
          <ellipse cx="130" cy="196" rx="88" ry="13" fill="#c8a06a" opacity="0.85"/>
          <ellipse cx="130" cy="196" rx="76" ry="8" fill="#a07840"/>

          {/* PHASE 0 — JS driven */}
          <g id="ph0" style={{ opacity: 1 }}>
            <g id="p0-ant" />
            <ellipse id="p0-hole" cx="130" cy="194" rx="0" ry="0" fill="#5a3008"/>
            <g id="p0-shovel-l" style={{ opacity: 0 }}>
              <rect x="113" y="152" width="6" height="28" rx="2" fill="#7a4515"/>
              <polygon points="109,178 121,178 122,188 108,188" fill="#999"/>
              <rect x="110" y="148" width="12" height="7" rx="3" fill="#b07040"/>
            </g>
            <g id="p0-shovel-r" style={{ opacity: 0 }}>
              <rect x="141" y="152" width="6" height="28" rx="2" fill="#7a4515"/>
              <polygon points="139,178 151,178 152,188 138,188" fill="#999"/>
              <rect x="138" y="148" width="12" height="7" rx="3" fill="#b07040"/>
            </g>
            <g id="p0-soil"/>
            <g id="p0-seed-g" style={{ opacity: 0 }}>
              <ellipse id="p0-seed"    cx="130" cy="88" rx="7" ry="5" fill="#7a4515"/>
              <ellipse id="p0-seed-hi" cx="130" cy="87" rx="3" ry="2" fill="#a07040" opacity="0.55"/>
            </g>
            <g id="p0-fill" style={{ opacity: 0 }}>
              <ellipse id="p0-fill-l"   cx="116" cy="193" rx="0" ry="0" fill="#a07840"/>
              <ellipse id="p0-fill-r"   cx="144" cy="193" rx="0" ry="0" fill="#a07840"/>
              <ellipse id="p0-fill-top" cx="130" cy="193" rx="0" ry="0" fill="#b89060"/>
            </g>
          </g>

          {/* PHASE 1: WATERING */}
          <g id="ph1" style={{ opacity: 0 }}>
            <ellipse cx="130" cy="194" rx="16" ry="6" fill="#a07840"/>
            <ellipse cx="130" cy="193" rx="7"  ry="3.5" fill="#8B6030"/>
            <rect x="148" y="86" width="42" height="30" rx="6" fill="#378ADD"/>
            <rect x="152" y="78" width="14" height="11" rx="4" fill="#185FA5"/>
            <path d="M190 95 C202 90 204 110 190 112" stroke="#185FA5" strokeWidth="4" strokeLinecap="round" fill="none"/>
            <path d="M148 108 C138 108 133 116 130 122" stroke="#185FA5" strokeWidth="5" strokeLinecap="round" fill="none"/>
            <ellipse cx="128" cy="124" rx="7" ry="4" fill="#185FA5" transform="rotate(-15,128,124)"/>
            <circle cx="126" cy="124" r="1" fill="#378ADD"/>
            <circle cx="129" cy="122" r="1" fill="#378ADD"/>
            <circle cx="131" cy="125" r="1" fill="#378ADD"/>
            <ellipse cx="130" cy="136" rx="2.5" ry="4.5" fill="#85B7EB" style={{ animation: 'gb-waterdrop 1s ease-in infinite 0s' }}/>
            <ellipse cx="126" cy="133" rx="2"   ry="3.5" fill="#85B7EB" style={{ animation: 'gb-waterdrop 1s ease-in infinite 0.22s' }}/>
            <ellipse cx="134" cy="134" rx="2"   ry="3.5" fill="#85B7EB" style={{ animation: 'gb-waterdrop 1s ease-in infinite 0.44s' }}/>
            <ellipse cx="128" cy="140" rx="1.8" ry="3"   fill="#B5D4F4" style={{ animation: 'gb-waterdrop 1s ease-in infinite 0.66s' }}/>
            <ellipse cx="132" cy="138" rx="1.8" ry="3"   fill="#B5D4F4" style={{ animation: 'gb-waterdrop 1s ease-in infinite 0.88s' }}/>
            <circle cx="130" cy="193" r="2" fill="none" stroke="#85B7EB" strokeWidth="1.2" style={{ animation: 'gb-ripple 1.1s ease-out infinite' }}/>
            <circle cx="130" cy="193" r="2" fill="none" stroke="#85B7EB" strokeWidth="1.2" style={{ animation: 'gb-ripple 1.1s ease-out infinite 0.37s' }}/>
            <circle cx="130" cy="193" r="2" fill="none" stroke="#85B7EB" strokeWidth="1.2" style={{ animation: 'gb-ripple 1.1s ease-out infinite 0.74s' }}/>
          </g>

          {/* PHASE 2: SPROUT */}
          <g id="ph2" style={{ opacity: 0 }}>
            <ellipse cx="130" cy="195" rx="20" ry="7" fill="#a07840" opacity="0.5"/>
            <g style={{ transformOrigin: '130px 190px', animation: 'gb-sprout-up 0.9s ease-out forwards' }}>
              <line x1="130" y1="190" x2="130" y2="160" stroke="#639922" strokeWidth="3.5" strokeLinecap="round"/>
              <path d="M130 172 C119 165 113 169 115 176 C117 181 125 178 130 172Z" fill="#97C459" style={{ transformOrigin: '130px 172px', animation: 'gb-leaf-sway 2.8s ease-in-out infinite' }}/>
              <path d="M130 172 C141 165 147 169 145 176 C143 181 135 178 130 172Z" fill="#97C459" style={{ transformOrigin: '130px 172px', animation: 'gb-leaf-sway 2.8s ease-in-out infinite 1.4s' }}/>
            </g>
          </g>

          {/* PHASE 3: SMALL PLANT */}
          <g id="ph3" style={{ opacity: 0 }}>
            <ellipse cx="130" cy="195" rx="26" ry="7" fill="#a07840" opacity="0.45"/>
            <g style={{ transformOrigin: '130px 190px', animation: 'gb-sprout-up 0.8s ease-out forwards' }}>
              <line x1="130" y1="190" x2="130" y2="137" stroke="#3B6D11" strokeWidth="4.5" strokeLinecap="round"/>
              <line x1="130" y1="168" x2="108" y2="152" stroke="#3B6D11" strokeWidth="3" strokeLinecap="round"/>
              <line x1="130" y1="160" x2="152" y2="145" stroke="#3B6D11" strokeWidth="3" strokeLinecap="round"/>
              <ellipse cx="101" cy="149" rx="14" ry="8" fill="#639922" transform="rotate(-20,101,149)" style={{ transformOrigin: '101px 149px', animation: 'gb-leaf-sway 3s ease-in-out infinite' }}/>
              <ellipse cx="159" cy="142" rx="14" ry="8" fill="#639922" transform="rotate(20,159,142)"  style={{ transformOrigin: '159px 142px', animation: 'gb-leaf-sway 3s ease-in-out infinite 1.5s' }}/>
              <ellipse cx="120" cy="134" rx="12" ry="8" fill="#97C459" transform="rotate(-12,120,134)" style={{ transformOrigin: '120px 134px', animation: 'gb-leaf-sway 2.5s ease-in-out infinite 0.5s' }}/>
              <ellipse cx="140" cy="134" rx="12" ry="8" fill="#97C459" transform="rotate(12,140,134)"  style={{ transformOrigin: '140px 134px', animation: 'gb-leaf-sway 2.5s ease-in-out infinite 1s' }}/>
              <ellipse cx="130" cy="129" rx="11" ry="8" fill="#C0DD97"/>
            </g>
            <g style={{ animation: 'gb-sun-rise 1.2s ease-out forwards' }}>
              <circle cx="210" cy="52" r="17" fill="#EF9F27" opacity="0.85"/>
              <circle cx="210" cy="52" r="12" fill="#FAC775"/>
              <g stroke="#EF9F27" strokeWidth="1.5" strokeLinecap="round" opacity="0.7">
                <line x1="210" y1="28" x2="210" y2="22"/><line x1="210" y1="76" x2="210" y2="82"/>
                <line x1="186" y1="52" x2="180" y2="52"/><line x1="234" y1="52" x2="240" y2="52"/>
                <line x1="193" y1="35" x2="189" y2="31"/><line x1="227" y1="69" x2="231" y2="73"/>
                <line x1="193" y1="69" x2="189" y2="73"/><line x1="227" y1="35" x2="231" y2="31"/>
              </g>
            </g>
          </g>

          {/* PHASE 4: FULL TREE */}
          <g id="ph4" style={{ opacity: 0 }}>
            <ellipse cx="130" cy="195" rx="64" ry="11" fill="#3B6D11" opacity="0.3"/>
            <g style={{ transformOrigin: '130px 190px', animation: 'gb-sprout-up 1.1s ease-out forwards' }}>
              <rect x="124" y="152" width="12" height="43" rx="4" fill="#7a4515"/>
              <line x1="127" y1="158" x2="127" y2="190" stroke="#5a3008" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
              <line x1="133" y1="156" x2="133" y2="188" stroke="#5a3008" strokeWidth="1"   strokeLinecap="round" opacity="0.35"/>
              <g style={{ animation: 'gb-canopy-bob 3.5s ease-in-out infinite' }}>
                <ellipse cx="130" cy="132" rx="54" ry="32" fill="#3B6D11"/>
                <ellipse cx="106" cy="126" rx="33" ry="22" fill="#639922"/>
                <ellipse cx="154" cy="126" rx="33" ry="22" fill="#639922"/>
                <ellipse cx="130" cy="116" rx="42" ry="28" fill="#639922"/>
                <ellipse cx="130" cy="108" rx="30" ry="22" fill="#97C459"/>
                <ellipse cx="114" cy="112" rx="19" ry="13" fill="#C0DD97" opacity="0.65"/>
              </g>
              <circle cx="150" cy="118" r="5.5" fill="#E24B4A"/>
              <circle cx="141" cy="107" r="4.5" fill="#E24B4A"/>
              <circle cx="119" cy="112" r="4.5" fill="#E24B4A"/>
              <circle cx="157" cy="130" r="4"   fill="#EF9F27"/>
              <circle cx="108" cy="124" r="4"   fill="#EF9F27"/>
              <circle cx="130" cy="100" r="5"   fill="#E24B4A"/>
            </g>
            <circle cx="210" cy="52" r="17" fill="#EF9F27" opacity="0.85"/>
            <circle cx="210" cy="52" r="12" fill="#FAC775"/>
            <g stroke="#EF9F27" strokeWidth="1.5" strokeLinecap="round" opacity="0.7">
              <line x1="210" y1="28" x2="210" y2="22"/><line x1="210" y1="76" x2="210" y2="82"/>
              <line x1="186" y1="52" x2="180" y2="52"/><line x1="234" y1="52" x2="240" y2="52"/>
              <line x1="193" y1="35" x2="189" y2="31"/><line x1="227" y1="69" x2="231" y2="73"/>
              <line x1="193" y1="69" x2="189" y2="73"/><line x1="227" y1="35" x2="231" y2="31"/>
            </g>
            <g style={{ animation: 'gb-bird-fly 2s ease-in-out infinite' }}>
              <path d="M55 68 C57 65 62 65 64 68" fill="none" stroke="#3B6D11" strokeWidth="1.8" strokeLinecap="round"/>
              <path d="M67 60 C69 57 75 57 77 60" fill="none" stroke="#3B6D11" strokeWidth="1.8" strokeLinecap="round"/>
              <path d="M41 78 C43 75 48 75 50 78" fill="none" stroke="#3B6D11" strokeWidth="1.5" strokeLinecap="round"/>
            </g>
            <ellipse cx="130" cy="130" rx="72" ry="72" fill="none" stroke="#97C459" strokeWidth="2" style={{ animation: 'gb-glow-pulse 2.5s ease-in-out infinite' }}/>
          </g>
        </svg>
      </div>

      {/* Tagline */}
      <p id="gb-tag" style={{ fontSize: 14, color: 'var(--color-text-secondary, #888)', marginBottom: '1.2rem', textAlign: 'center', minHeight: 20 }}>
        Preparing your farm...
      </p>

      {/* Progress bar */}
      <div style={{ width: 240, background: '#EAF3DE', borderRadius: 99, height: 6, overflow: 'hidden', marginBottom: '0.5rem' }}>
        <div id="gb-bar" style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #97C459, #3B6D11)', width: '0%', transition: 'width 0.9s linear' }}/>
      </div>
      <span id="gb-pct" style={{ fontSize: 12, color: 'var(--color-text-secondary, #888)', fontVariantNumeric: 'tabular-nums' }}>0%</span>
    </div>
  )
}

/*
=============================================================
  ADD THESE @keyframes TO YOUR GLOBAL CSS (e.g. src/index.css)
=============================================================

@keyframes gb-waterdrop {
  0%   { opacity: 0; transform: translateY(-14px); }
  20%  { opacity: 1; }
  80%  { opacity: 1; transform: translateY(46px); }
  100% { opacity: 0; transform: translateY(50px); }
}
@keyframes gb-ripple {
  0%   { r: 2;  opacity: 0.9; }
  100% { r: 15; opacity: 0; }
}
@keyframes gb-sprout-up {
  0%   { transform: scaleY(0); opacity: 0; }
  100% { transform: scaleY(1); opacity: 1; }
}
@keyframes gb-leaf-sway {
  0%, 100% { transform: rotate(-5deg); }
  50%       { transform: rotate(5deg); }
}
@keyframes gb-canopy-bob {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-3px); }
}
@keyframes gb-sun-rise {
  0%   { opacity: 0; transform: translateY(12px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes gb-bird-fly {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-4px); }
}
@keyframes gb-glow-pulse {
  0%, 100% { opacity: 0.2; }
  50%       { opacity: 0.5; }
}

=============================================================
*/
