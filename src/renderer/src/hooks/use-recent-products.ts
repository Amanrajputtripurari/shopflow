import { useCallback, useState } from 'react'

const STORAGE_KEY = 'shopflow.recent-products'
const MAX_RECENT = 8

function readRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

function writeRecent(ids: string[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(0, MAX_RECENT)))
}

export function useRecentProducts() {
  const [recentIds, setRecentIds] = useState<string[]>(readRecent)

  const trackProduct = useCallback((productId: string) => {
    setRecentIds((current) => {
      const next = [productId, ...current.filter((id) => id !== productId)].slice(0, MAX_RECENT)
      writeRecent(next)
      return next
    })
  }, [])

  return { recentIds, trackProduct }
}
