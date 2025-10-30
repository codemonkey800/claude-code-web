import { Loader2 } from 'lucide-react'
import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from 'react'

import { cns } from 'src/utils/cns'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Button visual variant
   * - primary: Purple background for main actions
   * - secondary: Gray background with border
   * - ghost: Transparent with hover effect
   * - destructive: Red hover for delete actions
   * - link: Text-only with underline
   */
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'link'

  /**
   * Make button full width of container
   */
  fullWidth?: boolean

  /**
   * Show loading spinner and disable interaction
   */
  loading?: boolean

  /**
   * Icon to display alongside button text
   */
  icon?: ReactNode

  /**
   * Position of the icon relative to children
   */
  iconPosition?: 'left' | 'right'

  /**
   * Button content (optional for icon-only buttons)
   */
  children?: ReactNode

  /**
   * Additional CSS classes (merged with cns utility)
   */
  className?: string
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = 'primary',
      fullWidth = false,
      loading = false,
      icon,
      iconPosition = 'left',
      children,
      className,
      disabled,
      ...props
    },
    ref,
  ) {
    // Base styles applied to all buttons
    const baseStyles =
      'inline-flex items-center justify-center gap-2 text-base px-4 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:cursor-not-allowed'

    // Variant-specific styles
    const variantStyles = {
      primary: cns(
        'bg-purple-600 text-white',
        'hover:bg-purple-500 hover:shadow-lg hover:shadow-purple-500/50',
        'focus:ring-purple-500',
        'disabled:bg-gray-700 disabled:opacity-50 disabled:hover:shadow-none',
      ),
      secondary: cns(
        'bg-gray-700 text-gray-200 border border-gray-600',
        'hover:bg-gray-600',
        'focus:ring-gray-500',
        'disabled:opacity-50',
      ),
      ghost: cns(
        'bg-transparent text-gray-300',
        'hover:bg-gray-700',
        'focus:ring-gray-500',
        'disabled:opacity-50',
      ),
      destructive: cns(
        'bg-transparent text-gray-400',
        'hover:bg-red-900 hover:text-red-400',
        'focus:ring-red-500',
        'disabled:opacity-50',
      ),
      link: cns(
        'bg-transparent text-purple-400 underline px-0',
        'hover:text-purple-300 hover:no-underline',
        'focus:ring-purple-500',
        'disabled:opacity-50',
      ),
    }

    // Render icon with loading state
    const renderIcon = (): ReactNode => {
      if (loading) {
        return <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      }
      if (icon) {
        return <span className="flex-shrink-0">{icon}</span>
      }
      return null
    }

    return (
      <button
        ref={ref}
        className={cns(
          baseStyles,
          variantStyles[variant],
          fullWidth && 'w-full',
          className,
        )}
        disabled={disabled || loading}
        {...props}
      >
        {iconPosition === 'left' && renderIcon()}
        {children}
        {iconPosition === 'right' && renderIcon()}
      </button>
    )
  },
)
