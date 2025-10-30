import * as ToastPrimitive from '@radix-ui/react-toast'
import { X } from 'lucide-react'
import { ReactNode, useEffect, useRef, useState } from 'react'

import { cns } from 'src/utils/cns'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info' | 'loading'

export interface ToastProps {
  id: string
  variant: ToastVariant
  title: string
  description?: string
  duration?: number
  showCloseButton?: boolean
  icon?: ReactNode
  onClose?: () => void
}

const variantStyles: Record<ToastVariant, string> = {
  success: 'bg-green-950 border-green-500 text-green-400',
  error: 'bg-red-950 border-red-500 text-red-400',
  warning: 'bg-yellow-950 border-yellow-500 text-yellow-400',
  info: 'bg-blue-950 border-blue-500 text-blue-400',
  loading: 'bg-yellow-950 border-yellow-500 text-yellow-400',
}

const progressBarColors: Record<ToastVariant, string> = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  warning: 'bg-yellow-500',
  info: 'bg-blue-500',
  loading: 'bg-yellow-500',
}

const defaultDurations: Record<ToastVariant, number> = {
  success: 5000,
  error: Infinity,
  warning: 8000,
  info: 5000,
  loading: Infinity,
}

export function Toast({
  id,
  variant,
  title,
  description,
  duration,
  showCloseButton = true,
  icon,
  onClose,
}: ToastProps) {
  const styles = variantStyles[variant]
  const progressBarColor = progressBarColors[variant]
  const defaultDuration = defaultDurations[variant]
  const effectiveDuration = duration ?? defaultDuration

  // State and refs for hover and timer management
  const [isHovered, setIsHovered] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startTimeRef = useRef<number>(0)
  const remainingTimeRef = useRef<number>(effectiveDuration)

  // Determine if this toast has a timeout (not infinite duration)
  const hasTimeout = effectiveDuration !== Infinity

  // Custom timer management with pause/resume on hover
  useEffect(() => {
    if (!hasTimeout || !onClose) return

    const startTimer = (timeLeft: number) => {
      startTimeRef.current = Date.now()
      timerRef.current = setTimeout(() => {
        onClose()
      }, timeLeft)
    }

    const pauseTimer = () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
        const elapsed = Date.now() - startTimeRef.current
        remainingTimeRef.current = Math.max(
          0,
          remainingTimeRef.current - elapsed,
        )
      }
    }

    const resumeTimer = () => {
      startTimer(remainingTimeRef.current)
    }

    if (isHovered) {
      pauseTimer()
    } else {
      resumeTimer()
    }

    // Cleanup on unmount
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
      }
    }
  }, [isHovered, hasTimeout, onClose])

  return (
    <ToastPrimitive.Root
      key={id}
      duration={Infinity} // Disable Radix auto-dismiss, we manage it ourselves
      onOpenChange={open => {
        if (!open && onClose) {
          onClose()
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cns(
        'relative rounded-lg border-2 p-4 shadow-lg overflow-hidden',
        'animate-slide-in-right',
        'transition-transform duration-200 ease-in-out hover:scale-105',
        'data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]',
        'data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]',
        'data-[state=closed]:animate-slide-out-right',
        styles,
      )}
    >
      {/* Progress bar at the top */}
      {hasTimeout && (
        <div
          className={cns(
            'absolute top-0 left-0 h-1 rounded-t-lg toast-progress-bar',
            progressBarColor,
          )}
          style={{
            animationDuration: `${effectiveDuration}ms`,
            animationPlayState: isHovered ? 'paused' : 'running',
          }}
        />
      )}

      <div className="flex items-start gap-3">
        {icon}
        <div className="flex-1">
          <ToastPrimitive.Title className="font-semibold">
            {title}
          </ToastPrimitive.Title>
          {description && (
            <ToastPrimitive.Description className="mt-1 text-sm opacity-90">
              {description}
            </ToastPrimitive.Description>
          )}
        </div>
        {showCloseButton && (
          <ToastPrimitive.Close className="ml-auto cursor-pointer hover:opacity-70 transition-opacity">
            <X className="w-4 h-4" />
          </ToastPrimitive.Close>
        )}
      </div>
    </ToastPrimitive.Root>
  )
}
