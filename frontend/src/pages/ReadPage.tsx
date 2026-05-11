import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import client from '../api/client'
import { useToastStore } from '../store/toastStore'
import ImageFlow from '../components/ImageFlow'
import type { EntryResponse } from '../types'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

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

const FIELD_MAP = {
  day: 'day_text',
  mind: 'thought_text',
  tomorrow: 'tomorrow_text',
} as const

type Block = keyof typeof FIELD_MAP

function PencilIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12.5 2.5l3 3-9.5 9.5-3.5.5.5-3.5 9.5-9.5z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function ReadPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showToast } = useToastStore()

  const [editingBlock, setEditingBlock] = useState<Block | null>(null)
  const [draftValue, setDraftValue] = useState('')
  const [savedIndicator, setSavedIndicator] = useState<Block | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { data: entry, isLoading } = useQuery<EntryResponse>({
    queryKey: ['entry', id],
    queryFn: () => client.get<EntryResponse>(`/entries/${id}`).then((r) => r.data),
    enabled: !!id,
    staleTime: 1000 * 60,
  })

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
      autoResize(textareaRef.current)
    }
  }, [editingBlock])

  const mutation = useMutation({
    mutationFn: (payload: { block: Block; value: string }) =>
      client.put(`/entries/${id}`, { [FIELD_MAP[payload.block]]: payload.value }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['entry', id] })
      queryClient.invalidateQueries({ queryKey: ['entries'] })
      setEditingBlock(null)
      setEditError(null)
      setSavedIndicator(vars.block)
      setTimeout(() => setSavedIndicator(null), 1500)
    },
    onError: () => {
      setEditError('Failed to save. Try again.')
    },
  })

  const getOriginal = (block: Block) => {
    if (!entry) return ''
    if (block === 'day') return entry.day_text ?? ''
    if (block === 'mind') return entry.thought_text ?? ''
    return entry.tomorrow_text ?? ''
  }

  const openEdit = (block: Block) => {
    if (editingBlock !== null && editingBlock !== block) {
      if (draftValue !== getOriginal(editingBlock)) {
        if (!confirm('Discard changes?')) return
      }
    }
    setEditingBlock(block)
    setDraftValue(getOriginal(block))
    setEditError(null)
  }

  const handleSave = () => {
    if (!editingBlock) return
    mutation.mutate({ block: editingBlock, value: draftValue })
  }

  const handleCancel = () => {
    setDraftValue('')
    setEditingBlock(null)
    setEditError(null)
  }

  const handleDelete = async () => {
    if (!confirm('Delete this entry?')) return
    try {
      await client.delete(`/entries/${id}`)
      queryClient.invalidateQueries({ queryKey: ['entries'] })
      queryClient.removeQueries({ queryKey: ['entry', id] })
      navigate('/')
    } catch {
      showToast('Failed to delete. Try again.')
    }
  }

  if (isLoading || !entry) {
    return <div className="loading-center">Loading…</div>
  }

  const renderBlock = (block: Block, content: React.ReactNode) => {
    const isEditing = editingBlock === block
    const isSaved = savedIndicator === block
    return (
      <div className="read-section" key={block}>
        <button
          className="edit-pencil-btn"
          onClick={() => openEdit(block)}
          aria-label={`Edit ${block}`}
        >
          <PencilIcon />
        </button>
        {isEditing ? (
          <>
            <textarea
              ref={textareaRef}
              className="edit-textarea"
              value={draftValue}
              onChange={(e) => {
                setDraftValue(e.target.value)
                autoResize(e.target)
              }}
            />
            {editError && <div className="edit-error">{editError}</div>}
            <div className="edit-actions">
              <button
                className="edit-save-btn"
                onClick={handleSave}
                disabled={mutation.isPending}
              >
                ✓ Save
              </button>
              <button className="edit-cancel-btn" onClick={handleCancel}>
                ✗ Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            {content}
            {isSaved && <span className="edit-saved-indicator">✓</span>}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="read-page">
      <div className="read-header">
        <button className="icon-btn" onClick={() => navigate('/')} aria-label="Back">
          ←
        </button>
        <span className="read-date">{formatDate(entry.date)}</span>
        <button className="icon-btn" onClick={handleDelete} aria-label="Delete">
          🗑
        </button>
      </div>

      <div className="read-body">
        {entry.day_text &&
          renderBlock(
            'day',
            <>
              <div className="read-section-label">Day</div>
              <ImageFlow images={entry.images} dayText={entry.day_text} apiBase={API_BASE} />
            </>
          )}

        {entry.thought_text &&
          renderBlock(
            'mind',
            <>
              <div className="read-section-label">Mind</div>
              <div className="thought-card">
                <span className="thought-quote">"</span>
                <p className="thought-text">{entry.thought_text}</p>
              </div>
            </>
          )}

        {entry.tomorrow_text &&
          renderBlock(
            'tomorrow',
            <>
              <div className="read-section-label">Tomorrow</div>
              <div className="tomorrow-card">
                <p className="tomorrow-text">{entry.tomorrow_text}</p>
                <span className="tomorrow-mark">→</span>
              </div>
            </>
          )}
      </div>
    </div>
  )
}
