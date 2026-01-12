import { NextResponse } from 'next/server'
import { getAIStatus } from '@/lib/ai/providers'

export const dynamic = 'force-dynamic'

export async function GET() {
  const status = await getAIStatus()
  return NextResponse.json(status)
}


