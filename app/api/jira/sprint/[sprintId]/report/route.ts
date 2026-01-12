import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jiraFetch } from '@/lib/jira/client'
import { requireJiraSession } from '@/lib/jira/session'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sprintId: string }> },
) {
  const auth = await requireJiraSession(request)
  if ('response' in auth) return auth.response

  const { sprintId } = await params
  if (!sprintId) {
    return NextResponse.json({ error: 'Sprint id is required' }, { status: 400 })
  }

  try {
    const jql = encodeURIComponent('assignee = currentUser()')
    const [sprint, issues] = await Promise.all([
      jiraFetch(auth.session, `/rest/agile/1.0/sprint/${sprintId}`),
      jiraFetch(auth.session, `/rest/agile/1.0/sprint/${sprintId}/issue?jql=${jql}&maxResults=200`),
    ])

    return NextResponse.json({ sprint, issues: issues.issues ?? [] })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: (error as { status?: number }).status || 500 })
  }
}

