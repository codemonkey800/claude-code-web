/**
 * Custom hook for managing recent server connections in localStorage
 */

import { useCallback, useEffect, useState } from 'react'

const RECENTS_STORAGE_KEY = 'claude-code-web:recents'
const MAX_RECENTS = 5

export interface RecentConnection {
  url: string
  timestamp: number
}

export interface UseRecentsReturn {
  recents: RecentConnection[]
  addRecent: (url: string) => void
  removeRecent: (url: string) => void
  clearRecents: () => void
}

/**
 * Hook for managing recent server URLs
 * Stores up to 5 most recent successful connections
 */
export function useRecents(): UseRecentsReturn {
  const [recents, setRecents] = useState<RecentConnection[]>([])

  // Load recents from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENTS_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as RecentConnection[]
        setRecents(parsed)
      }
    } catch (error) {
      console.error('[useRecents] Failed to load recents:', error)
      setRecents([])
    }
  }, [])

  /**
   * Add a URL to the recents list
   * Removes duplicates and keeps only the most recent MAX_RECENTS entries
   */
  const addRecent = useCallback((url: string): void => {
    setRecents(prev => {
      // Remove any existing entry with the same URL
      const filtered = prev.filter(item => item.url !== url)

      // Add new entry at the beginning
      const updated = [{ url, timestamp: Date.now() }, ...filtered]

      // Keep only the most recent MAX_RECENTS entries
      const limited = updated.slice(0, MAX_RECENTS)

      // Save to localStorage
      try {
        localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(limited))
      } catch (error) {
        console.error('[useRecents] Failed to save recents:', error)
      }

      return limited
    })
  }, [])

  /**
   * Remove a URL from the recents list
   */
  const removeRecent = useCallback((url: string): void => {
    setRecents(prev => {
      const filtered = prev.filter(item => item.url !== url)

      // Update localStorage
      try {
        localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(filtered))
      } catch (error) {
        console.error('[useRecents] Failed to save recents:', error)
      }

      return filtered
    })
  }, [])

  /**
   * Clear all recents
   */
  const clearRecents = useCallback((): void => {
    setRecents([])
    try {
      localStorage.removeItem(RECENTS_STORAGE_KEY)
    } catch (error) {
      console.error('[useRecents] Failed to clear recents:', error)
    }
  }, [])

  return {
    recents,
    addRecent,
    removeRecent,
    clearRecents,
  }
}
