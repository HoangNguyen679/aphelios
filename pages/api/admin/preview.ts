import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAdmin } from '../../../lib/admin-auth'
import { markdownToHtml } from '../../../lib/markdown'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (!requireAdmin(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' })
  if (typeof req.body?.body !== 'string') return res.status(400).json({ error: 'Markdown is required.' })

  const html = await markdownToHtml(req.body.body)
  res.status(200).json({ html })
}
