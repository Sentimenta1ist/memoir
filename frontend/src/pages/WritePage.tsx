import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import client, { imgUrl } from '../api/client'
import { useToastStore } from '../store/toastStore'
import type { EntryResponse, ImageResponse } from '../types'

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function autoResize(el: HTMLTextAreaElement) {
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

export default function WritePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showToast } = useToastStore()

  const [dayText, setDayText] = useState('')
  const [thoughtText, setThoughtText] = useState('')
  const [tomorrowText, setTomorrowText] = useState('')
  const [existingImages, setExistingImages] = useState<ImageResponse[]>([])
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [toDelete, setToDelete] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  const dayRef = useRef<HTMLTextAreaElement>(null)
  const thoughtRef = useRef<HTMLTextAreaElement>(null)
  const tomorrowRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: entry, isLoading } = useQuery<EntryResponse>({
    queryKey: ['entry', id],
    queryFn: () => client.get<EntryResponse>(`/entries/${id}`).then((r) => r.data),
    enabled: !!id,
    staleTime: 1000 * 60,
  })

  useEffect(() => {
    if (!entry) return
    setDayText(entry.day_text ?? '')
    setThoughtText(entry.thought_text ?? '')
    setTomorrowText(entry.tomorrow_text ?? '')
    setExistingImages(entry.images)
    requestAnimationFrame(() => {
      for (const ref of [dayRef, thoughtRef, tomorrowRef]) {
        if (ref.current) autoResize(ref.current)
      }
    })
  }, [entry])

  const today = new Date().toISOString().slice(0, 10)
  const dateStr = entry?.date ?? today
  const displayDate = formatDate(dateStr)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    setNewFiles((prev) => [...prev, ...files])
    e.target.value = ''
  }

  const removeExisting = (imgId: string) => {
    setExistingImages((prev) => prev.filter((i) => i.id !== imgId))
    setToDelete((prev) => new Set([...prev, imgId]))
  }

  const removeNew = (idx: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSave = async () => {
    if (!dayText.trim() || !thoughtText.trim() || !tomorrowText.trim()) {
      showToast('Please fill in all three sections')
      return
    }
    setSaving(true)
    try {
      let entryId = id
      if (!id) {
        const res = await client.post<EntryResponse>('/entries', {
          date: today,
          day_text: dayText,
          thought_text: thoughtText,
          tomorrow_text: tomorrowText,
        })
        entryId = res.data.id
      } else {
        await client.put(`/entries/${id}`, {
          day_text: dayText,
          thought_text: thoughtText,
          tomorrow_text: tomorrowText,
        })
      }

      for (const imgId of toDelete) {
        await client.delete(`/entries/${entryId}/images/${imgId}`)
      }

      for (const file of newFiles) {
        const form = new FormData()
        form.append('file', file)
        await client.post(`/entries/${entryId}/images`, form)
      }

      queryClient.invalidateQueries({ queryKey: ['entries'] })
      if (entryId) queryClient.invalidateQueries({ queryKey: ['entry', entryId] })
      showToast('Entry saved')
      navigate('/')
    } catch {
      showToast('Failed to save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  if (id && isLoading) {
    return <div className="loading-center">Loading…</div>
  }

  return (
    <div className="page">
      <div className="write-header">
        <button className="icon-btn" onClick={() => navigate('/')} aria-label="Back">
          ←
        </button>
        <span className="write-date">{displayDate}</span>
        <button className="btn-save" onClick={handleSave} disabled={saving}>
          {saving ? '…' : 'Save'}
        </button>
      </div>

      <div className="write-blocks">
        <div className="write-block">
          <div className="block-top">
            <span className="block-badge">01</span>
            <span className="block-title">DAY</span>
          </div>
          <p className="block-hint">What happened today — 3–4 sentences. Just so the day stays.</p>
          <div className="block-divider" />
          <textarea
            ref={dayRef}
            className="block-textarea"
            placeholder="Tell the day…"
            value={dayText}
            onChange={(e) => {
              setDayText(e.target.value)
              autoResize(e.target)
            }}
          />
        </div>

        <div className="write-block">
          <div className="block-top">
            <span className="block-badge">02</span>
            <span className="block-title">MIND</span>
          </div>
          <p className="block-hint">What I thought / read / watched — one idea worth keeping.</p>
          <div className="block-divider" />
          <textarea
            ref={thoughtRef}
            className="block-textarea"
            placeholder="One idea…"
            value={thoughtText}
            onChange={(e) => {
              setThoughtText(e.target.value)
              autoResize(e.target)
            }}
          />
        </div>

        <div className="write-block">
          <div className="block-top">
            <span className="block-badge">03</span>
            <span className="block-title">TOMORROW</span>
          </div>
          <p className="block-hint">Tomorrow — one thing. One specific action. Not a list.</p>
          <div className="block-divider" />
          <textarea
            ref={tomorrowRef}
            className="block-textarea"
            placeholder="One action…"
            value={tomorrowText}
            onChange={(e) => {
              setTomorrowText(e.target.value)
              autoResize(e.target)
            }}
          />
        </div>
      </div>

      <div className="image-zone">
        <button
          className="img-upload-btn"
          onClick={() => fileInputRef.current?.click()}
          type="button"
        >
          + Add photos
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        {(existingImages.length > 0 || newFiles.length > 0) && (
          <div className="img-preview-grid">
            {existingImages.map((img) => (
              <div key={img.id} className="img-preview">
                <img src={imgUrl(img.url)} alt="" />
                <button
                  className="img-delete"
                  onClick={() => removeExisting(img.id)}
                  aria-label="Remove"
                >
                  ×
                </button>
              </div>
            ))}
            {newFiles.map((file, i) => (
              <div key={i} className="img-preview">
                <img src={URL.createObjectURL(file)} alt="" />
                <button
                  className="img-delete"
                  onClick={() => removeNew(i)}
                  aria-label="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
