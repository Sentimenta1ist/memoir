import { useState, useEffect } from 'react'
import { imgUrl } from '../api/client'

interface ImageFlowProps {
  images: { url: string }[]
  text: string
}

interface FloatSpec {
  side: 'left' | 'right'
  shape: 'circle' | 'square'
  size: number
}

function getSpec(count: number, idx: number): FloatSpec {
  if (count === 1) {
    return { side: 'right', shape: 'circle', size: 140 }
  }
  if (count === 2) {
    if (idx === 0) return { side: 'left', shape: 'circle', size: 120 }
    return { side: 'right', shape: 'square', size: 130 }
  }
  const cycle: FloatSpec[] = [
    { side: 'left', shape: 'circle', size: 130 },
    { side: 'right', shape: 'square', size: 120 },
    { side: 'left', shape: 'circle', size: 110 },
  ]
  return cycle[idx % 3]
}

function FloatImage({
  url,
  spec,
  onClick,
}: {
  url: string
  spec: FloatSpec
  onClick: () => void
}) {
  const isCircle = spec.shape === 'circle'
  const shapeVal = isCircle ? 'circle(50%)' : 'inset(6px round 18px)'
  const floatMargin =
    spec.side === 'right' ? '0 0 12px 16px' : '0 16px 12px 0'

  return (
    <img
      src={imgUrl(url)}
      alt=""
      onClick={onClick}
      style={{
        float: spec.side,
        width: spec.size,
        height: spec.size,
        shapeOutside: shapeVal,
        clipPath: shapeVal,
        margin: floatMargin,
        boxShadow: '0 4px 24px rgba(0,201,177,0.15)',
        cursor: 'pointer',
        objectFit: 'cover',
        display: 'block',
      }}
    />
  )
}

export default function ImageFlow({ images, text }: ImageFlowProps) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!lightboxSrc) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxSrc(null)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [lightboxSrc])

  const N = images.length

  if (N === 0) {
    return (
      <div className="image-flow">
        {text.split('\n').map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
    )
  }

  const sentences = text.split(/(?<=[.!?…])\s+/).filter((s) => s.trim())

  const insertAfter: number[] = []
  if (N === 1) {
    insertAfter.push(0)
  } else if (N === 2) {
    insertAfter.push(0, 2)
  } else {
    const step = sentences.length / N
    for (let i = 0; i < N; i++) {
      insertAfter.push(Math.round((i + 1) * step) - 1)
    }
  }

  const nodes: React.ReactNode[] = []
  let imgIdx = 0

  for (let si = 0; si < sentences.length; si++) {
    nodes.push(<span key={`s${si}`}>{sentences[si]} </span>)
    while (imgIdx < N && insertAfter[imgIdx] === si) {
      const img = images[imgIdx]
      const spec = getSpec(N, imgIdx)
      const src = imgUrl(img.url)
      nodes.push(
        <FloatImage
          key={`img${imgIdx}`}
          url={img.url}
          spec={spec}
          onClick={() => setLightboxSrc(src)}
        />
      )
      imgIdx++
    }
  }
  while (imgIdx < N) {
    const img = images[imgIdx]
    const spec = getSpec(N, imgIdx)
    const src = imgUrl(img.url)
    nodes.push(
      <FloatImage
        key={`img${imgIdx}`}
        url={img.url}
        spec={spec}
        onClick={() => setLightboxSrc(src)}
      />
    )
    imgIdx++
  }

  return (
    <>
      <div className="image-flow" style={{ display: 'block' }}>
        {nodes}
      </div>

      {lightboxSrc && (
        <div
          onClick={() => setLightboxSrc(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(7,9,15,0.92)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <img
            src={lightboxSrc}
            alt=""
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '92vw',
              maxHeight: '88vh',
              objectFit: 'contain',
              borderRadius: '8px',
            }}
          />
        </div>
      )}
    </>
  )
}
