import { atom } from 'jotai'
import { ReactNode } from 'react'

import { ToastVariant } from 'src/components/Toast/Toast'

export interface ToastData {
  id: string
  variant: ToastVariant
  title: string
  description?: string
  duration?: number
  showCloseButton?: boolean
  icon?: ReactNode
}

export interface ToastOptions {
  description?: string
  duration?: number
  showCloseButton?: boolean
  icon?: ReactNode
}

// Base atom to store all toasts
export const toastsAtom = atom<ToastData[]>([])

// Write-only atom to add a toast
export const addToastAtom = atom(
  null,
  (get, set, toast: Omit<ToastData, 'id'>): string => {
    const id = crypto.randomUUID()
    const newToast: ToastData = { ...toast, id }
    set(toastsAtom, [...get(toastsAtom), newToast])
    return id
  },
)

// Write-only atom to remove a toast
export const removeToastAtom = atom(null, (get, set, id: string): void => {
  set(
    toastsAtom,
    get(toastsAtom).filter(toast => toast.id !== id),
  )
})
