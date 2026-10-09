import { useEffect, useState } from 'react'
import {
  format,
  parseISO,
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

interface DatePickerSheetProps {
  currentDate: string
  occupiedDates: Set<string>
  pending: boolean
  onConfirm: (date: string) => void
  onClose: () => void
}

export default function DatePickerSheet({
  currentDate,
  occupiedDates,
  pending,
  onConfirm,
  onClose,
}: DatePickerSheetProps) {
  const [viewDate, setViewDate] = useState(() => parseISO(currentDate))
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  const calStart = startOfWeek(startOfMonth(viewDate), { weekStartsOn: 1 })
  const calEnd = endOfWeek(endOfMonth(viewDate), { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Move entry to another date"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" />
        <div className="sheet-head">
          <div>
            <div className="sheet-title">Move entry</div>
            <div className="sheet-sub">
              Currently {format(parseISO(currentDate), 'EEE, MMM d, yyyy')}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="home-cal-nav sheet-nav">
          <button
            className="icon-btn"
            onClick={() => setViewDate((d) => subMonths(d, 1))}
            aria-label="Previous month"
          >
            ←
          </button>
          <span className="cal-title">{format(viewDate, 'MMMM yyyy').toUpperCase()}</span>
          <button
            className="icon-btn"
            onClick={() => setViewDate((d) => addMonths(d, 1))}
            aria-label="Next month"
          >
            →
          </button>
        </div>

        <div className="cal-grid sheet-grid">
          {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((d) => (
            <div key={d} className="cal-dow">
              {d}
            </div>
          ))}
          {days.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const inMonth = isSameMonth(day, viewDate)
            const isCurrent = dateStr === currentDate
            const isTaken = !isCurrent && occupiedDates.has(dateStr)
            const isSelected = dateStr === selected
            const classes = [
              'cal-cell',
              'sheet-cell',
              isToday(day) && 'cal-today',
              !inMonth && 'cal-out',
              isCurrent && 'sheet-current',
              isTaken && 'sheet-taken',
              isSelected && 'sheet-selected',
            ]
              .filter(Boolean)
              .join(' ')
            return (
              <button
                key={dateStr}
                type="button"
                className={classes}
                disabled={!inMonth || isCurrent || isTaken}
                onClick={() => setSelected(dateStr)}
                aria-label={format(day, 'MMMM d, yyyy')}
                aria-pressed={isSelected}
              >
                <span className="cal-day-num">{format(day, 'd')}</span>
                {(isTaken || isCurrent) && <span className="cal-dot" />}
              </button>
            )
          })}
        </div>

        <button
          className="btn-grad sheet-confirm"
          disabled={!selected || pending}
          onClick={() => selected && onConfirm(selected)}
        >
          {pending
            ? 'Moving…'
            : selected
              ? `Move to ${format(parseISO(selected), 'EEE, MMM d')}`
              : 'Pick a new date'}
        </button>
      </div>
    </div>
  )
}
