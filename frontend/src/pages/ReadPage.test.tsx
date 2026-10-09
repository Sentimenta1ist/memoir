import type { ReactNode } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import ReadPage from './ReadPage'
import type { EntryResponse } from '../types'

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ id: 'entry-1' }),
  Link: ({ to, className, children }: { to: string; className?: string; children: ReactNode }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}))

const mockEntry: EntryResponse = {
  id: 'entry-1',
  user_id: 'u1',
  date: '2026-09-01',
  day_text: 'Прогулка вечером и Netflix.',
  thought_text: 'Дописать отчёт клиенту.',
  tomorrow_text: 'Позвонить в 10:00.',
  created_at: '2026-09-01T00:00:00',
  updated_at: '2026-09-01T00:00:00',
  images: [],
}

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }))

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) =>
    queryKey[0] === 'entries'
      ? {
          data: {
            items: [mockEntry, { ...mockEntry, id: 'entry-2', date: '2026-09-03' }],
            total: 2,
            streak: 0,
          },
        }
      : { data: mockEntry, isLoading: false },
  useQueryClient: () => ({ invalidateQueries: vi.fn(), removeQueries: vi.fn() }),
  useMutation: () => ({ mutate, isPending: false }),
}))

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('no network in tests'))))
})

describe('ReadPage', () => {
  afterEach(() => {
    mockEntry.thought_text = 'Дописать отчёт клиенту.'
    mockEntry.tomorrow_text = 'Позвонить в 10:00.'
  })

  it('renders English section labels', () => {
    render(<ReadPage />)

    expect(screen.getByText('Day')).toBeTruthy()
    expect(screen.getByText('Tasks')).toBeTruthy()
    expect(screen.getByText('Thoughts')).toBeTruthy()

    expect(screen.queryByText('Лог дня')).toBeNull()
    expect(screen.queryByText('Дела')).toBeNull()
    expect(screen.queryByText('Мысли')).toBeNull()
  })

  it('still renders the day text through ImageFlow and the thought/tomorrow content', () => {
    render(<ReadPage />)
    expect(screen.getByText(/Прогулка вечером и Netflix/)).toBeTruthy()
    expect(screen.getByText('Дописать отчёт клиенту.')).toBeTruthy()
    expect(screen.getByText('Позвонить в 10:00.')).toBeTruthy()
  })

  it('does not render "Read more" for a short thoughts entry', () => {
    render(<ReadPage />)
    expect(screen.queryByText('Read more')).toBeNull()
  })

  it('renders "Read more" linking to the entry when the thoughts entry is truncated', () => {
    mockEntry.tomorrow_text = 'A'.repeat(221)
    render(<ReadPage />)
    const link = screen.getByText('Read more')
    expect(link).toBeTruthy()
    expect(link.getAttribute('href')).toBe('/entry/entry-1')
  })

  it('shows editable placeholders when optional sections are empty', () => {
    mockEntry.thought_text = null
    mockEntry.tomorrow_text = null
    render(<ReadPage />)
    expect(screen.getByText('Tasks')).toBeTruthy()
    expect(screen.getByText('Thoughts')).toBeTruthy()
    expect(screen.getByText(/No tasks/)).toBeTruthy()
    expect(screen.getByText(/No thoughts/)).toBeTruthy()
    expect(screen.getByLabelText('Edit mind')).toBeTruthy()
    expect(screen.getByLabelText('Edit tomorrow')).toBeTruthy()
  })

  it('opens the in-app date picker next to delete and moves the entry', () => {
    mutate.mockClear()
    render(<ReadPage />)
    expect(screen.getByLabelText('Delete')).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(screen.getByLabelText('Change date'))
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('SEPTEMBER 2026')).toBeTruthy()

    const current = screen.getByLabelText('September 1, 2026') as HTMLButtonElement
    const taken = screen.getByLabelText('September 3, 2026') as HTMLButtonElement
    const free = screen.getByLabelText('September 10, 2026') as HTMLButtonElement
    expect(current.disabled).toBe(true)
    expect(taken.disabled).toBe(true)
    expect(free.disabled).toBe(false)

    const confirm = screen.getByText('Pick a new date') as HTMLButtonElement
    expect(confirm.disabled).toBe(true)
    fireEvent.click(free)
    fireEvent.click(screen.getByText('Move to Thu, Sep 10'))
    expect(mutate).toHaveBeenCalledWith('2026-09-10')
  })

  it('closes the date picker on backdrop click and Escape', () => {
    mutate.mockClear()
    render(<ReadPage />)
    fireEvent.click(screen.getByLabelText('Change date'))
    fireEvent.click(document.querySelector('.sheet-overlay')!)
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(screen.getByLabelText('Change date'))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(mutate).not.toHaveBeenCalled()
  })
})
