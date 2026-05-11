import { useEffect, useState } from 'react'
import { imgUrl } from '../api/client'

interface ImageFlowProps {
  images: { id: string; url: string; filename: string }[]
  dayText: string
  apiBase: string
}

const SLOTS = [
  { side: 'right' as const, shape: 'circle' as const, size: 120 },
  { side: 'left' as const, shape: 'square' as const, size: 110 },
  { side: 'right' as const, shape: 'circle' as const, size: 108 },
]

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export default function ImageFlow({ images, dayText, apiBase }: ImageFlowProps) {
  const [picks, setPicks] = useState<(string | null)[]>([null, null, null])

  useEffect(() => {
    fetch(`${apiBase}/static/placeholders/index`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { files: string[] } | null) => {
        if (!data) return
        setPicks(SLOTS.map(() => pickRandom(data.files)))
      })
      .catch(() => { /* graceful degradation */ })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase])

  const sentences = dayText.split(/(?<=[.!?…])\s+/).filter((s) => s.trim())
  const groups: string[][] = [[], [], [], []]
  const perGroup = sentences.length / 4
  sentences.forEach((s, i) => {
    const gi = Math.min(Math.floor(i / perGroup), 3)
    groups[gi].push(s)
  })

  return (
    <div className="image-flow" style={{ display: 'block' }}>
      {groups[0].length > 0 && <p>{groups[0].join(' ')}</p>}

      {SLOTS.map((slot, i) => {
        const userImg = images[i]
        const hasImage = !!userImg
        const src = hasImage
          ? imgUrl(userImg.url)
          : picks[i]
            ? `${apiBase}/static/placeholders/${picks[i]}`
            : null
        const isCircle = slot.shape === 'circle'
        const shapeVal = isCircle ? 'circle(50%)' : 'inset(6px round 18px)'
        const margin = slot.side === 'right' ? '0 0 12px 16px' : '0 16px 12px 0'

        return (
          <span key={i}>
            {src && (
              <img
                src={src}
                alt=""
                style={{
                  float: slot.side,
                  width: slot.size,
                  height: slot.size,
                  shapeOutside: shapeVal,
                  clipPath: shapeVal,
                  margin,
                  objectFit: 'cover',
                  display: 'block',
                  pointerEvents: 'none',
                  userSelect: 'none',
                  opacity: hasImage ? 1 : 0.45,
                }}
              />
            )}
            {groups[i + 1]?.length > 0 && <p>{groups[i + 1].join(' ')}</p>}
          </span>
        )
      })}
    </div>
  )
}
