export function renderTemplate(
  template: string,
  variables: Record<string, string | number | null | undefined>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = variables[key]
    if (value == null || value === '') return '—'
    return String(value)
  })
}

export function buildMenuText(
  welcomeTemplate: string,
  items: { key: string; label: string; enabled: boolean }[],
  variables: Record<string, string | number | null | undefined>
): string {
  const menuItems = items
    .filter((item) => item.enabled)
    .map((item) => `${item.key}. ${item.label}`)
    .join('\n')

  return renderTemplate(welcomeTemplate, { ...variables, menuItems })
}

export function hashMessageBody(body: string): string {
  return body.trim().toLowerCase()
}
