export function toUserError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('ECONNREFUSED')) {
      return 'Could not reach MongoDB. Check that the server is running and the URL is correct.'
    }
    if (error.message.includes('authentication failed')) {
      return 'MongoDB authentication failed. Check username and password in the connection URL.'
    }
    if (error.message.includes('ENOTFOUND')) {
      return 'MongoDB host not found. Check the connection URL.'
    }
    return error.message
  }

  return 'An unexpected error occurred.'
}

export function failure(error: unknown): { ok: false; error: string } {
  return { ok: false, error: toUserError(error) }
}

export function success<T>(data: T): { ok: true; data: T } {
  return { ok: true, data }
}
