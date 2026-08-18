import type { NextApiRequest, NextApiResponse } from 'next'
import { consumeOAuthState, setSessionCookie } from '../../../lib/admin-auth'

function fail(res: NextApiResponse, reason: string) {
  res.redirect(`/admin?error=${encodeURIComponent(reason)}`)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' })

  const code = typeof req.query.code === 'string' ? req.query.code : ''
  const state = typeof req.query.state === 'string' ? req.query.state : ''
  if (!code || !consumeOAuthState(req, res, state)) return fail(res, 'GitHub sign-in could not be verified.')

  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.APHELIOS_GITHUB_CLIENT_ID,
        client_secret: process.env.APHELIOS_GITHUB_CLIENT_SECRET,
        code
      })
    })
    const tokenResult = await tokenResponse.json() as { access_token?: string; error_description?: string }
    if (!tokenResult.access_token) return fail(res, tokenResult.error_description || 'GitHub sign-in failed.')

    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${tokenResult.access_token}`,
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })
    const user = await userResponse.json() as { login?: string }
    const allowed = process.env.APHELIOS_ADMIN_GITHUB_LOGIN
    if (!user.login || !allowed || user.login.toLowerCase() !== allowed.toLowerCase()) {
      return fail(res, 'This GitHub account is not allowed to edit the blog.')
    }

    setSessionCookie(res, user.login)
    res.redirect('/admin')
  } catch {
    fail(res, 'GitHub sign-in is temporarily unavailable.')
  }
}
