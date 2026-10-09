import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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

const { post, showToast } = vi.hoisted(() => ({
  post: vi.fn(() => Promise.resolve({ data: { id: 'new-entry' } })),
  showToast: vi.fn(),
}))

vi.mock('../api/client', () => ({
  default: { post, put: vi.fn(), delete: vi.fn() },
  imgUrl: (p: string) => p,
}))

vi.mock('../store/toastStore', () => ({
  useToastStore: () => ({ showToast }),
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

  it('saves with only the Day section filled in', async () => {
    render(<WritePage />)
    fireEvent.change(screen.getByPlaceholderText('Tell me how the day went…'), {
      target: { value: 'Just the day' },
    })
    fireEvent.click(screen.getByText('Save'))
    await waitFor(() => expect(post).toHaveBeenCalled())
    expect(post).toHaveBeenCalledWith(
      '/entries',
      expect.objectContaining({ day_text: 'Just the day', thought_text: '', tomorrow_text: '' })
    )
  })

  it('still requires the Day section', () => {
    post.mockClear()
    render(<WritePage />)
    fireEvent.click(screen.getByText('Save'))
    expect(post).not.toHaveBeenCalled()
    expect(showToast).toHaveBeenCalledWith('Please fill in the Day section')
  })
})
