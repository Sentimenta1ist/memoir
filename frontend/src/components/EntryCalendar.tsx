import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

interface EntryCalendarProps {
  entryMap: Map<string, string>
  streak: number
}

export default function EntryCalendar({ entryMap, streak }: EntryCalendarProps) {
  const navigate = useNavigate()
  const [viewDate, setViewDate] = useState(new Date())

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
    <div className="home-cal">
      <div className="home-cal-head">
        <div className="home-cal-streak">
          <span className="sn">{streak}</span>
          <span className="sc-label">day streak</span>
        </div>
        <div className="home-cal-nav">
          <button
            className="icon-btn"
            onClick={() => setViewDate((d) => subMonths(d, 1))}
            aria-label="Previous month"
          >
            ←
          </button>
          <span className="cal-title">{title}</span>
          <button
            className="icon-btn"
            onClick={() => setViewDate((d) => addMonths(d, 1))}
            aria-label="Next month"
          >
            →
          </button>
        </div>
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
