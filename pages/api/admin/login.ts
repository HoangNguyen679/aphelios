import type { NextApiRequest, NextApiResponse } from 'next'
import { adminConfigErrors, createOAuthState } from '../../../lib/admin-auth'

function requestOrigin(req: NextApiRequest) {
  const protocol = req.headers['x-forwarded-proto'] || (process.env.NODE_ENV === 'production' ? 'https' : 'http')
  return `${protocol}://${req.headers.host}`
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' })
  const missing = adminConfigErrors()
  if (missing.length) return res.status(503).send(`Admin is not configured: ${missing.join(', ')}`)

  const state = createOAuthState(res)
  const query = new URLSearchParams({
    client_id: process.env.APHELIOS_GITHUB_CLIENT_ID!,
    redirect_uri: `${requestOrigin(req)}/api/admin/callback`,
    state
  })
  res.redirect(`https://github.com/login/oauth/authorize?${query}`)
}
