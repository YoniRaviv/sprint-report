import crypto from 'crypto'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  clearSessionCookie,
  ensureSessionCookie,
  readSessionCookie,
  setSessionCookie,
  type SessionCookieData,
} from './session'
import { setStoredSession, deleteStoredSession } from './session'

const ATLASSIAN_CLIENT_ID = process.env.ATLASSIAN_CLIENT_ID
const ATLASSIAN_CLIENT_SECRET = process.env.ATLASSIAN_CLIENT_SECRET
const ATLASSIAN_REDIRECT_URI =
  process.env.ATLASSIAN_REDIRECT_URI || 'http://localhost:3000/api/auth/atlassian/callback'
const APP_ORIGIN = process.env.APP_ORIGIN || 'http://localhost:3000'

const requiredEnv = [ATLASSIAN_CLIENT_ID, ATLASSIAN_CLIENT_SECRET, ATLASSIAN_REDIRECT_URI]
if (requiredEnv.some((v) => !v)) {
  console.error('Missing Atlassian OAuth env vars. Please set CLIENT_ID/SECRET/REDIRECT_URI.')
}

const tokenEndpoint = 'https://auth.atlassian.com/oauth/token'
const authorizeEndpoint = 'https://auth.atlassian.com/authorize'

const base64Url = (buffer: Buffer) =>
  buffer
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

const sha256 = (input: string) => crypto.createHash('sha256').update(input).digest()

export const generateCodeVerifier = () => base64Url(crypto.randomBytes(32))
export const generateState = () => base64Url(crypto.randomBytes(24))
export const generateCodeChallenge = (verifier: string) => base64Url(sha256(verifier))

const fetchJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(url, init)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    const error = new Error(`Request failed ${res.status}: ${text || res.statusText}`)
    ;(error as { status?: number }).status = res.status
    throw error
  }
  return res.json() as Promise<T>
}

export const buildAuthorizeUrl = (state: string, codeChallenge: string) => {
  const params = new URLSearchParams({
    audience: 'api.atlassian.com',
    client_id: ATLASSIAN_CLIENT_ID || '',
    scope: [
      'read:jira-work',
      'read:jira-user',
      'read:board-scope:jira-software',
      'read:sprint:jira-software',
      'read:issue:jira-software',
      'read:issue-details:jira',
      'read:project:jira',
      'read:issue:jira',
      'read:jql:jira',
      'offline_access',
    ].join(' '),
    redirect_uri: ATLASSIAN_REDIRECT_URI,
    state,
    response_type: 'code',
    prompt: 'consent',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })
  return `${authorizeEndpoint}?${params.toString()}`
}

export const exchangeToken = (code: string, codeVerifier: string) =>
  fetchJson<{
    access_token: string
    refresh_token?: string
    expires_in: number
    scope?: string
  }>(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: ATLASSIAN_CLIENT_ID,
      client_secret: ATLASSIAN_CLIENT_SECRET,
      code,
      redirect_uri: ATLASSIAN_REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  })

export const refreshToken = (refreshTokenValue: string) =>
  fetchJson<{
    access_token: string
    refresh_token?: string
    expires_in: number
  }>(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: ATLASSIAN_CLIENT_ID,
      client_secret: ATLASSIAN_CLIENT_SECRET,
      refresh_token: refreshTokenValue,
    }),
  })

export const getAccessibleResources = (accessToken: string) =>
  fetchJson<{ id: string; name: string; scopes?: string[] }[]>(
    'https://api.atlassian.com/oauth/token/accessible-resources',
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  )

export const startAtlassianAuth = (request: NextRequest) => {
  const session = ensureSessionCookie(request)
  const state = generateState()
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = generateCodeChallenge(codeVerifier)

  const response = NextResponse.redirect(buildAuthorizeUrl(state, codeChallenge))
  const sessionData: SessionCookieData = {
    ...session,
    state,
    codeVerifier,
  }
  setSessionCookie(response, sessionData)
  return response
}

export const handleAuthCallback = async (request: NextRequest) => {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  const sessionCookie = readSessionCookie(request)
  const sid = sessionCookie?.sid
  if (!sid) {
    return NextResponse.json({ error: 'Session expired. Please start again.' }, { status: 400 })
  }

  if (!sessionCookie?.state || !sessionCookie?.codeVerifier) {
    return NextResponse.json({ error: 'Session expired. Please start again.' }, { status: 400 })
  }

  if (state !== sessionCookie.state) {
    return NextResponse.json({ error: 'Invalid state. Please try again.' }, { status: 400 })
  }

  if (!code) {
    return NextResponse.json({ error: 'Missing authorization code.' }, { status: 400 })
  }

  try {
    const tokenResponse = await exchangeToken(code, sessionCookie.codeVerifier)
    const resources = await getAccessibleResources(tokenResponse.access_token)
    const jiraSite =
      resources.find((r) => r.scopes?.includes('read:jira-work')) || resources?.[0] || null
    if (!jiraSite) {
      return NextResponse.json({ error: 'No accessible Jira site found for this account.' }, { status: 400 })
    }

    const expiresAt = Date.now() + (tokenResponse.expires_in - 30) * 1000
    setStoredSession(sid, {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      cloudId: jiraSite.id,
      expiresAt,
    })

    const response = NextResponse.redirect(new URL(APP_ORIGIN))
    setSessionCookie(response, { sid })
    return response
  } catch (error) {
    console.error('OAuth callback error', (error as Error).message)
    return NextResponse.json(
      { error: 'Failed to complete Atlassian authentication.' },
      { status: 500 },
    )
  }
}

export const resetSession = (request: NextRequest) => {
  const session = readSessionCookie(request)
  if (session?.sid) {
    deleteStoredSession(session.sid)
  }

  const response = NextResponse.json({ cleared: true })
  clearSessionCookie(response)
  return response
}

