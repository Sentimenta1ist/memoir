import { Fragment } from 'react'
import { imgUrl } from '../api/client'

interface ImageFlowProps {
  images: { url: string }[]
  text: string
}

const SHAPES = [
  { cls: 'fi-circle-r', size: 110 },
  { cls: 'fi-circle-l', size: 96 },
  { cls: 'fi-square-r', size: 130 },
  { cls: 'fi-circle-l', size: 100 },
  { cls: 'fi-square-l', size: 118 },
]

function FloatImage({ url, shapeIdx }: { url: string; shapeIdx: number }) {
  const s = SHAPES[shapeIdx % 5]
  return (
    <div className={`fi ${s.cls}`} style={{ width: s.size, height: s.size }}>
      <img src={imgUrl(url)} alt="" />
    </div>
  )
}

export default function ImageFlow({ images, text }: ImageFlowProps) {
  const N = images.length

  if (N === 0) {
    return (
      <div className="image-flow">
        <p>{text}</p>
      </div>
    )
  }

  const sentences = text.split(/(?<=[.!?…])\s+/).filter((s) => s.trim())

  if (sentences.length <= 2) {
    return (
      <div className="image-flow">
        {images.map((img, i) => (
          <FloatImage key={i} url={img.url} shapeIdx={i} />
        ))}
        <p>{text}</p>
      </div>
    )
  }

  const groups: string[][] = Array.from({ length: N + 1 }, () => [])
  const groupSize = sentences.length / (N + 1)
  sentences.forEach((s, i) => {
    const gi = Math.min(Math.floor(i / groupSize), N)
    groups[gi].push(s)
  })

  return (
    <div className="image-flow">
      {groups[0].length > 0 && <p>{groups[0].join(' ')}</p>}
      {images.map((img, i) => (
        <Fragment key={i}>
          <FloatImage url={img.url} shapeIdx={i} />
          {groups[i + 1]?.length > 0 && <p>{groups[i + 1].join(' ')}</p>}
        </Fragment>
      ))}
    </div>
  )
}
