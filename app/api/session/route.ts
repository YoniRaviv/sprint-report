import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ensureSessionCookie, readSessionCookie, setSessionCookie } from '@/lib/auth/session'
import { getValidSession } from '@/lib/jira/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const sessionCookie = readSessionCookie(request)
  const session = await getValidSession(sessionCookie?.sid)

  const connected = Boolean(session)
  const response = NextResponse.json({
    connected,
    cloudId: session?.cloudId,
  })

  if (!sessionCookie?.sid) {
    const ensured = ensureSessionCookie(request)
    setSessionCookie(response, { sid: ensured.sid })
  }

  return response
}


