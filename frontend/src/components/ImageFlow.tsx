import { useEffect, useRef, useState } from 'react'
import client, { imgUrl } from '../api/client'

interface ImageFlowProps {
  images: { id: string; url: string; filename: string }[]
  dayText: string
  apiBase: string
  entryId?: string
  onImagesChange?: () => void
}

const SLOTS = [
  { side: 'right' as const, shape: 'circle' as const, size: 120 },
  { side: 'left' as const, shape: 'square' as const, size: 110 },
  { side: 'right' as const, shape: 'circle' as const, size: 108 },
]

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12.5 2.5l3 3-9.5 9.5-3.5.5.5-3.5 9.5-9.5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function ImageFlow({ images, dayText, apiBase, entryId, onImagesChange }: ImageFlowProps) {
  const [picks, setPicks] = useState<(string | null)[]>([null, null, null])
  const fileRefs = useRef<(HTMLInputElement | null)[]>([null, null, null])

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

  const handleReplace = async (i: number, file: File) => {
    const userImg = images[i]
    if (!userImg || !entryId) return
    try {
      const form = new FormData()
      form.append('file', file)
      await client.post(`/entries/${entryId}/images`, form)
      await client.delete(`/entries/${entryId}/images/${userImg.id}`)
      onImagesChange?.()
    } catch { /* graceful degradation */ }
  }

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
              <div
                className={hasImage ? 'img-replace-wrap' : undefined}
                style={{
                  float: slot.side,
                  width: slot.size,
                  height: slot.size,
                  shapeOutside: shapeVal,
                  clipPath: shapeVal,
                  margin,
                  position: 'relative',
                }}
                onClick={hasImage ? () => fileRefs.current[i]?.click() : undefined}
              >
                <img
                  src={src}
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    userSelect: 'none',
                    opacity: hasImage ? 1 : 0.45,
                  }}
                />
                {hasImage && (
                  <>
                    <div className="img-replace-overlay">
                      <PencilIcon />
                    </div>
                    <input
                      ref={(el) => { fileRefs.current[i] = el }}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleReplace(i, file)
                        e.target.value = ''
                      }}
                    />
                  </>
                )}
              </div>
            )}
            {groups[i + 1]?.length > 0 && <p>{groups[i + 1].join(' ')}</p>}
          </span>
        )
      })}
    </div>
  )
}
