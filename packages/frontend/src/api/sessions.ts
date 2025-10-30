import type {
  CreateSessionPayload,
  SendQueryPayload,
  SendQueryResponse,
  Session,
  StartSessionPayload,
} from '@claude-code-web/shared'

/**
 * Type for the configured fetch function from ApiContext
 */
export type ApiFetch = (
  path: string,
  options?: RequestInit,
) => Promise<Response>

/**
 * Fetch all sessions from the backend
 * @param apiFetch - Configured fetch function from ApiContext
 * @returns Promise resolving to array of sessions
 * @throws Error if the request fails
 */
export async function fetchSessions(apiFetch: ApiFetch): Promise<Session[]> {
  const response = await apiFetch('/sessions')

  if (!response.ok) {
    throw new Error(`Failed to fetch sessions: ${response.statusText}`)
  }

  return response.json() as Promise<Session[]>
}

/**
 * Fetch a single session by ID
 * @param apiFetch - Configured fetch function from ApiContext
 * @param sessionId - The session ID to fetch
 * @returns Promise resolving to the session
 * @throws Error if the request fails or session not found
 */
export async function fetchSession(
  apiFetch: ApiFetch,
  sessionId: string,
): Promise<Session> {
  const response = await apiFetch(`/sessions/${sessionId}`)

  if (!response.ok) {
    throw new Error(`Failed to fetch session: ${response.statusText}`)
  }

  return response.json() as Promise<Session>
}

/**
 * Create a new session
 * @param apiFetch - Configured fetch function from ApiContext
 * @param payload - Optional session creation payload
 * @returns Promise resolving to the created session
 * @throws Error if the request fails
 */
export async function createSession(
  apiFetch: ApiFetch,
  payload?: CreateSessionPayload,
): Promise<Session> {
  const response = await apiFetch('/sessions', {
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

/**
 * Start a session (transition from INITIALIZING to ACTIVE)
 * Optionally sends an initial query after starting
 * @param apiFetch - Configured fetch function from ApiContext
 * @param sessionId - The session ID to start
 * @param payload - Optional payload with initial prompt
 * @returns Promise resolving to session or query response
 * @throws Error if the request fails
 */
export async function startSession(
  apiFetch: ApiFetch,
  sessionId: string,
  payload?: StartSessionPayload,
): Promise<Session | SendQueryResponse> {
  const response = await apiFetch(`/sessions/${sessionId}/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload || {}),
  })

  if (!response.ok) {
    throw new Error(`Failed to start session: ${response.statusText}`)
  }

  return response.json() as Promise<Session | SendQueryResponse>
}

/**
 * Send a query to an active session
 * @param apiFetch - Configured fetch function from ApiContext
 * @param sessionId - The session ID to send the query to
 * @param payload - Query payload containing the prompt
 * @returns Promise resolving to the query response
 * @throws Error if the request fails
 */
export async function sendQuery(
  apiFetch: ApiFetch,
  sessionId: string,
  payload: SendQueryPayload,
): Promise<SendQueryResponse> {
  const response = await apiFetch(`/sessions/${sessionId}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Failed to send query: ${response.statusText}`)
  }

  return response.json() as Promise<SendQueryResponse>
}
