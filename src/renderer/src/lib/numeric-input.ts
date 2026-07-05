export function sanitizeNumericInput(raw: string, allowDecimal: boolean): string {
  if (!allowDecimal) {
    return raw.replace(/\D/g, '')
  }

  let result = ''
  let dotSeen = false

  for (const char of raw) {
    if (char >= '0' && char <= '9') {
      result += char
      continue
    }

    if (char === '.' && !dotSeen) {
      result += char
      dotSeen = true
    }
  }

  return result
}

export function parseNumericInput(raw: string, allowDecimal: boolean): number {
  const sanitized = sanitizeNumericInput(raw, allowDecimal)
  if (!sanitized || sanitized === '.') {
    return 0
  }

  const parsed = allowDecimal ? Number.parseFloat(sanitized) : Number.parseInt(sanitized, 10)
  return Number.isFinite(parsed) ? parsed : 0
}

export function formatNumericDisplay(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return ''
  }

  return String(value)
}
