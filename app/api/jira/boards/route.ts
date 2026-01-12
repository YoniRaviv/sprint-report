import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jiraFetch } from '@/lib/jira/client'
import { requireJiraSession } from '@/lib/jira/session'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = await requireJiraSession(request)
  if ('response' in auth) return auth.response

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') ?? 'scrum'
  const params = new URLSearchParams({ type, maxResults: '50' })

  try {
    const data = await jiraFetch(auth.session, `/rest/agile/1.0/board?${params.toString()}`)
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: (error as { status?: number }).status || 500 })
  }
}


