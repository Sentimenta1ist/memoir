import { create } from 'zustand'

interface User {
  id: string
  email: string
}

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: User | null
  setTokens: (access: string, refresh: string) => void
  setUser: (user: User) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: localStorage.getItem('memoir_access_token'),
  refreshToken: localStorage.getItem('memoir_refresh_token'),
  user: null,
  setTokens: (access, refresh) => {
    localStorage.setItem('memoir_access_token', access)
    localStorage.setItem('memoir_refresh_token', refresh)
    set({ accessToken: access, refreshToken: refresh })
  },
  setUser: (user) => set({ user }),
  clear: () => {
    localStorage.removeItem('memoir_access_token')
    localStorage.removeItem('memoir_refresh_token')
    set({ accessToken: null, refreshToken: null, user: null })
  },
}))
