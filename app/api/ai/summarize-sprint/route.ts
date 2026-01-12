import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { generateAISummary } from '@/lib/ai/providers'
import { requireJiraSession } from '@/lib/jira/session'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const auth = await requireJiraSession(request)
  if ('response' in auth) return auth.response

  try {
    const { enrichedData, preferredProvider } = await request.json()
    if (!enrichedData?.sprint) {
      return NextResponse.json({ error: 'Missing enriched sprint data' }, { status: 400 })
    }

    const result = await generateAISummary(enrichedData, preferredProvider)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}


