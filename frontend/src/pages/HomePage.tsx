import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import client, { imgUrl } from '../api/client'
import { useAuthStore } from '../store/authStore'
import type { EntryListResponse, EntryResponse } from '../types'

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function EntryCard({ entry }: { entry: EntryResponse }) {
  const navigate = useNavigate()
  const imgs = entry.images
  return (
    <div
      className="entry-card"
      onClick={() => navigate(`/entry/${entry.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/entry/${entry.id}`)}
    >
      <div className="entry-card__main">
        <div className="ec-date">{formatDate(entry.date)}</div>
        {entry.day_text && <div className="ec-day">{entry.day_text}</div>}
        {entry.thought_text && <div className="ec-thought">{entry.thought_text}</div>}
        {imgs.length > 0 && (
          <div className="ec-images">
            {imgs[0] && <img className="ec-th" src={imgUrl(imgs[0].url)} alt="" />}
            {imgs[1] && <img className="ec-sq" src={imgUrl(imgs[1].url)} alt="" />}
            {imgs.slice(2, 3).map((img) => (
              <img key={img.id} className="ec-th" src={imgUrl(img.url)} alt="" />
            ))}
            {imgs.length > 3 && (
              <div className="ec-badge">+{imgs.length - 3}</div>
            )}
          </div>
        )}
      </div>
      <button
        className="entry-card__edit"
        onClick={(e) => {
          e.stopPropagation()
          navigate(`/write/${entry.id}`)
        }}
        aria-label="Edit entry"
        title="Edit"
      >
        ✎
      </button>
    </div>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const { user, clear } = useAuthStore()
  const [infoOpen, setInfoOpen] = useState(false)

  const { data, isLoading } = useQuery<EntryListResponse>({
    queryKey: ['entries'],
    queryFn: () =>
      client.get<EntryListResponse>('/entries?page=1&limit=50').then((r) => r.data),
    staleTime: 1000 * 60,
  })

  const today = new Date().toISOString().slice(0, 10)
  const todayEntry = data?.items.find((e) => e.date === today)
  const streak = data?.streak ?? 0

  const handleLogout = () => {
    clear()
    navigate('/login')
  }

  return (
    <div className="page">
      <div className="header">
        <span className="logo">MEMOIR</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button className="icon-btn" onClick={() => navigate('/calendar')} aria-label="Calendar">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="3" width="16" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M1 7h16" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M5 1v4M13 1v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          <button className="icon-btn" onClick={() => setInfoOpen(true)} aria-label="Info">
            •••
          </button>
        </div>
      </div>

      <div className="sc">
        <div className="sc-left">
          <div className="sn">{streak}</div>
          <div className="sc-label">day streak</div>
        </div>
        <div className="sc-dots">
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} className={`dot${i < Math.min(streak, 7) ? ' dot-on' : ''}`} />
          ))}
        </div>
      </div>

      <div className="today-pill-row">
        {todayEntry ? (
          <button
            className="today-pill done today-pill-btn"
            onClick={() => navigate(`/write/${todayEntry.id}`)}
          >
            Today · edit ✎
          </button>
        ) : (
          <button
            className="today-pill pending today-pill-btn"
            onClick={() => navigate('/write')}
          >
            <span className="pulse-dot" />
            + write today
          </button>
        )}
      </div>

      <div className="section-header">
        <span className="section-title">Entries</span>
        <span className="section-line" />
      </div>

      {isLoading && <div className="loading-center">Loading…</div>}

      {!isLoading && data?.items.length === 0 && (
        <div className="empty-state">
          <span>✦</span>
          First page not written yet
        </div>
      )}

      {!isLoading && data && data.items.length > 0 && (
        <div className="ec-list">
          {data.items.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}

      <button className="fab" onClick={() => todayEntry ? navigate(`/write/${todayEntry.id}`) : navigate('/write')} aria-label="Write entry">
        +
      </button>

      {infoOpen && (
        <div className="modal-overlay" onClick={() => setInfoOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <p className="modal-email">{user?.email}</p>
            <button className="btn-grad" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
