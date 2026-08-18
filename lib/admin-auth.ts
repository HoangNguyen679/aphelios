import crypto from 'crypto'
import type { NextApiRequest, NextApiResponse } from 'next'

const SESSION_COOKIE = 'aphelios-admin-session'
const STATE_COOKIE = 'aphelios-oauth-state'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7
const STATE_MAX_AGE = 60 * 10

type Session = {
  login: string
  expiresAt: number
}

export function adminConfigErrors() {
  const required = [
    'APHELIOS_ADMIN_GITHUB_LOGIN',
    'APHELIOS_GITHUB_CLIENT_ID',
    'APHELIOS_GITHUB_CLIENT_SECRET',
    'APHELIOS_GITHUB_TOKEN',
    'APHELIOS_SESSION_SECRET'
  ]
  const missing = required.filter(name => !process.env[name])
  if (process.env.APHELIOS_SESSION_SECRET && process.env.APHELIOS_SESSION_SECRET.length < 32) {
    missing.push('APHELIOS_SESSION_SECRET (must be at least 32 characters)')
  }
  return missing
}

function secret() {
  const value = process.env.APHELIOS_SESSION_SECRET
  if (!value || value.length < 32) throw new Error('The admin session secret is not configured correctly.')
  return value
}

function sign(value: string) {
  return crypto.createHmac('sha256', secret()).update(value).digest('base64url')
}

function safelyEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer)
}

function serializeCookie(name: string, value: string, maxAge: number) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`
}

function appendCookie(res: NextApiResponse, cookie: string) {
  const current = res.getHeader('Set-Cookie')
  const cookies = Array.isArray(current) ? current : current ? [String(current)] : []
  res.setHeader('Set-Cookie', [...cookies, cookie])
}

export function createSession(login: string) {
  const payload = Buffer.from(JSON.stringify({
    login,
    expiresAt: Date.now() + SESSION_MAX_AGE * 1000
  } satisfies Session)).toString('base64url')
  return `${payload}.${sign(payload)}`
}

export function readSession(req: NextApiRequest): Session | null {
  const token = req.cookies[SESSION_COOKIE]
  if (!token) return null

  const [payload, signature, extra] = token.split('.')
  if (!payload || !signature || extra || !safelyEqual(signature, sign(payload))) return null

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString()) as Session
    if (!session.login || session.expiresAt <= Date.now()) return null
    return session
  } catch {
    return null
  }
}

export function requireAdmin(req: NextApiRequest, res: NextApiResponse) {
  const session = readSession(req)
  const allowedLogin = process.env.APHELIOS_ADMIN_GITHUB_LOGIN
  if (!session || !allowedLogin || session.login.toLowerCase() !== allowedLogin.toLowerCase()) {
    res.status(401).json({ error: 'Please sign in as the configured GitHub user.' })
    return null
  }
  return session
}

export function setSessionCookie(res: NextApiResponse, login: string) {
  appendCookie(res, serializeCookie(SESSION_COOKIE, createSession(login), SESSION_MAX_AGE))
}

export function clearSessionCookie(res: NextApiResponse) {
  appendCookie(res, serializeCookie(SESSION_COOKIE, '', 0))
}

export function createOAuthState(res: NextApiResponse) {
  const state = crypto.randomBytes(24).toString('base64url')
  appendCookie(res, serializeCookie(STATE_COOKIE, state, STATE_MAX_AGE))
  return state
}

export function consumeOAuthState(req: NextApiRequest, res: NextApiResponse, state: string) {
  const expected = req.cookies[STATE_COOKIE]
  appendCookie(res, serializeCookie(STATE_COOKIE, '', 0))
  return Boolean(expected && state && safelyEqual(expected, state))
}
