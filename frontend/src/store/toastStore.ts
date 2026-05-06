import { create } from 'zustand'

interface ToastState {
  message: string | null
  show: boolean
  showToast: (message: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  show: false,
  showToast: (message) => {
    set({ message, show: true })
    setTimeout(() => set({ show: false }), 2100)
  },
}))
