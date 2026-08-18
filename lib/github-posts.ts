import matter from 'gray-matter'

const owner = process.env.APHELIOS_GITHUB_OWNER || 'HoangNguyen679'
const repository = process.env.APHELIOS_GITHUB_REPO || 'aphelios'
const branch = process.env.APHELIOS_GITHUB_BRANCH || 'main'
const apiRoot = `https://api.github.com/repos/${owner}/${repository}`

type GitHubFile = {
  name: string
  type: string
  sha: string
  content?: string
  encoding?: string
}

export class GitHubApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

async function github<T>(path: string, init?: RequestInit): Promise<T> {
  const token = process.env.APHELIOS_GITHUB_TOKEN
  if (!token) throw new GitHubApiError(500, 'APHELIOS_GITHUB_TOKEN is not configured.')

  const response = await fetch(`${apiRoot}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...init?.headers
    }
  })

  if (!response.ok) {
    const result = await response.json().catch(() => ({})) as { message?: string }
    throw new GitHubApiError(response.status, result.message || 'GitHub request failed.')
  }
  return response.json() as Promise<T>
}

export function validSlug(slug: string) {
  return /^[a-z0-9]+(?:[a-z0-9_-]*[a-z0-9])?$/.test(slug)
}

export async function listPosts() {
  const files = await github<GitHubFile[]>(`/contents/posts?ref=${encodeURIComponent(branch)}`)
  return files
    .filter(file => file.type === 'file' && file.name.endsWith('.md'))
    .map(file => file.name.replace(/\.md$/, ''))
    .sort()
}

export async function readPost(slug: string) {
  if (!validSlug(slug)) throw new GitHubApiError(400, 'Use letters, numbers, hyphens, or underscores for the slug.')

  const file = await github<GitHubFile>(`/contents/posts/${encodeURIComponent(slug)}.md?ref=${encodeURIComponent(branch)}`)
  if (!file.content || file.encoding !== 'base64') throw new GitHubApiError(500, 'GitHub did not return the post content.')

  const parsed = matter(Buffer.from(file.content.replace(/\n/g, ''), 'base64').toString('utf8'))
  return {
    slug,
    title: String(parsed.data.title || ''),
    date: String(parsed.data.date || ''),
    body: parsed.content,
    sha: file.sha
  }
}

async function currentFile(slug: string) {
  try {
    return await github<GitHubFile>(`/contents/posts/${encodeURIComponent(slug)}.md?ref=${encodeURIComponent(branch)}`)
  } catch (error) {
    if (error instanceof GitHubApiError && error.status === 404) return null
    throw error
  }
}

export async function savePost(input: {
  slug: string
  title: string
  date: string
  body: string
  sha?: string
}) {
  const { slug, title, date, body, sha } = input
  if (!validSlug(slug)) throw new GitHubApiError(400, 'Use letters, numbers, hyphens, or underscores for the slug.')
  if (!title.trim()) throw new GitHubApiError(400, 'A title is required.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new GitHubApiError(400, 'Use YYYY-MM-DD for the date.')

  const existing = await currentFile(slug)
  if (existing && !sha) throw new GitHubApiError(409, 'A post already uses this slug. Open it before editing.')
  if (existing && existing.sha !== sha) throw new GitHubApiError(409, 'This post changed on GitHub. Reload it before publishing.')
  if (!existing && sha) throw new GitHubApiError(409, 'This post was removed on GitHub. Reload the editor.')

  const markdown = matter.stringify(body.replace(/^\n+/, ''), { title: title.trim(), date })
  const result = await github<{ content: { sha: string }; commit: { html_url: string } }>(
    `/contents/posts/${encodeURIComponent(slug)}.md`,
    {
      method: 'PUT',
      body: JSON.stringify({
        message: `${existing ? 'Update' : 'Publish'} blog post: ${title.trim()}`,
        content: Buffer.from(markdown).toString('base64'),
        branch,
        ...(existing ? { sha: existing.sha } : {})
      })
    }
  )

  return { sha: result.content.sha, commitUrl: result.commit.html_url }
}
