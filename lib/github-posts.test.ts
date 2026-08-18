import { afterEach, describe, expect, it, vi } from 'vitest'
import { listPosts, validSlug } from './github-posts'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('validSlug', () => {
  it('accepts safe post slugs', () => {
    expect(validSlug('my-post_2')).toBe(true)
    expect(validSlug('rails')).toBe(true)
  })

  it('rejects paths and unsupported characters', () => {
    expect(validSlug('../secret')).toBe(false)
    expect(validSlug('My Post')).toBe(false)
    expect(validSlug('-post')).toBe(false)
  })
})

describe('listPosts', () => {
  it('returns post metadata with the newest post first', async () => {
    vi.stubEnv('APHELIOS_GITHUB_TOKEN', 'test-token')
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      if (url.includes('/contents/posts?')) {
        return Response.json([
          { name: 'older.md', type: 'file', sha: 'older' },
          { name: 'newer.md', type: 'file', sha: 'newer' }
        ])
      }

      const newer = url.includes('/newer.md')
      const markdown = `---\ntitle: ${newer ? 'Newer post' : 'Older post'}\ndate: ${newer ? '2026-02-02' : '2025-01-01'}\n---\nBody`
      return Response.json({
        name: newer ? 'newer.md' : 'older.md',
        type: 'file',
        sha: newer ? 'newer' : 'older',
        encoding: 'base64',
        content: Buffer.from(markdown).toString('base64')
      })
    }))

    await expect(listPosts()).resolves.toEqual([
      { slug: 'newer', title: 'Newer post', date: '2026-02-02' },
      { slug: 'older', title: 'Older post', date: '2025-01-01' }
    ])
  })
})
