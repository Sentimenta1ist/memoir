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
  accessToken: null,
  refreshToken: null,
  user: null,
  setTokens: (access, refresh) => set({ accessToken: access, refreshToken: refresh }),
  setUser: (user) => set({ user }),
  clear: () => set({ accessToken: null, refreshToken: null, user: null }),
}))
