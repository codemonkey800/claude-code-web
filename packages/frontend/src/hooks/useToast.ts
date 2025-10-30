import { useSetAtom } from 'jotai'

import {
  addToastAtom,
  removeToastAtom,
  ToastOptions,
} from 'src/stores/toastStore'

export interface ToastApi {
  success: (title: string, options?: ToastOptions) => string
  error: (title: string, options?: ToastOptions) => string
  warning: (title: string, options?: ToastOptions) => string
  info: (title: string, options?: ToastOptions) => string
  loading: (title: string, options?: ToastOptions) => string
  dismiss: (id: string) => void
}

export function useToast(): { toast: ToastApi } {
  const addToast = useSetAtom(addToastAtom)
  const removeToast = useSetAtom(removeToastAtom)

  const toast: ToastApi = {
    success: (title: string, options?: ToastOptions) => {
      return addToast({
        variant: 'success',
        title,
        ...options,
      })
    },
    error: (title: string, options?: ToastOptions) => {
      return addToast({
        variant: 'error',
        title,
        ...options,
      })
    },
    warning: (title: string, options?: ToastOptions) => {
      return addToast({
        variant: 'warning',
        title,
        ...options,
      })
    },
    info: (title: string, options?: ToastOptions) => {
      return addToast({
        variant: 'info',
        title,
        ...options,
      })
    },
    loading: (title: string, options?: ToastOptions) => {
      return addToast({
        variant: 'loading',
        title,
        ...options,
      })
    },
    dismiss: (id: string) => {
      removeToast(id)
    },
  }

  return { toast }
}
