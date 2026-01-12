import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import type { NextRequest, NextResponse } from 'next/server'

export type StoredAuthSession = {
  accessToken: string
  refreshToken?: string
  cloudId: string
  expiresAt?: number
}

export type SessionCookieData = {
  sid: string
  state?: string
  codeVerifier?: string
}

const SESSION_COOKIE_NAME = 'sprint-session'
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-session-secret'
const APP_ORIGIN = process.env.APP_ORIGIN || 'http://localhost:3000'
const AUTH_STORE_FILE = path.join(process.cwd(), '.auth-store.json')

let authStore: Map<string, StoredAuthSession> | null = null

const base64Url = (buffer: Buffer) =>
  buffer
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

const loadAuthStore = (): Map<string, StoredAuthSession> => {
  if (authStore) return authStore

  try {
    if (fs.existsSync(AUTH_STORE_FILE)) {
      const data = JSON.parse(fs.readFileSync(AUTH_STORE_FILE, 'utf-8'))
      authStore = new Map(Object.entries(data))
      return authStore
    }
  } catch (error) {
    console.warn('Failed to load auth store:', (error as Error).message)
  }

  authStore = new Map()
  return authStore
}

const saveAuthStore = () => {
  if (!authStore) return
  try {
    const data = Object.fromEntries(authStore.entries())
    fs.writeFileSync(AUTH_STORE_FILE, JSON.stringify(data, null, 2))
  } catch (error) {
    console.warn('Failed to save auth store:', (error as Error).message)
  }
}

export const getStoredSession = (sid: string): StoredAuthSession | null => {
  const store = loadAuthStore()
  return store.get(sid) || null
}

export const setStoredSession = (sid: string, session: StoredAuthSession) => {
  const store = loadAuthStore()
  store.set(sid, session)
  saveAuthStore()
}

export const deleteStoredSession = (sid: string) => {
  const store = loadAuthStore()
  store.delete(sid)
  saveAuthStore()
}

const signPayload = (payload: string) =>
  crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url')

const encodeSessionCookie = (value: SessionCookieData) => {
  const payload = Buffer.from(JSON.stringify(value)).toString('base64url')
  const signature = signPayload(payload)
  return `${payload}.${signature}`
}

const decodeSessionCookie = (cookieValue: string | undefined): SessionCookieData | null => {
  if (!cookieValue) return null
  const [payload, signature] = cookieValue.split('.')
  if (!payload || !signature) return null
  const expectedSignature = signPayload(payload)
  if (signature !== expectedSignature) return null

  try {
    const json = Buffer.from(payload, 'base64url').toString('utf-8')
    const parsed = JSON.parse(json) as SessionCookieData
    if (parsed.sid) return parsed
  } catch {
    return null
  }
  return null
}

const buildCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: APP_ORIGIN.startsWith('https://'),
  path: '/',
  maxAge: 7 * 24 * 60 * 60, // 7 days
})

export const readSessionCookie = (request: NextRequest): SessionCookieData | null => {
  const raw = request.cookies.get(SESSION_COOKIE_NAME)?.value
  return decodeSessionCookie(raw)
}

export const setSessionCookie = (
  response: NextResponse,
  value: SessionCookieData,
): NextResponse => {
  response.cookies.set(SESSION_COOKIE_NAME, encodeSessionCookie(value), buildCookieOptions())
  return response
}

export const clearSessionCookie = (response: NextResponse) => {
  response.cookies.set(SESSION_COOKIE_NAME, '', { ...buildCookieOptions(), maxAge: 0 })
}

export const generateSessionId = () => base64Url(crypto.randomBytes(18))

export const ensureSessionCookie = (request: NextRequest): SessionCookieData => {
  const existing = readSessionCookie(request)
  if (existing?.sid) return existing
  return { sid: generateSessionId() }
}


