import type { NextRequest } from 'next/server'
import { handleAuthCallback } from '@/lib/auth/oauth'

export const dynamic = 'force-dynamic'

export function GET(request: NextRequest) {
  return handleAuthCallback(request)
}


