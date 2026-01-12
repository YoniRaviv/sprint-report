import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jiraFetch } from '@/lib/jira/client'
import { requireJiraSession } from '@/lib/jira/session'
import { extractTextFromADF } from '@/lib/ai/providers'

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
    const [sprint, issuesData] = await Promise.all([
      jiraFetch(auth.session, `/rest/agile/1.0/sprint/${sprintId}`),
      jiraFetch(auth.session, `/rest/agile/1.0/sprint/${sprintId}/issue?jql=${jql}&maxResults=200`),
    ])

    const issues = issuesData.issues ?? []

    const enrichedIssues = await Promise.all(
      issues.slice(0, 20).map(async (issue: any) => {
        try {
          const [changelog, comments] = await Promise.all([
            jiraFetch(auth.session, `/rest/api/3/issue/${issue.key}/changelog?maxResults=50`).catch(() => ({
              values: [],
            })),
            jiraFetch(
              auth.session,
              `/rest/api/3/issue/${issue.key}/comment?maxResults=20&orderBy=-created`,
            ).catch(() => ({ comments: [] })),
          ])

          const statusChanges =
            (changelog.values ?? []).flatMap((entry: any) =>
              (entry.items ?? [])
                .filter((item: any) => item.field === 'status')
                .map((item: any) => ({
                  from: item.fromString,
                  to: item.toString,
                  date: entry.created,
                  author: entry.author?.displayName,
                })),
            ) ?? []

          const commentSummaries =
            (comments.comments ?? []).map((c: any) => ({
              author: c.author?.displayName,
              date: c.created,
              text: extractTextFromADF(c.body),
            })) ?? []

          return {
            key: issue.key,
            summary: issue.fields.summary,
            type: issue.fields.issuetype?.name ?? 'Task',
            status: issue.fields.status?.name ?? 'Unknown',
            originalEstimate: issue.fields.timeoriginalestimate,
            timeSpent: issue.fields.timespent,
            statusChanges,
            comments: commentSummaries,
          }
        } catch {
          return {
            key: issue.key,
            summary: issue.fields.summary,
            type: issue.fields.issuetype?.name ?? 'Task',
            status: issue.fields.status?.name ?? 'Unknown',
            statusChanges: [],
            comments: [],
          }
        }
      }),
    )

    return NextResponse.json({
      sprint,
      issues: enrichedIssues,
      totalIssues: issues.length,
    })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: (error as { status?: number }).status || 500 })
  }
}

