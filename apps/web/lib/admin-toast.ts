import { create } from 'zustand'

interface AdminToastState {
  message: string | null
  variant: 'success' | 'error'
  show: (message: string, variant: 'success' | 'error') => void
  dismiss: () => void
}

export const useAdminToastStore = create<AdminToastState>((set) => ({
  message: null,
  variant: 'error',
  show: (message, variant) => set({ message, variant }),
  dismiss: () => set({ message: null }),
}))

export const adminToast = {
  success(message: string) {
    useAdminToastStore.getState().show(message, 'success')
  },
  error(message: string) {
    useAdminToastStore.getState().show(message, 'error')
  },
}
