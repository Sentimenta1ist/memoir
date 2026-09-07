import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import ReadPage from './ReadPage'
import type { EntryResponse } from '../types'

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ id: 'entry-1' }),
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
  it('renders the new section labels instead of Day/Mind/Tomorrow', () => {
    render(<ReadPage />)

    expect(screen.getByText('Лог дня')).toBeTruthy()
    expect(screen.getByText('Дела')).toBeTruthy()
    expect(screen.getByText('Мысли')).toBeTruthy()

    expect(screen.queryByText('Day')).toBeNull()
    expect(screen.queryByText('Mind')).toBeNull()
    expect(screen.queryByText('Tomorrow')).toBeNull()
  })

  it('still renders the day text through ImageFlow and the thought/tomorrow content', () => {
    render(<ReadPage />)
    expect(screen.getByText(/Прогулка вечером и Netflix/)).toBeTruthy()
    expect(screen.getByText('Дописать отчёт клиенту.')).toBeTruthy()
    expect(screen.getByText('Позвонить в 10:00.')).toBeTruthy()
  })
})
