import * as React from 'react'

import { Input } from '@/components/ui/input'
import { formatNumericDisplay, parseNumericInput, sanitizeNumericInput } from '@/lib/numeric-input'
import { cn } from '@/lib/utils'

export interface NumericInputProps
  extends Omit<React.ComponentProps<typeof Input>, 'type' | 'onChange' | 'value' | 'inputMode'> {
  value?: number | string | null
  onNumberChange?: (value: number) => void
  allowDecimal?: boolean
  integerOnly?: boolean
}

export const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  (
    {
      value,
      onNumberChange,
      allowDecimal = true,
      integerOnly = false,
      className,
      onBlur,
      onPaste,
      ...props
    },
    ref
  ) => {
    const decimalAllowed = integerOnly ? false : allowDecimal
    const [draft, setDraft] = React.useState(() => formatNumericDisplay(value))
    const lastEmitted = React.useRef<number | null>(null)

    React.useEffect(() => {
      const external = parseNumericInput(formatNumericDisplay(value), decimalAllowed)
      if (lastEmitted.current === null || external !== lastEmitted.current) {
        setDraft(formatNumericDisplay(value))
        lastEmitted.current = external
      }
    }, [value, decimalAllowed])

    const commitDraft = (nextDraft: string) => {
      const sanitized = sanitizeNumericInput(nextDraft, decimalAllowed)
      setDraft(sanitized)
      const parsed = parseNumericInput(sanitized, decimalAllowed)
      lastEmitted.current = parsed
      onNumberChange?.(parsed)
    }

    return (
      <Input
        ref={ref}
        type="text"
        inputMode={decimalAllowed ? 'decimal' : 'numeric'}
        autoComplete="off"
        className={cn('tabular-nums', className)}
        value={draft}
        onChange={(event) => commitDraft(event.target.value)}
        onBlur={(event) => {
          const sanitized = sanitizeNumericInput(event.target.value, decimalAllowed)
          const normalized =
            sanitized.endsWith('.') ? sanitized.slice(0, -1) : sanitized
          setDraft(normalized)
          onBlur?.(event)
        }}
        onPaste={(event) => {
          event.preventDefault()
          const pasted = event.clipboardData.getData('text')
          const input = event.currentTarget
          const start = input.selectionStart ?? draft.length
          const end = input.selectionEnd ?? draft.length
          commitDraft(`${draft.slice(0, start)}${pasted}${draft.slice(end)}`)
          onPaste?.(event)
        }}
        {...props}
      />
    )
  }
)

NumericInput.displayName = 'NumericInput'
