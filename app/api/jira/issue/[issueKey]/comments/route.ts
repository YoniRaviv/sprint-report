import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jiraFetch } from '@/lib/jira/client'
import { requireJiraSession } from '@/lib/jira/session'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ issueKey: string }> },
) {
  const auth = await requireJiraSession(request)
  if ('response' in auth) return auth.response

  try {
    const { issueKey } = await params
    if (!issueKey) {
      return NextResponse.json({ error: 'Issue key is required' }, { status: 400 })
    }
    const data = await jiraFetch(
      auth.session,
      `/rest/api/3/issue/${issueKey}/comment?maxResults=50&orderBy=-created`,
    )
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: (error as { status?: number }).status || 500 })
  }
}

