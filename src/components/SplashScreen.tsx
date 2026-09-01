import { useEffect, useRef } from 'react'

const W = 800
const H = 300
const FONT_SIZE = 118
const DOT_RADIUS = 50
const PERIOD_RADIUS = 10
const LETTERS = ['F', 'E', 'X', 'A']
const LETTER_COLORS = ['#CD7D3C', '#6DBFF3', '#6DBFF3', '#CD7D3C']
const LETTER_SPACING = 14
const FADE_START = 2.3
const FADE_END = 3.3

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

function easeIn(t: number) {
  return t * t * t
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v))
}

function pt(t: number, start: number, end: number) {
  return clamp01((t - start) / (end - start))
}

interface Layout {
  positions: number[]
  endX: number
  drawY: number
  periodY: number
}

/** FEXA logo reveal: a rolling dot draws the wordmark left-to-right, hops, then falls
 *  and shrinks into the final period. Timeline is fixed (0–3.3s) with a built-in fade
 *  from 2.3s–3.3s, so `onDone` fires right as the canvas has already faded to nothing —
 *  the wrapper's own CSS fade (synced to the same window) hides the seam of unmounting. */
export function SplashScreen({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const onDoneRef = useRef(onDone)

  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    let animId: number
    let startTime: number | null = null
    let layout: Layout | null = null

    const fontStr = `800 ${FONT_SIZE}px 'Nunito', sans-serif`

    function computeLayout(): Layout {
      ctx.font = fontStr
      ctx.textBaseline = 'middle'
      const widths = LETTERS.map((l) => ctx.measureText(l).width)
      const totalWidth = widths.reduce((a, b) => a + b, 0) + LETTER_SPACING * (LETTERS.length - 1)
      const startX = (W - totalWidth) / 2
      const positions: number[] = []
      let cx = startX
      for (let i = 0; i < LETTERS.length; i++) {
        positions.push(cx)
        cx += widths[i] + LETTER_SPACING
      }
      return { positions, endX: startX + totalWidth, drawY: H / 2, periodY: H / 2 + FONT_SIZE * 0.32 }
    }

    function draw(t: number) {
      ctx.clearRect(0, 0, W, H)
      if (!layout) layout = computeLayout()

      const { positions, endX, drawY, periodY } = layout
      const CENTER_Y = H / 2
      const DOT_START_X = DOT_RADIUS
      const DOT_ROLL_END_X = endX + 52
      const PERIOD_X = endX + PERIOD_RADIUS + 10
      const HOP_HEIGHT = 62
      const totalRollDist = DOT_ROLL_END_X - DOT_START_X

      let dotX = DOT_START_X
      let dotY = CENTER_Y
      let dotR = DOT_RADIUS
      let dotAngle = 0
      let revealX = 0

      if (t < 0.3) {
        dotX = DOT_START_X
        dotY = CENTER_Y
        dotR = DOT_RADIUS
        revealX = 0
      } else if (t < 1.2) {
        const p = easeInOut(pt(t, 0.3, 1.2))
        dotX = lerp(DOT_START_X, DOT_ROLL_END_X, p)
        dotY = CENTER_Y
        dotR = DOT_RADIUS
        dotAngle = (dotX - DOT_START_X) / DOT_RADIUS
        revealX = dotX
      } else if (t < 1.5) {
        const p = easeOut(pt(t, 1.2, 1.5))
        dotX = DOT_ROLL_END_X
        dotY = lerp(CENTER_Y, CENTER_Y - HOP_HEIGHT, p)
        dotR = DOT_RADIUS
        dotAngle = totalRollDist / DOT_RADIUS
        revealX = W
      } else if (t < 1.8) {
        const p = pt(t, 1.5, 1.8)
        const fallP = easeIn(p)
        const morphP = easeInOut(p)
        dotX = lerp(DOT_ROLL_END_X, PERIOD_X, morphP)
        dotY = lerp(CENTER_Y - HOP_HEIGHT, periodY, fallP)
        dotR = lerp(DOT_RADIUS, PERIOD_RADIUS, morphP)
        dotAngle = totalRollDist / DOT_RADIUS
        revealX = W
      } else {
        const p = pt(t, 1.8, 2.05)
        const bounce = p < 1 ? Math.sin(p * Math.PI * 3) * (1 - p) * (1 - p) * 5 : 0
        dotX = PERIOD_X
        dotY = periodY - bounce
        dotR = PERIOD_RADIUS
        revealX = W
      }

      if (t >= FADE_START) {
        ctx.globalAlpha = 1 - easeInOut(pt(t, FADE_START, FADE_END))
      } else {
        ctx.globalAlpha = 1
      }

      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, revealX, H)
      ctx.clip()
      ctx.font = fontStr
      ctx.textBaseline = 'middle'
      for (let i = 0; i < LETTERS.length; i++) {
        ctx.fillStyle = LETTER_COLORS[i]
        ctx.fillText(LETTERS[i], positions[i], drawY)
      }
      ctx.restore()

      ctx.save()
      ctx.translate(dotX, dotY)

      ctx.save()
      ctx.rotate(dotAngle)
      ctx.beginPath()
      ctx.arc(0, 0, dotR, -Math.PI / 2, Math.PI / 2)
      ctx.lineTo(0, 0)
      ctx.closePath()
      ctx.fillStyle = '#6DBFF3'
      ctx.fill()
      ctx.beginPath()
      ctx.arc(0, 0, dotR, Math.PI / 2, -Math.PI / 2)
      ctx.lineTo(0, 0)
      ctx.closePath()
      ctx.fillStyle = '#CD7D3C'
      ctx.fill()
      ctx.restore()

      if (dotR > 14) {
        const grad = ctx.createRadialGradient(-dotR * 0.32, -dotR * 0.32, 0, 0, 0, dotR * 0.95)
        grad.addColorStop(0, 'rgba(255,255,255,0.3)')
        grad.addColorStop(0.45, 'rgba(255,255,255,0.05)')
        grad.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.beginPath()
        ctx.arc(0, 0, dotR, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()
      }

      ctx.restore()
      ctx.globalAlpha = 1
    }

    function animate(ts: number) {
      if (!startTime) startTime = ts
      const t = (ts - startTime) / 1000
      draw(Math.min(t, FADE_END))
      if (t < FADE_END) {
        animId = requestAnimationFrame(animate)
      } else {
        onDoneRef.current()
      }
    }

    document.fonts.ready.then(() => {
      animId = requestAnimationFrame(animate)
    })

    return () => cancelAnimationFrame(animId)
  }, [])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-50 dark:bg-zinc-900"
      style={{ animation: `fexa-splash-fade 1s ease-in-out ${FADE_START}s forwards` }}
    >
      <canvas ref={canvasRef} width={W} height={H} style={{ width: 'min(800px, 90vw)', height: 'auto' }} />
    </div>
  )
}
