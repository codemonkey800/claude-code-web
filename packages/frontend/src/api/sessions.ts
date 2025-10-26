import type { CreateSessionPayload, Session } from '@claude-code-web/shared'

/**
 * Fetch all sessions from the backend
 * @returns Promise resolving to array of sessions
 * @throws Error if the request fails
 */
export async function fetchSessions(): Promise<Session[]> {
  const response = await fetch('/api/sessions')

  if (!response.ok) {
    throw new Error(`Failed to fetch sessions: ${response.statusText}`)
  }

  return response.json() as Promise<Session[]>
}

/**
 * Create a new session
 * @param payload - Optional session creation payload
 * @returns Promise resolving to the created session
 * @throws Error if the request fails
 */
export async function createSession(
  payload?: CreateSessionPayload,
): Promise<Session> {
  const response = await fetch('/api/sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload || {}),
  })

  if (!response.ok) {
    throw new Error(`Failed to create session: ${response.statusText}`)
  }

  return response.json() as Promise<Session>
}
