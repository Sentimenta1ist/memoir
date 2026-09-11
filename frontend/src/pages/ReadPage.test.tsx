import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
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

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: mockEntry, isLoading: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn(), removeQueries: vi.fn() }),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
}))

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('no network in tests'))))
})

describe('ReadPage', () => {
  afterEach(() => {
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
})
