import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jiraFetch } from '@/lib/jira/client'
import { requireJiraSession } from '@/lib/jira/session'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> },
) {
  const auth = await requireJiraSession(request)
  if ('response' in auth) return auth.response

  const { boardId } = await params
  if (!boardId) {
    return NextResponse.json({ error: 'Board id is required' }, { status: 400 })
  }
  const monthsBack = parseInt(new URL(request.url).searchParams.get('months') || '12', 10)

  try {
    const allSprints: any[] = []
    let startAt = 0
    const maxResults = 50
    let isLast = false

    while (!isLast) {
      const params = new URLSearchParams({
        state: 'active,closed',
        maxResults: String(maxResults),
        startAt: String(startAt),
      })

      const data = await jiraFetch(
        auth.session,
        `/rest/agile/1.0/board/${boardId}/sprint?${params.toString()}`,
      )

      allSprints.push(...(data.values || []))
      isLast = data.isLast ?? true
      startAt += maxResults

      if (startAt >= 500) break
    }

    const cutoffDate = new Date()
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsBack)

    const filteredSprints = allSprints
      .filter((sprint) => {
        const dateStr = sprint.startDate ?? sprint.endDate
        if (!dateStr) return sprint.state === 'active'
        const sprintDate = new Date(dateStr)
        return !Number.isNaN(sprintDate.getTime()) && sprintDate >= cutoffDate
      })
      .sort((a, b) => {
        const dateA = a.startDate ?? a.endDate ?? ''
        const dateB = b.startDate ?? b.endDate ?? ''
        return String(dateB).localeCompare(String(dateA))
      })

    return NextResponse.json({ values: filteredSprints, total: filteredSprints.length })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: (error as { status?: number }).status || 500 })
  }
}

