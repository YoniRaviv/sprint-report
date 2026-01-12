import type { NextRequest } from 'next/server'
import { resetSession } from '@/lib/auth/oauth'

export const dynamic = 'force-dynamic'

export function POST(request: NextRequest) {
  return resetSession(request)
}


