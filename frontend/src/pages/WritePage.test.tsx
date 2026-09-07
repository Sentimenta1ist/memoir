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
  it('renders the new block labels and hints instead of DAY/MIND/TOMORROW', () => {
    render(<WritePage />)

    expect(screen.getByText('ЛОГ ДНЯ')).toBeTruthy()
    expect(screen.getByText('ДЕЛА')).toBeTruthy()
    expect(screen.getByText('МЫСЛИ')).toBeTruthy()

    expect(screen.queryByText('DAY')).toBeNull()
    expect(screen.queryByText('MIND')).toBeNull()
    expect(screen.queryByText('TOMORROW')).toBeNull()

    expect(screen.getByText(/Что было сегодня/)).toBeTruthy()
    expect(screen.queryByText(/3–4 sentences/)).toBeNull()

    expect(screen.getByPlaceholderText('Расскажи, как прошёл день…')).toBeTruthy()
    expect(screen.getByPlaceholderText('Что осталось незакрытым…')).toBeTruthy()
    expect(screen.getByPlaceholderText('Мысль, идея, мелочь…')).toBeTruthy()
  })
})
