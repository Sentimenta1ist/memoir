import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import WritePage from './WritePage'

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({}),
  useSearchParams: () => [new URLSearchParams()],
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: undefined, isLoading: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}))

describe('WritePage', () => {
  it('renders English block labels, hints, and placeholders', () => {
    render(<WritePage />)

    expect(screen.getByText('DAY')).toBeTruthy()
    expect(screen.getByText('TASKS')).toBeTruthy()
    expect(screen.getByText('THOUGHTS')).toBeTruthy()

    expect(screen.queryByText('ЛОГ ДНЯ')).toBeNull()
    expect(screen.queryByText('ДЕЛА')).toBeNull()
    expect(screen.queryByText('МЫСЛИ')).toBeNull()

    expect(screen.getByText(/What happened today/)).toBeTruthy()

    expect(screen.getByPlaceholderText('Tell me how the day went…')).toBeTruthy()
    expect(screen.getByPlaceholderText("What's left unfinished…")).toBeTruthy()
    expect(screen.getByPlaceholderText('A thought, an idea, something small…')).toBeTruthy()
  })
})
