import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameMonth,
  isToday,
} from 'date-fns'
import client from '../api/client'
import type { EntryListResponse } from '../types'

export default function CalendarPage() {
  const navigate = useNavigate()
  const [viewDate, setViewDate] = useState(new Date())

  const { data } = useQuery<EntryListResponse>({
    queryKey: ['entries-all'],
    queryFn: () =>
      client.get<EntryListResponse>('/entries?page=1&limit=500').then((r) => r.data),
    staleTime: 1000 * 60,
  })

  const entryMap = new Map<string, string>()
  if (data) {
    for (const entry of data.items) {
      entryMap.set(entry.date, entry.id)
    }
  }

  const monthStart = startOfMonth(viewDate)
  const monthEnd = endOfMonth(viewDate)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const title = format(viewDate, 'MMMM yyyy').toUpperCase()

  const handleDayClick = (day: Date, inMonth: boolean) => {
    if (!inMonth) return
    const dateStr = format(day, 'yyyy-MM-dd')
    const entryId = entryMap.get(dateStr)
    if (entryId) {
      navigate(`/entry/${entryId}`)
    } else {
      navigate(`/write?date=${dateStr}`)
    }
  }

  return (
    <div className="page">
      <div className="cal-header">
        <button className="icon-btn" onClick={() => navigate('/')} aria-label="Back">
          ←
        </button>
        <button
          className="icon-btn"
          onClick={() => setViewDate(subMonths(viewDate, 1))}
          aria-label="Previous month"
        >
          ←
        </button>
        <span className="cal-title">{title}</span>
        <button
          className="icon-btn"
          onClick={() => setViewDate(addMonths(viewDate, 1))}
          aria-label="Next month"
        >
          →
        </button>
      </div>

      <div className="cal-grid">
        {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((d) => (
          <div key={d} className="cal-dow">
            {d}
          </div>
        ))}
        {days.map((day) => {
          const inMonth = isSameMonth(day, viewDate)
          const dateStr = format(day, 'yyyy-MM-dd')
          const entryId = entryMap.get(dateStr)
          const todayCell = isToday(day)
          return (
            <div
              key={dateStr}
              className={`cal-cell${todayCell ? ' cal-today' : ''}${!inMonth ? ' cal-out' : ''}`}
              onClick={() => handleDayClick(day, inMonth)}
            >
              <span className="cal-day-num">{format(day, 'd')}</span>
              {entryId && <span className="cal-dot" />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
