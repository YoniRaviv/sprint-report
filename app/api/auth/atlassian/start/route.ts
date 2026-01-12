import type { NextRequest } from 'next/server'
import { startAtlassianAuth } from '@/lib/auth/oauth'

export const dynamic = 'force-dynamic'

export function GET(request: NextRequest) {
  return startAtlassianAuth(request)
}


