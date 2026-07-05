export function matchMenuKeyword(
  body: string,
  keywords: Record<string, string>,
  useRegex: boolean
): { pattern: string; menuKey: string } | null {
  const trimmed = body.trim()
  if (!trimmed) return null

  if (!useRegex) {
    const lower = trimmed.toLowerCase()
    for (const [keyword, menuKey] of Object.entries(keywords)) {
      if (lower === keyword.toLowerCase()) {
        return { pattern: keyword, menuKey }
      }
    }
    return null
  }

  for (const [pattern, menuKey] of Object.entries(keywords)) {
    try {
      const regex = new RegExp(pattern, 'i')
      if (regex.test(trimmed)) {
        return { pattern, menuKey }
      }
    } catch {
      if (trimmed.toLowerCase() === pattern.toLowerCase()) {
        return { pattern, menuKey }
      }
    }
  }

  return null
}

export function matchMenuItemKey(body: string, useRegex: boolean): string | null {
  const trimmed = body.trim()
  if (!trimmed) return null

  if (useRegex) {
    const digitMatch = trimmed.match(/^(\d+)$/)
    return digitMatch?.[1] ?? null
  }

  return /^\d+$/.test(trimmed) ? trimmed : null
}

export function matchesMenuInput(
  body: string,
  keywords: Record<string, string>,
  useRegex: boolean
): boolean {
  if (matchMenuItemKey(body, useRegex)) return true
  return matchMenuKeyword(body, keywords, useRegex) !== null
}
