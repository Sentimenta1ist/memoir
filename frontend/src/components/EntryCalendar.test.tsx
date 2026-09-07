import { render, screen, fireEvent, within } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { format, addMonths } from 'date-fns'
import EntryCalendar from './EntryCalendar'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

beforeEach(() => {
  mockNavigate.mockReset()
})

describe('EntryCalendar', () => {
  it('renders current month title', () => {
    render(<EntryCalendar entryMap={new Map()} streak={0} />)
    const expected = format(new Date(), 'MMMM yyyy').toUpperCase()
    expect(screen.getByText(expected)).toBeTruthy()
  })

  it('shows the streak number and label', () => {
    render(<EntryCalendar entryMap={new Map()} streak={12} />)
    const streakBlock = document.querySelector<HTMLElement>('.home-cal-streak')!
    expect(within(streakBlock).getByText('12')).toBeTruthy()
    expect(within(streakBlock).getByText('day streak')).toBeTruthy()
  })

  it('shows a dot on days that have an entry', () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    render(<EntryCalendar entryMap={new Map([[today, 'entry-1']])} streak={1} />)
    const dots = document.querySelectorAll('.cal-dot')
    expect(dots.length).toBeGreaterThan(0)
  })

  it('navigates to the next month on → click', () => {
    render(<EntryCalendar entryMap={new Map()} streak={0} />)
    const nextBtn = screen.getByLabelText('Next month')
    fireEvent.click(nextBtn)
    const expected = format(addMonths(new Date(), 1), 'MMMM yyyy').toUpperCase()
    expect(screen.getByText(expected)).toBeTruthy()
  })

  it('navigates to /write?date= when tapping an empty day', () => {
    render(<EntryCalendar entryMap={new Map()} streak={0} />)
    const cells = document.querySelectorAll('.cal-cell:not(.cal-out)')
    expect(cells.length).toBeGreaterThan(0)
    fireEvent.click(cells[0])
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringMatching(/^\/write\?date=\d{4}-\d{2}-\d{2}$/))
  })

  it('navigates to /entry/:id when tapping a day with an entry', () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    render(<EntryCalendar entryMap={new Map([[today, 'entry-abc']])} streak={1} />)
    const todayCell = document.querySelector('.cal-today')
    expect(todayCell).toBeTruthy()
    fireEvent.click(todayCell!)
    expect(mockNavigate).toHaveBeenCalledWith('/entry/entry-abc')
  })
})
