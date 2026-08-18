import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAdmin } from '../../../lib/admin-auth'
import { GitHubApiError, listPosts, readPost, savePost } from '../../../lib/github-posts'

function handleError(res: NextApiResponse, error: unknown) {
  if (error instanceof GitHubApiError) return res.status(error.status).json({ error: error.message })
  console.error(error)
  return res.status(500).json({ error: 'Could not communicate with GitHub.' })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (!requireAdmin(req, res)) return

  try {
    if (req.method === 'GET') {
      const slug = typeof req.query.slug === 'string' ? req.query.slug : ''
      return res.status(200).json(slug ? { post: await readPost(slug) } : { posts: await listPosts() })
    }

    if (req.method === 'PUT') {
      const { slug, title, date, body, sha } = req.body || {}
      if (![slug, title, date, body].every(value => typeof value === 'string') || (sha && typeof sha !== 'string')) {
        return res.status(400).json({ error: 'The post data is invalid.' })
      }
      return res.status(200).json(await savePost({ slug, title, date, body, sha }))
    }

    return res.status(405).json({ error: 'Method not allowed.' })
  } catch (error) {
    return handleError(res, error)
  }
}
