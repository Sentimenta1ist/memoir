import { useEffect, useState } from 'react'
import { imgUrl } from '../api/client'

interface ImageFlowProps {
  images: { id: string; url: string; filename: string }[]
  dayText: string
  apiBase: string
}

const SLOTS = [
  { float: 'right' as const, borderRadius: '50%', size: 120 },
  { float: 'left' as const, borderRadius: '14px', size: 110 },
  { float: 'right' as const, borderRadius: '50%', size: 108 },
]

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export default function ImageFlow({ images, dayText, apiBase }: ImageFlowProps) {
  const [picks, setPicks] = useState<(string | null)[]>([null, null, null])

  useEffect(() => {
    fetch(`${apiBase}/static/placeholders/index`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: { files: string[] } | null) => {
        if (!data) return
        setPicks(SLOTS.map(() => pickRandom(data.files)))
      })
      .catch(() => { /* graceful degradation */ })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase])

  const sentences = dayText.split(/(?<=[.!?])\s+/).filter((s) => s.trim())
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
        const placeholder = picks[i]
        const hasImage = !!userImg
        const src = hasImage
          ? imgUrl(userImg.url)
          : placeholder
            ? `${apiBase}/static/placeholders/${placeholder}`
            : null

        return (
          <span key={i}>
            {src && (
              <div
                className={`fi fi-${slot.float === 'right' ? (slot.borderRadius === '50%' ? 'circle-r' : 'square-r') : (slot.borderRadius === '50%' ? 'circle-l' : 'square-l')}`}
                style={{
                  width: slot.size,
                  height: slot.size,
                  float: slot.float,
                  borderRadius: slot.borderRadius,
                  opacity: hasImage ? 1 : 0.45,
                }}
              >
                <img src={src} alt="" />
              </div>
            )}
            {groups[i + 1]?.length > 0 && <p>{groups[i + 1].join(' ')}</p>}
          </span>
        )
      })}
    </div>
  )
}
