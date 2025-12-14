import { create } from 'zustand'

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
}

interface ToastStore {
  toasts: Toast[]
  toast: (props: Omit<Toast, 'id'>) => void
  dismiss: (id: string) => void
}

export const useToast = create<ToastStore>((set, get) => ({
  toasts: [],
  toast: (props) => {
    const id = Math.random().toString(36).substr(2, 9)
    const toast: Toast = { id, ...props }
    
    set((state) => ({
      toasts: [...state.toasts, toast]
    }))

    // Auto-dismiss después de 5 segundos
    setTimeout(() => {
      get().dismiss(id)
    }, 5000)
  },
  dismiss: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    }))
  }
}))

