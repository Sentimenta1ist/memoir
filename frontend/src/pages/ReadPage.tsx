import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import client from '../api/client'
import { useToastStore } from '../store/toastStore'
import { useAutoResizeTextarea } from '../hooks/useAutoResizeTextarea'
import ImageFlow from '../components/ImageFlow'
import DatePickerSheet from '../components/DatePickerSheet'
import type { EntryListResponse, EntryResponse } from '../types'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

const FIELD_MAP = {
  day: 'day_text',
  mind: 'thought_text',
  tomorrow: 'tomorrow_text',
} as const

const READ_MORE_THRESHOLD = 220

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

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2.5" y="3.5" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2.5 7.5h13M6 2v3M12 2v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
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
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const autoResize = useAutoResizeTextarea()

  const { data: entry, isLoading } = useQuery<EntryResponse>({
    queryKey: ['entry', id],
    queryFn: () => client.get<EntryResponse>(`/entries/${id}`).then((r) => r.data),
    enabled: !!id,
    staleTime: 1000 * 60,
  })

  // Same query as HomePage, so the cache is shared; used to mark taken dates
  const { data: entriesData } = useQuery<EntryListResponse>({
    queryKey: ['entries'],
    queryFn: () =>
      client.get<EntryListResponse>('/entries?page=1&limit=500').then((r) => r.data),
    staleTime: 1000 * 60,
  })
  const occupiedDates = useMemo(
    () => new Set((entriesData?.items ?? []).map((e) => e.date)),
    [entriesData]
  )

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

  const dateMutation = useMutation({
    mutationFn: (date: string) => client.put<EntryResponse>(`/entries/${id}`, { date }),
    onSuccess: (res) => {
      queryClient.setQueryData(['entry', id], res.data)
      queryClient.invalidateQueries({ queryKey: ['entries'] })
      setDatePickerOpen(false)
      showToast(`Moved to ${formatDate(res.data.date)}`)
    },
    onError: (err: unknown) => {
      const e = err as { response?: { status?: number } }
      showToast(
        e.response?.status === 409
          ? 'An entry for that date already exists'
          : 'Failed to change date. Try again.'
      )
    },
  })

  const closeDatePicker = useCallback(() => setDatePickerOpen(false), [])

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
    if (editingBlock === 'day' && !draftValue.trim()) {
      setEditError("Day can't be empty.")
      return
    }
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
        <div className="read-header-actions">
          <button
            className="icon-btn"
            onClick={() => setDatePickerOpen(true)}
            aria-label="Change date"
          >
            <CalendarIcon />
          </button>
          <button className="icon-btn" onClick={handleDelete} aria-label="Delete">
            🗑
          </button>
        </div>
      </div>

      <div className="read-body">
        {entry.day_text &&
          renderBlock(
            'day',
            <>
              <div className="read-section-label">Day</div>
              <ImageFlow
                images={entry.images}
                dayText={entry.day_text}
                apiBase={API_BASE}
                entryId={id}
                onImagesChange={() => queryClient.invalidateQueries({ queryKey: ['entry', id] })}
              />
            </>
          )}

        {renderBlock(
          'mind',
          <>
            <div className="read-section-label">Tasks</div>
            {entry.thought_text ? (
              <div className="thought-card">
                <p className="thought-text">{entry.thought_text}</p>
              </div>
            ) : (
              <p className="read-section-empty">No tasks — tap the pencil to add.</p>
            )}
          </>
        )}

        {renderBlock(
          'tomorrow',
          <>
            <div className="read-section-label">Thoughts</div>
            {entry.tomorrow_text ? (
              <div className="tomorrow-card">
                <p className="tomorrow-text">{entry.tomorrow_text}</p>
                {entry.tomorrow_text.length > READ_MORE_THRESHOLD && (
                  <Link className="read-more-link" to={`/entry/${id}`}>
                    Read more
                  </Link>
                )}
              </div>
            ) : (
              <p className="read-section-empty">No thoughts — tap the pencil to add.</p>
            )}
          </>
        )}
      </div>

      {datePickerOpen && (
        <DatePickerSheet
          currentDate={entry.date}
          occupiedDates={occupiedDates}
          pending={dateMutation.isPending}
          onConfirm={(date) => dateMutation.mutate(date)}
          onClose={closeDatePicker}
        />
      )}
    </div>
  )
}
