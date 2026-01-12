import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getValidSession } from './client'
import { ensureSessionCookie, readSessionCookie, setSessionCookie } from '../auth/session'

export const requireJiraSession = async (request: NextRequest) => {
  const existing = readSessionCookie(request)
  const session = await getValidSession(existing?.sid)
  if (!session) {
    return { response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) }
  }
  return { session, sid: existing?.sid }
}

export const ensureSessionCookieOnResponse = (request: NextRequest, response: NextResponse) => {
  const sessionCookie = ensureSessionCookie(request)
  setSessionCookie(response, sessionCookie)
  return response
}


