import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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

export default function ReadPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showToast } = useToastStore()

  const { data: entry, isLoading } = useQuery<EntryResponse>({
    queryKey: ['entry', id],
    queryFn: () => client.get<EntryResponse>(`/entries/${id}`).then((r) => r.data),
    enabled: !!id,
    staleTime: 1000 * 60,
  })

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
        {entry.day_text && (
          <div className="read-section">
            <div className="read-section-label">Day</div>
            <ImageFlow images={entry.images} dayText={entry.day_text} apiBase={API_BASE} />
          </div>
        )}

        {entry.thought_text && (
          <div className="read-section">
            <div className="read-section-label">Mind</div>
            <div className="thought-card">
              <span className="thought-quote">"</span>
              <p className="thought-text">{entry.thought_text}</p>
            </div>
          </div>
        )}

        {entry.tomorrow_text && (
          <div className="read-section">
            <div className="read-section-label">Tomorrow</div>
            <div className="tomorrow-card">
              <p className="tomorrow-text">{entry.tomorrow_text}</p>
              <span className="tomorrow-mark">→</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
