import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { format, addMonths } from 'date-fns'
import CalendarPage from './CalendarPage'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

let mockQueryData: { items: { id: string; date: string }[]; total: number; streak: number } | undefined

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: mockQueryData }),
}))

beforeEach(() => {
  mockNavigate.mockReset()
  mockQueryData = { items: [], total: 0, streak: 0 }
})

describe('CalendarPage', () => {
  it('renders current month title', () => {
    render(<CalendarPage />)
    const expected = format(new Date(), 'MMMM yyyy').toUpperCase()
    expect(screen.getByText(expected)).toBeTruthy()
  })

  it('shows dot on entry day', () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    mockQueryData = { items: [{ id: 'entry-1', date: today }], total: 1, streak: 1 }
    render(<CalendarPage />)
    const dots = document.querySelectorAll('.cal-dot')
    expect(dots.length).toBeGreaterThan(0)
  })

  it('navigates to next month on → click', () => {
    render(<CalendarPage />)
    const nextBtn = screen.getByLabelText('Next month')
    fireEvent.click(nextBtn)
    const expected = format(addMonths(new Date(), 1), 'MMMM yyyy').toUpperCase()
    expect(screen.getByText(expected)).toBeTruthy()
  })

  it('navigates to /write?date= when tapping empty day', () => {
    mockQueryData = { items: [], total: 0, streak: 0 }
    render(<CalendarPage />)
    const cells = document.querySelectorAll('.cal-cell:not(.cal-out)')
    expect(cells.length).toBeGreaterThan(0)
    fireEvent.click(cells[0])
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringMatching(/^\/write\?date=\d{4}-\d{2}-\d{2}$/))
  })

  it('navigates to /entry/:id when tapping a day with entry', () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    mockQueryData = { items: [{ id: 'entry-abc', date: today }], total: 1, streak: 1 }
    render(<CalendarPage />)
    const todayCell = document.querySelector('.cal-today')
    expect(todayCell).toBeTruthy()
    fireEvent.click(todayCell!)
    expect(mockNavigate).toHaveBeenCalledWith('/entry/entry-abc')
  })
})
