import type { NextApiRequest, NextApiResponse } from 'next'
import { clearSessionCookie } from '../../../lib/admin-auth'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' })
  clearSessionCookie(res)
  res.status(200).json({ ok: true })
}
