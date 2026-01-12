import { refreshToken } from '../auth/oauth'
import { deleteStoredSession, getStoredSession, setStoredSession, type StoredAuthSession } from '../auth/session'

export type JiraSession = StoredAuthSession

const jiraApiBase = (cloudId: string) => `https://api.atlassian.com/ex/jira/${cloudId}`

const logDev = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(...args)
  }
}

export const getValidSession = async (sid?: string): Promise<JiraSession | null> => {
  if (!sid) {
    logDev('getValidSession: No sid provided')
    return null
  }

  const stored = getStoredSession(sid)
  if (!stored || !stored.accessToken || !stored.cloudId) {
    logDev('getValidSession: No auth data found for sid', sid)
    return null
  }

  const now = Date.now()
  if (stored.expiresAt && now < stored.expiresAt) {
    logDev('getValidSession: Token still valid, expires in', Math.round((stored.expiresAt - now) / 1000), 'seconds')
    return stored
  }

  if (!stored.refreshToken) {
    logDev('getValidSession: Token expired and no refresh token')
    return null
  }

  logDev('getValidSession: Token expired, refreshing...')
  try {
    const refreshed = await refreshToken(stored.refreshToken)
    const expiresAt = Date.now() + (refreshed.expires_in - 30) * 1000
    const updated: JiraSession = {
      ...stored,
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? stored.refreshToken,
      expiresAt,
    }
    setStoredSession(sid, updated)
    logDev('getValidSession: Token refreshed successfully')
    return updated
  } catch (error) {
    console.error('getValidSession: Token refresh failed:', (error as Error).message)
    deleteStoredSession(sid)
    return null
  }
}

export const jiraFetch = async (session: JiraSession, path: string) => {
  const url = `${jiraApiBase(session.cloudId)}${path}`
  logDev('Jira API call:', path)

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      Accept: 'application/json',
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.error('Jira API error:', res.status, text)
    const error = new Error(`Jira API failed ${res.status}: ${text || res.statusText}`)
    ;(error as { status?: number }).status = res.status
    throw error
  }

  return res.json()
}


