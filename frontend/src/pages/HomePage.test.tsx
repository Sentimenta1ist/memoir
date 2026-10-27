import { render, screen, within } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import HomePage from './HomePage'
import type { EntryListResponse } from '../types'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('../store/authStore', () => ({
  useAuthStore: () => ({ user: { id: 'u1', email: 'test@memoir.app' }, clear: vi.fn() }),
}))

let mockQueryData: EntryListResponse | undefined
let mockIsLoading = false

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: mockQueryData, isLoading: mockIsLoading }),
}))

beforeEach(() => {
  mockNavigate.mockReset()
  mockIsLoading = false
  mockQueryData = { items: [], total: 0, streak: 0 }
})

describe('HomePage', () => {
  it('renders the embedded calendar above the entries list, with no separate /calendar route', () => {
    mockQueryData = {
      items: [
        {
          id: 'e1',
          user_id: 'u1',
          date: '2026-09-01',
          day_text: 'Day text',
          thought_text: 'Thought text',
          tomorrow_text: 'Tomorrow text',
          created_at: '2026-09-01T00:00:00',
          updated_at: '2026-09-01T00:00:00',
          images: [],
        },
      ],
      total: 1,
      streak: 3,
    }
    render(<HomePage />)

    expect(document.querySelector('.home-cal')).toBeTruthy()
    expect(document.querySelector('.cal-grid')).toBeTruthy()
    const streakBlock = document.querySelector<HTMLElement>('.home-cal-streak')!
    expect(within(streakBlock).getByText('3')).toBeTruthy()
    expect(within(streakBlock).getByText('day streak')).toBeTruthy()

    // The standalone calendar route/icon is gone — only the "info" icon remains in the header
    expect(screen.queryByLabelText('Calendar')).toBeNull()
    expect(screen.getByLabelText('Info')).toBeTruthy()

    // Calendar renders before the entries section in document order
    const calendar = document.querySelector('.home-cal')!
    const entriesSection = document.querySelector('.section-header')!
    expect(
      calendar.compareDocumentPosition(entriesSection) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()

    expect(document.querySelector('.ec-list')).toBeTruthy()
  })

  it('shows the empty state when there are no entries', () => {
    render(<HomePage />)
    expect(screen.getByText('First page not written yet')).toBeTruthy()
  })
})
