import type { NextApiRequest, NextApiResponse } from 'next'
import { adminConfigErrors, readSession } from '../../../lib/admin-auth'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' })
  res.setHeader('Cache-Control', 'no-store')

  const missing = adminConfigErrors()
  if (missing.length) {
    return res.status(503).json({
      authenticated: false,
      configured: false,
      error: `Missing Vercel environment variables: ${missing.join(', ')}`
    })
  }

  const session = readSession(req)
  const allowedLogin = process.env.APHELIOS_ADMIN_GITHUB_LOGIN!
  const authenticated = Boolean(session && session.login.toLowerCase() === allowedLogin.toLowerCase())
  return res.status(200).json({ authenticated, configured: true, login: authenticated ? session!.login : null })
}
