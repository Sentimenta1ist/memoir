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

function FloatImage({ url, spec }: { url: string; spec: FloatSpec }) {
  const isCircle = spec.shape === 'circle'
  const shapeVal = isCircle ? 'circle(50%)' : 'inset(6px round 18px)'
  const margin = spec.side === 'right' ? '0 0 12px 16px' : '0 16px 12px 0'

  return (
    <img
      src={imgUrl(url)}
      alt=""
      style={{
        float: spec.side,
        width: spec.size,
        height: spec.size,
        shapeOutside: shapeVal,
        clipPath: shapeVal,
        margin,
        objectFit: 'cover',
        display: 'block',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    />
  )
}

export default function ImageFlow({ images, text }: ImageFlowProps) {
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
      nodes.push(
        <FloatImage key={`img${imgIdx}`} url={images[imgIdx].url} spec={getSpec(N, imgIdx)} />
      )
      imgIdx++
    }
  }
  while (imgIdx < N) {
    nodes.push(
      <FloatImage key={`img${imgIdx}`} url={images[imgIdx].url} spec={getSpec(N, imgIdx)} />
    )
    imgIdx++
  }

  return (
    <div className="image-flow" style={{ display: 'block' }}>
      {nodes}
    </div>
  )
}
